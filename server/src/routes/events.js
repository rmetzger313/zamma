import { Router } from 'express';
import { makeId } from '../db.js';
import { serializeEvent, CATEGORIES } from '../serialize.js';
import { getUser, getEvent, getLocations, eventCtx, getMyParticipation, joinedCount } from '../repo.js';
import { matchLocations, DEFAULT_RADIUS_KM } from '../logic/geo.js';
import { eventEndMs } from '../logic/feedback.js';
import { isDemoted } from '../logic/verification.js';
import { cancelPreview, isLateCancel, applyLateCancel } from '../logic/score.js';
import { initials } from '../format.js';

// "Sa, 25.07." + "18:00" → nächstes passendes Datum (Freitext-Eingabe wie im Design)
function parseGermanDate(dateText, timeText, nowMs) {
  const dm = /(\d{1,2})\.\s*(\d{1,2})\./.exec(dateText || '');
  const tm = /(\d{1,2})[:.](\d{2})/.exec(timeText || '');
  const now = new Date(nowMs);
  const d = new Date(now.getFullYear(), dm ? +dm[2] - 1 : now.getMonth(), dm ? +dm[1] : now.getDate() + 1,
    tm ? +tm[1] : 18, tm ? +tm[2] : 0, 0, 0);
  if (d.getTime() <= nowMs) d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function eventsRouter(db, notify) {
  const r = Router();

  // Feed: Umkreis (alle gespeicherten Orte), optional Kategorie-Filter.
  // Sortierung: unverifizierte/niedrige Hosts nachrangig, eigene neue Events oben,
  // passende Events geboostet, sonst nach Datum.
  r.get('/', (req, res) => {
    const nowMs = Date.now();
    const me = getUser(db, req.userId);
    let locations = getLocations(db, req.userId);
    // Fallback: ohne gespeicherte Orte gilt der Nutzer-Standort mit Default-Radius
    if (locations.length === 0 && me.lat != null) {
      locations = [{ name: me.city, lat: me.lat, lng: me.lng, radiusKm: DEFAULT_RADIUS_KM }];
    }
    let events = db
      .prepare("SELECT * FROM events WHERE status IN ('open','full')")
      .all()
      .filter((e) => eventEndMs(e) > nowMs)
      .filter((e) => matchLocations(locations, e.lat, e.lng));
    if (req.query.category && req.query.category !== 'alle') {
      events = events.filter((e) => e.category === req.query.category);
    }
    const serialized = events.map((e) => {
      const s = serializeEvent(e, eventCtx(db, e, req.userId, nowMs));
      const host = getUser(db, e.hostId);
      const mineRecent = e.hostId === me.id && nowMs - new Date(e.createdAt).getTime() < 10 * 60 * 1000;
      return { s, sortKey: [isDemoted(host) ? 1 : 0, mineRecent ? 0 : 1, s.match ? 0 : 1, new Date(e.datetime).getTime()] };
    });
    serialized.sort((a, b) => {
      for (let i = 0; i < a.sortKey.length; i++) {
        if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] - b.sortKey[i];
      }
      return 0;
    });
    res.json(serialized.map((x) => x.s));
  });

  r.get('/:id', (req, res) => {
    const event = getEvent(db, req.params.id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    res.json(serializeEvent(event, eventCtx(db, event, req.userId)));
  });

  // Erstellen — Validierung: Titel erforderlich
  r.post('/', (req, res) => {
    const nowMs = Date.now();
    const { title, category, skillLevel, date, time, datetime, locationName, recurrence } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Titel erforderlich' });
    if (category && !(category in CATEGORIES)) return res.status(400).json({ error: 'Unbekannte Kategorie' });
    if (skillLevel != null && ![1, 2, 3].includes(skillLevel))
      return res.status(400).json({ error: 'Level muss 1, 2 oder 3 sein' });
    if (recurrence != null && !['weekly', 'biweekly'].includes(recurrence))
      return res.status(400).json({ error: 'Recurrence muss weekly oder biweekly sein' });
    const maxSpots = req.body.maxSpots ?? 6;
    if (!Number.isInteger(maxSpots) || maxSpots < 2 || maxSpots > 50)
      return res.status(400).json({ error: 'Plätze: ganze Zahl zwischen 2 und 50' });
    if (datetime != null && Number.isNaN(Date.parse(datetime)))
      return res.status(400).json({ error: 'Ungültiges Datum' });
    const me = getUser(db, req.userId);
    const primary = getLocations(db, req.userId)[0];
    const id = makeId('evt');
    const seriesId = makeId('ser');
    const dt = datetime || parseGermanDate(date, time, nowMs);
    db.prepare(`INSERT INTO events (id, seriesId, hostId, title, category, description, skillLevel, datetime,
        durationMin, recurrence, locationName, city, lat, lng, mapX, mapY, maxSpots, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 120, ?, ?, ?, ?, ?, '50%', '36%', ?, 'open', ?)`)
      .run(id, seriesId, req.userId, String(title).trim(), category || 'sport', req.body.description ||
        'Von dir erstellt — Teilnehmende sehen diese Beschreibung.', skillLevel || 1, dt,
        recurrence || null, (locationName || '').trim() || `${me.city}`, me.city, primary?.lat ?? me.lat,
        primary?.lng ?? me.lng, maxSpots, new Date(nowMs).toISOString());
    // Gruppenchat der neuen Serie
    db.prepare('INSERT INTO chat_groups (seriesId, name, initials, color) VALUES (?, ?, ?, ?)')
      .run(seriesId, String(title).trim(), initials(String(title).trim()),
        { sport: '#e05d38', spiele: '#7a5fd5', kreativ: '#c78f2e', outdoor: '#2d7a5f', kochen: '#b94572' }[category || 'sport']);
    db.prepare('INSERT INTO chat_members (seriesId, userId, lastReadAt) VALUES (?, ?, ?)')
      .run(seriesId, req.userId, new Date(nowMs).toISOString());
    const event = getEvent(db, id);
    res.status(201).json(serializeEvent(event, eventCtx(db, event, req.userId, nowMs)));
  });

  // Beitreten — optimistic UI in der App, hier die Wahrheit
  r.post('/:id/join', (req, res) => {
    const nowMs = Date.now();
    const event = getEvent(db, req.params.id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    if (event.status === 'past' || event.status === 'cancelled')
      return res.status(409).json({ error: 'Event ist vorbei oder abgesagt' });
    if (event.hostId === req.userId) return res.status(409).json({ error: 'Du bist Host dieses Events' });
    const existing = getMyParticipation(db, event.id, req.userId);
    if (existing?.status === 'joined') return res.status(409).json({ error: 'Du bist schon dabei' });
    if (joinedCount(db, event) >= event.maxSpots) return res.status(409).json({ error: 'Keine Plätze mehr frei' });

    db.prepare(`INSERT INTO participations (userId, eventId, status, joinedAt, cancelledAt)
        VALUES (?, ?, 'joined', ?, NULL)
        ON CONFLICT(userId, eventId) DO UPDATE SET status='joined', joinedAt=excluded.joinedAt, cancelledAt=NULL`)
      .run(req.userId, event.id, new Date(nowMs).toISOString());
    db.prepare('INSERT OR IGNORE INTO chat_members (seriesId, userId, lastReadAt) VALUES (?, ?, ?)')
      .run(event.seriesId, req.userId, new Date(nowMs).toISOString());
    if (joinedCount(db, event) >= event.maxSpots) {
      db.prepare("UPDATE events SET status = 'full' WHERE id = ?").run(event.id);
    }
    const me = getUser(db, req.userId);
    notify(db, event.hostId, 'join', { eventId: event.id, title: event.title, user: me.name });
    const fresh = getEvent(db, event.id);
    res.json(serializeEvent(fresh, eventCtx(db, fresh, req.userId, nowMs)));
  });

  // Host sagt sein Event ab → Status 'cancelled', Gruppe wird benachrichtigt
  r.post('/:id/host-cancel', (req, res) => {
    const event = getEvent(db, req.params.id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    if (event.hostId !== req.userId) return res.status(403).json({ error: 'Nur der Host kann das Event absagen' });
    if (!['open', 'full'].includes(event.status))
      return res.status(409).json({ error: 'Event ist bereits vorbei oder abgesagt' });
    db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(event.id);
    const me = getUser(db, req.userId);
    const members = db.prepare('SELECT userId FROM chat_members WHERE seriesId = ? AND userId != ?')
      .all(event.seriesId, req.userId);
    for (const m of members) {
      notify(db, m.userId, 'cancel', { eventId: event.id, title: event.title, user: me.name, byHost: true });
    }
    res.json({ ok: true });
  });

  // Vorschau fürs Absage-Modal: "Dein Score: 96 % → 93 %"
  r.get('/:id/cancel-preview', (req, res) => {
    const event = getEvent(db, req.params.id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    const me = getUser(db, req.userId);
    res.json(cancelPreview(me.reliabilityScore, event.datetime, Date.now()));
  });

  // Absagen — < 24 h vor Beginn: Score −3; Gruppe wird benachrichtigt
  r.post('/:id/cancel', (req, res) => {
    const nowMs = Date.now();
    const event = getEvent(db, req.params.id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    const part = getMyParticipation(db, event.id, req.userId);
    if (part?.status !== 'joined') return res.status(409).json({ error: 'Du bist nicht angemeldet' });

    db.prepare("UPDATE participations SET status = 'cancelled', cancelledAt = ? WHERE userId = ? AND eventId = ?")
      .run(new Date(nowMs).toISOString(), req.userId, event.id);
    const me = getUser(db, req.userId);
    const late = isLateCancel(event.datetime, nowMs);
    let score = me.reliabilityScore;
    if (late) {
      score = applyLateCancel(score);
      db.prepare('UPDATE users SET reliabilityScore = ? WHERE id = ?').run(score, req.userId);
    }
    if (event.status === 'full') db.prepare("UPDATE events SET status = 'open' WHERE id = ?").run(event.id);
    // Gruppe benachrichtigen
    const members = db.prepare('SELECT userId FROM chat_members WHERE seriesId = ? AND userId != ?')
      .all(event.seriesId, req.userId);
    for (const m of members) {
      notify(db, m.userId, 'cancel', { eventId: event.id, title: event.title, user: me.name, late });
    }
    const fresh = getEvent(db, event.id);
    res.json({
      event: serializeEvent(fresh, eventCtx(db, fresh, req.userId, nowMs)),
      score: { current: score, delta: late ? me.reliabilityScore - score : 0, late },
    });
  });

  return r;
}
