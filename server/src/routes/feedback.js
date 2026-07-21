import { Router } from 'express';
import { makeId } from '../db.js';
import { getUser, getEvent, getMyParticipation } from '../repo.js';
import { feedbackWindowState, validTags } from '../logic/feedback.js';
import { confirmNoShow } from '../logic/noshow.js';
import { LIMITS, optionalWithinLimit } from '../logic/limits.js';
import { dateLabel } from '../format.js';

// "Brettspielabend im Jugendhaus" → "der Brettspielabend" (für den Prompt-Banner)
function promptLabel(title) {
  const short = title.split(/\s+(?:im|in|am|an|auf|durch|für|mit|bei|:)\s+/i)[0].replace(/:$/, '');
  const endings = [
    [/abend$/i, 'der'], [/treff$/i, 'der'], [/walk$/i, 'der'], [/kurs$/i, 'der'],
    [/runde$/i, 'die'], [/tour$/i, 'die'], [/session$/i, 'die'],
  ];
  for (const [re, artikel] of endings) {
    if (re.test(short)) return `Wie war ${artikel} ${short}?`;
  }
  return 'Wie war das Treffen?';
}

export function feedbackRouter(db, notify) {
  const r = Router();

  // Offene Feedbacks: teilgenommen (oder gehostet), Event vorbei, Fenster offen,
  // noch kein Feedback abgegeben.
  r.get('/pending', (req, res) => {
    const nowMs = Date.now();
    const candidates = db
      .prepare(`SELECT DISTINCT e.* FROM events e
        LEFT JOIN participations p ON p.eventId = e.id AND p.userId = ?
        WHERE e.status = 'past' AND (p.status IN ('joined','attended') OR e.hostId = ?)`)
      .all(req.userId, req.userId);
    const pending = candidates
      .filter((e) => feedbackWindowState(e, nowMs) === 'open')
      .filter((e) => {
        const { c } = db.prepare('SELECT COUNT(*) AS c FROM feedback WHERE eventId = ? AND fromUserId = ?')
          .get(e.id, req.userId);
        return c === 0;
      })
      .map((e) => {
        const host = getUser(db, e.hostId);
        const group = db.prepare('SELECT * FROM chat_groups WHERE seriesId = ?').get(e.seriesId);
        return {
          eventId: e.id,
          title: e.title,
          dateLabel: dateLabel(e.datetime),
          city: e.city,
          hostId: e.hostId,
          hostName: host.name,
          groupInitials: group?.initials ?? e.title.slice(0, 2).toUpperCase(),
          groupColor: group?.color ?? '#8B5CF6',
          promptLabel: promptLabel(e.title),
        };
      })
      .sort((a, b) => (a.eventId < b.eventId ? 1 : -1));
    res.json(pending);
  });

  // Feedback abgeben — nur nach Event-Ende, 1× pro Teilnehmer-Paar,
  // No-Show-Tag bestätigt No-Show: −10 Score + Zähler.
  r.post('/', (req, res) => {
    const nowMs = Date.now();
    const { eventId, aboutUserId, stars, tags = [], comment = '' } = req.body || {};
    const event = eventId && getEvent(db, eventId);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    if (event.status === 'cancelled')
      return res.status(409).json({ error: 'Abgesagte Treffen können nicht bewertet werden' });
    const windowState = feedbackWindowState(event, nowMs);
    if (windowState === 'not_open')
      return res.status(409).json({ error: 'Feedback ist erst nach dem Treffen möglich' });
    if (windowState === 'closed')
      return res.status(409).json({ error: 'Das Feedback-Fenster ist geschlossen (7 Tage)' });

    const myPart = getMyParticipation(db, event.id, req.userId);
    const iAmHost = event.hostId === req.userId;
    if (!iAmHost && !['joined', 'attended'].includes(myPart?.status ?? ''))
      return res.status(403).json({ error: 'Nur Teilnehmende können Feedback geben' });

    const about = aboutUserId || event.hostId; // Standard: Feedback über den Host
    if (about === req.userId) return res.status(400).json({ error: 'Kein Feedback über dich selbst' });
    if (!getUser(db, about)) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    // Nur über Beteiligte des Events (Host oder Teilnahme-Zeile, auch cancelled/no_show)
    if (about !== event.hostId && !getMyParticipation(db, event.id, about))
      return res.status(400).json({ error: 'Feedback nur über Beteiligte dieses Treffens' });
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Bewertung (1–5 Sterne) erforderlich' });
    if (!validTags(tags)) return res.status(400).json({ error: 'Unbekannte Attribute' });
    if (!optionalWithinLimit(comment, LIMITS.feedbackComment))
      return res.status(400).json({ error: `Kommentar zu lang (max. ${LIMITS.feedbackComment} Zeichen)` });

    const dupe = db.prepare('SELECT COUNT(*) AS c FROM feedback WHERE eventId = ? AND fromUserId = ? AND aboutUserId = ?')
      .get(event.id, req.userId, about);
    if (dupe.c > 0) return res.status(409).json({ error: 'Feedback für dieses Treffen wurde schon abgegeben' });

    // No-Show per Feedback bestätigt — idempotent, VOR dem Insert geprüft
    if (tags.includes('no_show')) confirmNoShow(db, event, about);

    const id = makeId('fb');
    db.prepare(`INSERT INTO feedback (id, eventId, fromUserId, aboutUserId, stars, tags, comment, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, event.id, req.userId, about, stars, JSON.stringify(tags), String(comment).trim() || null,
        new Date(nowMs).toISOString());

    // Durchschnittsbewertung des Bewerteten aktualisieren
    const { avg } = db.prepare('SELECT AVG(stars) AS avg FROM feedback WHERE aboutUserId = ?').get(about);
    db.prepare('UPDATE users SET avgRating = ? WHERE id = ?').run(Math.round(avg * 10) / 10, about);

    notify(db, about, 'feedback', { eventId: event.id, title: event.title });
    res.status(201).json({ ok: true, id });
  });

  return r;
}
