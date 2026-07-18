import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScore, isLateCancel, applyLateCancel, applyNoShow, applyAttend, cancelPreview,
} from '../src/logic/score.js';
import { haversineKm, matchLocations, formatKm } from '../src/logic/geo.js';
import { nextOccurrence, recurringLabel } from '../src/logic/recurrence.js';
import { feedbackWindowState, reminderDue, validTags } from '../src/logic/feedback.js';
import { computeVerification, isDemoted } from '../src/logic/verification.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { runTick, ensureNextInstance } from '../src/logic/tick.js';
import { confirmNoShow } from '../src/logic/noshow.js';

const H = 3600000, D = 24 * H;

// ── Zuverlässigkeits-Score ────────────────────────────────────────────────
test('Score: Absage < 24 h kostet 3 Punkte', () => {
  assert.equal(applyLateCancel(96), 93);
});

test('Score: No-Show kostet 10 Punkte, Treffen bringt +1, max 100', () => {
  assert.equal(applyNoShow(96), 86);
  assert.equal(applyAttend(96), 97);
  assert.equal(applyAttend(100), 100);
  assert.equal(clampScore(-5), 0);
});

test('24-h-Regel: knapp vor/nach der Grenze', () => {
  const now = Date.parse('2026-07-18T12:00:00Z');
  assert.equal(isLateCancel(new Date(now + 23 * H).toISOString(), now), true);
  assert.equal(isLateCancel(new Date(now + 25 * H).toISOString(), now), false);
});

test('Absage-Vorschau fürs Modal: 96 → 93 nur bei kurzfristiger Absage', () => {
  const now = Date.parse('2026-07-18T12:00:00Z');
  const late = cancelPreview(96, new Date(now + 2 * H).toISOString(), now);
  assert.deepEqual({ current: late.current, after: late.after, late: late.late },
    { current: 96, after: 93, late: true });
  const early = cancelPreview(96, new Date(now + 3 * D).toISOString(), now);
  assert.equal(early.after, 96);
  assert.equal(early.late, false);
});

// ── Geo / Umkreissuche ────────────────────────────────────────────────────
test('Haversine: München → Waldkraiburg ca. 62–70 km', () => {
  const km = haversineKm(48.1374, 11.5755, 48.208, 12.398);
  assert.ok(km > 55 && km < 75, `war ${km}`);
});

test('Umkreis: Event in Waldkraiburg nur über zweiten Standort sichtbar', () => {
  const locations = [
    { name: 'München', lat: 48.1374, lng: 11.5755, radiusKm: 25 },
    { name: 'Waldkraiburg', lat: 48.208, lng: 12.398, radiusKm: 10 },
  ];
  assert.ok(matchLocations(locations, 48.211, 12.397)); // Jugendhaus Waldkraiburg
  assert.ok(matchLocations(locations, 48.152, 11.5928)); // Englischer Garten
  assert.equal(matchLocations([locations[0]], 48.211, 12.397), null); // nur München: zu weit
});

test('Distanz-Label: deutsche Formatierung', () => {
  assert.equal(formatKm(2.07), '2,1 km');
});

// ── Recurrence ────────────────────────────────────────────────────────────
test('Recurrence: weekly +7 Tage, biweekly +14 Tage', () => {
  const start = '2026-07-18T07:00:00.000Z';
  assert.equal(nextOccurrence(start, 'weekly'), '2026-07-25T07:00:00.000Z');
  assert.equal(nextOccurrence(start, 'biweekly'), '2026-08-01T07:00:00.000Z');
  assert.equal(nextOccurrence(start, null), null);
});

test('Recurrence-Label: "Jeden Samstag" / "Alle 2 Wochen"', () => {
  const saturday = new Date(2026, 6, 18, 9, 0).toISOString(); // 18.07.2026 = Samstag
  assert.equal(recurringLabel('weekly', saturday), 'Jeden Samstag');
  assert.equal(recurringLabel('biweekly', saturday), 'Alle 2 Wochen');
  assert.equal(recurringLabel(null, saturday), null);
});

// ── Feedback-Fenster ──────────────────────────────────────────────────────
test('Feedback-Fenster: öffnet nach Ende, schließt nach 7 Tagen', () => {
  const event = { datetime: '2026-07-17T17:00:00.000Z', durationMin: 120 };
  const end = Date.parse('2026-07-17T19:00:00.000Z');
  assert.equal(feedbackWindowState(event, end - H), 'not_open');
  assert.equal(feedbackWindowState(event, end + H), 'open');
  assert.equal(feedbackWindowState(event, end + 7 * D - H), 'open');
  assert.equal(feedbackWindowState(event, end + 7 * D + H), 'closed');
});

test('Feedback-Reminder: fällig 2 h nach Ende', () => {
  const event = { datetime: '2026-07-17T17:00:00.000Z', durationMin: 120 };
  const end = Date.parse('2026-07-17T19:00:00.000Z');
  assert.equal(reminderDue(event, end + H), false);
  assert.equal(reminderDue(event, end + 3 * H), true);
});

test('Feedback-Tags: nur bekannte Attribute', () => {
  assert.equal(validTags(['punctual', 'no_show']), true);
  assert.equal(validTags(['great']), false);
});

// ── Verifizierung ─────────────────────────────────────────────────────────
test('Verifizierung: alle 3 Stufen nötig, Badge-Entzug bei 2 No-Shows', () => {
  const base = { verifiedPhone: 1, verifiedId: 1, meetingsAttended: 14, noShowCount: 0, reliabilityScore: 96 };
  assert.equal(computeVerification(base).fullyVerified, true);
  assert.equal(computeVerification({ ...base, verifiedId: 0 }).fullyVerified, false);
  assert.equal(computeVerification({ ...base, meetingsAttended: 2 }).fullyVerified, false);
  assert.equal(computeVerification({ ...base, noShowCount: 1 }).fullyVerified, true);
  assert.equal(computeVerification({ ...base, noShowCount: 2 }).fullyVerified, false);
  assert.equal(computeVerification({ ...base, noShowCount: 2 }).revoked, true);
});

test('Feed-Sortierung: unverifiziert oder Score < 80 wird nachrangig', () => {
  const good = { verifiedPhone: 1, verifiedId: 1, meetingsAttended: 14, noShowCount: 0, reliabilityScore: 96 };
  assert.equal(isDemoted(good), false);
  assert.equal(isDemoted({ ...good, verifiedId: 0 }), true);
  assert.equal(isDemoted({ ...good, reliabilityScore: 79 }), true);
});

// ── Tick: Attend-Bonus + nächste Instanz (Integration, In-Memory-DB) ─────
test('Tick: beendetes Event → attended (+1), Recurrence erzeugt Folge-Instanz', () => {
  const db = openDb(':memory:');
  seed(db);
  const now = Date.now();

  // Beendetes Event simulieren: Lauftreff auf gestern legen
  const yesterday = new Date(now - D).toISOString();
  db.prepare("UPDATE events SET datetime = ?, status = 'open' WHERE id = 'evt_lauf'").run(yesterday);
  const before = db.prepare("SELECT reliabilityScore, meetingsAttended FROM users WHERE id = 'u_lea'").get();

  runTick(db, now, () => {});

  const event = db.prepare("SELECT status FROM events WHERE id = 'evt_lauf'").get();
  assert.equal(event.status, 'past');
  const part = db.prepare("SELECT status FROM participations WHERE eventId = 'evt_lauf' AND userId = 'u_lea'").get();
  assert.equal(part.status, 'attended');
  const after = db.prepare("SELECT reliabilityScore, meetingsAttended FROM users WHERE id = 'u_lea'").get();
  assert.equal(after.meetingsAttended, before.meetingsAttended + 1);
  assert.equal(after.reliabilityScore, Math.min(100, before.reliabilityScore + 1));

  // Serie hat wieder eine zukünftige Instanz — Teilnahme gilt pro Instanz (leer)
  const next = db.prepare("SELECT * FROM events WHERE seriesId = 'ser_lauf' AND datetime > ?")
    .get(new Date(now).toISOString());
  assert.ok(next, 'Folge-Instanz fehlt');
  const nextParts = db.prepare('SELECT COUNT(*) AS c FROM participations WHERE eventId = ?').get(next.id);
  assert.equal(nextParts.c, 0);

  // Idempotent: zweiter Tick erzeugt keine weitere Instanz
  runTick(db, now, () => {});
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM events WHERE seriesId = 'ser_lauf' AND datetime > ?")
    .get(new Date(now).toISOString());
  assert.equal(c, 1);
});

test('No-Show-Bestätigung: einmalig pro Event+Nutzer, revertiert Attend-Bonus', () => {
  const db = openDb(':memory:');
  seed(db);
  // Kurt war beim gestrigen Brettspielabend als 'attended' verbucht (Score 95, 8 Treffen)
  const event = db.prepare("SELECT * FROM events WHERE id = 'evt_bsa_past'").get();
  const before = db.prepare("SELECT * FROM users WHERE id = 'u_kurt'").get();

  const first = confirmNoShow(db, event, 'u_kurt');
  assert.equal(first.applied, true);
  const after = db.prepare("SELECT * FROM users WHERE id = 'u_kurt'").get();
  // −10 (No-Show) − 1 (Attend-Bonus revertiert), Treffen-Zähler −1, Zähler +1
  assert.equal(after.reliabilityScore, before.reliabilityScore - 11);
  assert.equal(after.meetingsAttended, before.meetingsAttended - 1);
  assert.equal(after.noShowCount, before.noShowCount + 1);
  const part = db.prepare("SELECT status FROM participations WHERE eventId = 'evt_bsa_past' AND userId = 'u_kurt'").get();
  assert.equal(part.status, 'no_show');

  // Zweite Meldung (anderer Feedback-Geber): wirkungslos — vorher Feedback-Zeile simulieren
  db.prepare(`INSERT INTO feedback (id, eventId, fromUserId, aboutUserId, stars, tags, comment, createdAt)
    VALUES ('fb_ns', 'evt_bsa_past', 'u_ines', 'u_kurt', 1, '["no_show"]', NULL, ?)`)
    .run(new Date().toISOString());
  const second = confirmNoShow(db, event, 'u_kurt');
  assert.equal(second.applied, false);
  const unchanged = db.prepare("SELECT * FROM users WHERE id = 'u_kurt'").get();
  assert.equal(unchanged.reliabilityScore, after.reliabilityScore);
  assert.equal(unchanged.noShowCount, after.noShowCount);
});

test('Tick: Host erhält bei Event-Ende ebenfalls +1 und Treffen-Zähler', () => {
  const db = openDb(':memory:');
  seed(db);
  const now = Date.now();
  db.prepare("UPDATE events SET datetime = ?, status = 'open' WHERE id = 'evt_lauf'")
    .run(new Date(now - 24 * H).toISOString());
  const before = db.prepare("SELECT reliabilityScore, meetingsAttended FROM users WHERE id = 'u_jonas'").get();
  runTick(db, now, () => {});
  const after = db.prepare("SELECT reliabilityScore, meetingsAttended FROM users WHERE id = 'u_jonas'").get();
  assert.equal(after.meetingsAttended, before.meetingsAttended + 1);
  assert.equal(after.reliabilityScore, Math.min(100, before.reliabilityScore + 1));
});

test('Tick: Feedback-Reminder genau einmal', () => {
  const db = openDb(':memory:');
  seed(db);
  const sent = [];
  const notify = (_db, userId, type, payload) => {
    sent.push({ userId, type, payload });
    _db.prepare('INSERT INTO notifications (id, userId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(`ntf_${sent.length}`, userId, type, JSON.stringify(payload), new Date().toISOString());
  };
  const now = Date.now();
  runTick(db, now, notify);
  const reminders = sent.filter((s) => s.type === 'feedback_reminder' && s.userId === 'u_anna');
  // Anna hat nur für den gestrigen Brettspielabend noch kein Feedback gegeben
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].payload.eventId, 'evt_bsa_past');
  // Zweiter Tick: kein Duplikat
  runTick(db, now, notify);
  assert.equal(sent.filter((s) => s.type === 'feedback_reminder' && s.userId === 'u_anna').length, 1);
});
