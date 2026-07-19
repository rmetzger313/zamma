// Zeitgesteuerte Regeln, laufen beim Start und dann jede Minute:
// 1. Beendete Events: Teilnahme joined → attended (+1 Score, Treffen-Zähler),
//    Event-Status → past.
// 2. Recurrence: nächste Instanz der Serie anlegen (idempotent).
// 3. Feedback-Reminder: Push 2 h nach Event-Ende an alle ohne abgegebenes Feedback.

import { makeId } from '../db.js';
import { applyAttend } from './score.js';
import { eventEndMs, reminderDue, feedbackWindowState } from './feedback.js';
import { nextOccurrence } from './recurrence.js';

export function runTick(db, nowMs, notify = () => {}) {
  const iso = new Date(nowMs).toISOString();

  // 1 + 2: beendete Events abschließen
  const ended = db
    .prepare("SELECT * FROM events WHERE status IN ('open','full')")
    .all()
    .filter((e) => eventEndMs(e) <= nowMs);

  for (const event of ended) {
    // Transaktional: Boni + Status-Wechsel atomar, sonst könnte ein Crash
    // zwischen Host-Bonus und 'past'-Update den Bonus beim Neustart doppeln.
    db.exec('BEGIN');
    try {
      const joined = db
        .prepare("SELECT * FROM participations WHERE eventId = ? AND status = 'joined'")
        .all(event.id);
      for (const p of joined) {
        db.prepare("UPDATE participations SET status = 'attended' WHERE userId = ? AND eventId = ?")
          .run(p.userId, event.id);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(p.userId);
        db.prepare('UPDATE users SET reliabilityScore = ?, meetingsAttended = meetingsAttended + 1 WHERE id = ?')
          .run(applyAttend(user.reliabilityScore), p.userId);
      }
      // Der Host zählt überall als Teilnehmer (joinedCount) — erfolgreiches
      // Treffen gibt ihm denselben +1-Bonus und Treffen-Zähler.
      const host = db.prepare('SELECT * FROM users WHERE id = ?').get(event.hostId);
      db.prepare('UPDATE users SET reliabilityScore = ?, meetingsAttended = meetingsAttended + 1 WHERE id = ?')
        .run(applyAttend(host.reliabilityScore), event.hostId);
      db.prepare("UPDATE events SET status = 'past' WHERE id = ?").run(event.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    if (event.recurrence) ensureNextInstance(db, event, nowMs);
  }

  // Recurrence auch für bereits vergangene Serien absichern (z. B. nach Neustart)
  const pastRecurring = db
    .prepare("SELECT * FROM events WHERE status = 'past' AND recurrence IS NOT NULL")
    .all();
  for (const event of pastRecurring) ensureNextInstance(db, event, nowMs);

  // 3: Feedback-Reminder
  const pastEvents = db.prepare("SELECT * FROM events WHERE status = 'past'").all();
  for (const event of pastEvents) {
    if (!reminderDue(event, nowMs) || feedbackWindowState(event, nowMs) !== 'open') continue;
    const attendees = db
      .prepare("SELECT userId FROM participations WHERE eventId = ? AND status = 'attended'")
      .all(event.id);
    // Host bekommt den Reminder ebenfalls (GET /feedback/pending schließt ihn ein)
    const recipients = new Set([...attendees.map((a) => a.userId), event.hostId]);
    for (const userId of recipients) {
      const given = db
        .prepare('SELECT COUNT(*) AS c FROM feedback WHERE eventId = ? AND fromUserId = ?')
        .get(event.id, userId);
      if (given.c > 0) continue;
      const already = db
        .prepare("SELECT COUNT(*) AS c FROM notifications WHERE userId = ? AND type = 'feedback_reminder' AND payload LIKE ?")
        .get(userId, `%"${event.id}"%`);
      if (already.c > 0) continue;
      notify(db, userId, 'feedback_reminder', { eventId: event.id, title: event.title }, iso);
    }
  }
}

// Idempotent: legt Folge-Instanzen an, bis die Serie eine zukünftige Instanz hat.
export function ensureNextInstance(db, event, nowMs) {
  const hasFuture = db
    .prepare('SELECT COUNT(*) AS c FROM events WHERE seriesId = ? AND datetime > ?')
    .get(event.seriesId, new Date(nowMs).toISOString());
  if (hasFuture.c > 0) return null;

  // Vom jüngsten Termin der Serie aus in die Zukunft iterieren
  const latest = db
    .prepare('SELECT * FROM events WHERE seriesId = ? ORDER BY datetime DESC LIMIT 1')
    .get(event.seriesId);
  let datetime = latest.datetime;
  do {
    datetime = nextOccurrence(datetime, event.recurrence);
  } while (new Date(datetime).getTime() <= nowMs);

  const id = makeId('evt');
  db.prepare(`INSERT INTO events (id, seriesId, hostId, title, category, description, skillLevel,
      datetime, durationMin, recurrence, locationName, city, lat, lng, distLabelOverride, mapX, mapY,
      maxSpots, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`)
    .run(id, latest.seriesId, latest.hostId, latest.title, latest.category, latest.description,
      latest.skillLevel, datetime, latest.durationMin, latest.recurrence, latest.locationName,
      latest.city, latest.lat, latest.lng, latest.distLabelOverride, latest.mapX, latest.mapY,
      latest.maxSpots, new Date(nowMs).toISOString());
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}
