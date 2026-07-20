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
import { matchesUser } from '../src/serialize.js';
import { createRateLimiter } from '../src/logic/ratelimit.js';
import { compatibility } from '../src/logic/match.js';
import { suggestions } from '../src/logic/suggest.js';
import { computeBadges } from '../src/logic/badges.js';
import { blockUser, getBlockedIds } from '../src/logic/moderation.js';

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

// ── Skill-Matching („Passt zu dir") ──────────────────────────────────────
test('Skill-Matching: "Alle Level" matcht immer, sonst exakter Level in der Kategorie', () => {
  const spiele2 = { category: 'spiele', skillLevel: 2 };
  assert.equal(matchesUser({ category: 'sport', skillLevel: 1 }, []), true); // Alle Level
  assert.equal(matchesUser(spiele2, [{ hobby: 'Schafkopf', skillLevel: 2 }]), true);
  assert.equal(matchesUser(spiele2, [{ hobby: 'Schafkopf', skillLevel: 3 }]), false); // Level-Mismatch
  assert.equal(matchesUser(spiele2, [{ hobby: 'Laufen', skillLevel: 2 }]), false); // Kategorie-Mismatch
  assert.equal(matchesUser(spiele2, [{ hobby: 'Curling', skillLevel: 2 }]), false); // unbekanntes Hobby
  assert.equal(matchesUser(spiele2, []), false);
});

// ── Exakte Grenzwerte ────────────────────────────────────────────────────
test('Grenzwerte: genau 24 h ist NICHT kurzfristig, Score genau 80 NICHT nachrangig', () => {
  const now = Date.parse('2026-07-18T12:00:00Z');
  assert.equal(isLateCancel(new Date(now + 24 * H).toISOString(), now), false);
  const user = { verifiedPhone: 1, verifiedId: 1, meetingsAttended: 14, noShowCount: 0, reliabilityScore: 80 };
  assert.equal(isDemoted(user), false);
});

test('Grenzwerte: Feedback-Fenster genau bei Ende offen, genau bei Ende+7 Tage noch offen', () => {
  const event = { datetime: '2026-07-17T17:00:00.000Z', durationMin: 120 };
  const end = Date.parse('2026-07-17T19:00:00.000Z');
  assert.equal(feedbackWindowState(event, end), 'open');
  assert.equal(feedbackWindowState(event, end + 7 * D), 'open');
  assert.equal(feedbackWindowState(event, end + 7 * D + 1), 'closed');
});

test('Umkreis: ohne radiusKm greift der 25-km-Default', () => {
  const loc = [{ name: 'X', lat: 48.0, lng: 11.5 }]; // kein radiusKm
  assert.ok(matchLocations(loc, 48.18, 11.5)); // ~20 km
  assert.equal(matchLocations(loc, 48.27, 11.5), null); // ~30 km
});

// ── Recurrence: DST-fest ─────────────────────────────────────────────────
test('Recurrence: lokale Uhrzeit bleibt über die Zeitumstellung stabil', () => {
  // Sa 24.10.2026 09:00 lokal → +7 Tage überquert (in DST-Zonen) das Ende der Sommerzeit
  const start = new Date(2026, 9, 24, 9, 0, 0, 0);
  const next = new Date(nextOccurrence(start.toISOString(), 'weekly'));
  assert.equal(next.getHours(), 9);
  assert.equal(next.getDay(), start.getDay());
});

// ── Konto-Löschung ───────────────────────────────────────────────────────
test('Konto-Löschung: anonymisiert, entfernt Inhalte, sagt gehostete Events ab', async () => {
  const { deleteAccount } = await import('../src/routes/users.js');
  const db = openDb(':memory:');
  seed(db);
  const sent = [];
  deleteAccount(db, 'u_helga', (_db, userId, type, payload) => sent.push({ userId, type, payload }));

  const helga = db.prepare("SELECT * FROM users WHERE id = 'u_helga'").get();
  assert.equal(helga.name, 'Gelöschtes Profil');
  assert.equal(helga.verifiedId, 0);
  // Zukünftiges gehostetes Event (Brettspielabend) abgesagt, Gruppe benachrichtigt
  const bsa = db.prepare("SELECT status FROM events WHERE id = 'evt_bsa'").get();
  assert.equal(bsa.status, 'cancelled');
  assert.ok(sent.some((s) => s.type === 'cancel' && s.payload.eventId === 'evt_bsa'));
  // Eigene Inhalte weg
  assert.equal(db.prepare("SELECT COUNT(*) c FROM chat_messages WHERE userId = 'u_helga'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM feedback WHERE fromUserId = 'u_helga' OR aboutUserId = 'u_helga'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM chat_members WHERE userId = 'u_helga'").get().c, 0);
  // Historie bleibt referenzintakt (Past-Event existiert weiter)
  assert.ok(db.prepare("SELECT 1 x FROM events WHERE id = 'evt_bsa_past'").get());
});

// ── Leute-Matching ───────────────────────────────────────────────────────
test('Kompatibilität: gleiches Hobby + Level-Nähe, Kategorie-Punkt, sonst 0', () => {
  const me = [{ hobby: 'Laufen', skillLevel: 2 }, { hobby: 'Brettspiele', skillLevel: 1 }];
  assert.deepEqual(compatibility(me, [{ hobby: 'Laufen', skillLevel: 2 }]),
    { score: 5, shared: ['Laufen'] }); // 3 + 2 (gleiches Level)
  assert.equal(compatibility(me, [{ hobby: 'Laufen', skillLevel: 3 }]).score, 4); // 3 + 1 (±1)
  assert.equal(compatibility(me, [{ hobby: 'Radfahren', skillLevel: 1 }]).score, 1); // Kategorie Sport
  assert.equal(compatibility(me, [{ hobby: 'Kochen', skillLevel: 1 }]).score, 0);
  assert.deepEqual(compatibility([], [{ hobby: 'Laufen', skillLevel: 1 }]), { score: 0, shared: [] });
});

// ── Smart Suggestions ────────────────────────────────────────────────────
test('Suggestions: ähnliche Hobbys ohne Duplikate zu eigenen', () => {
  const s = suggestions([{ hobby: 'Laufen', skillLevel: 1 }, { hobby: 'Radfahren', skillLevel: 2 }]);
  const names = s.map((x) => x.hobby);
  assert.ok(names.includes('Wandern'));
  assert.ok(!names.includes('Laufen') && !names.includes('Radfahren')); // nichts Eigenes
  assert.equal(new Set(names).size, names.length); // keine Duplikate
  assert.deepEqual(suggestions([]), []);
});

// ── Badges ───────────────────────────────────────────────────────────────
test('Badges: abgeleitet aus Treffen, Serie, Score und 5-Sterne-Feedback', () => {
  const db = openDb(':memory:');
  seed(db);
  const badges = Object.fromEntries(computeBadges(db, 'u_anna').map((b) => [b.key, b.earned]));
  assert.equal(badges.first_meeting, true); // 14 Treffen
  assert.equal(badges.ten_meetings, true);
  assert.equal(badges.rock_solid, true); // 96 % bei 14 Treffen
  assert.equal(badges.five_star, true); // 5★ von Jonas/Helga
  assert.equal(badges.series_regular, false); // nur je 1 attended pro Serie im Seed
  const fresh = Object.fromEntries(computeBadges(db, 'u_lea').map((b) => [b.key, b.earned]));
  assert.equal(fresh.ten_meetings, false); // Lea: 8 Treffen
});

// ── Moderation: Block wirkt auf Feed-Daten ───────────────────────────────
test('Block: Selbst-Block abgelehnt, Blockliste gefüllt, idempotent', () => {
  const db = openDb(':memory:');
  seed(db);
  assert.throws(() => blockUser(db, 'u_anna', 'u_anna'), /nicht selbst/);
  assert.throws(() => blockUser(db, 'u_anna', 'u_gibtsnicht'), /nicht gefunden/);
  blockUser(db, 'u_anna', 'u_jonas');
  blockUser(db, 'u_anna', 'u_jonas'); // idempotent
  const blocked = getBlockedIds(db, 'u_anna');
  assert.deepEqual([...blocked], ['u_jonas']);
});

// ── Rate-Limit ───────────────────────────────────────────────────────────
test('Rate-Limit: blockt ab Limit, Fenster gleitet, Schlüssel getrennt', () => {
  let t = 0;
  const allow = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
  assert.equal(allow('a'), true);
  assert.equal(allow('a'), true);
  assert.equal(allow('a'), true);
  assert.equal(allow('a'), false); // Limit erreicht
  assert.equal(allow('b'), true); // anderer Schlüssel unabhängig
  t = 1001; // Fenster abgelaufen
  assert.equal(allow('a'), true);
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

test('No-Show des HOSTS: revertiert dessen Bonus (−10 −1, Treffen-Zähler −1)', () => {
  const db = openDb(':memory:');
  seed(db);
  const event = db.prepare("SELECT * FROM events WHERE id = 'evt_bsa_past'").get();
  const before = db.prepare("SELECT * FROM users WHERE id = 'u_helga'").get();
  const r = confirmNoShow(db, event, 'u_helga'); // Helga ist Host, Event ist 'past'
  assert.equal(r.applied, true);
  const after = db.prepare("SELECT * FROM users WHERE id = 'u_helga'").get();
  assert.equal(after.reliabilityScore, Math.max(0, before.reliabilityScore - 11));
  assert.equal(after.meetingsAttended, before.meetingsAttended - 1);
  assert.equal(after.noShowCount, before.noShowCount + 1);
});

test('No-Show VOR dem Tick (Teilnahme noch joined): nur −10, kein Bonus-Revert', () => {
  const db = openDb(':memory:');
  seed(db);
  db.prepare("UPDATE participations SET status = 'joined' WHERE eventId = 'evt_bsa_past' AND userId = 'u_kurt'").run();
  const before = db.prepare("SELECT * FROM users WHERE id = 'u_kurt'").get();
  confirmNoShow(db, db.prepare("SELECT * FROM events WHERE id = 'evt_bsa_past'").get(), 'u_kurt');
  const after = db.prepare("SELECT * FROM users WHERE id = 'u_kurt'").get();
  assert.equal(after.reliabilityScore, before.reliabilityScore - 10);
  assert.equal(after.meetingsAttended, before.meetingsAttended); // kein Bonus vergeben → kein Revert
  // Teilnahme steht auf no_show → der Tick vergibt später auch keinen Bonus mehr
  const part = db.prepare("SELECT status FROM participations WHERE eventId = 'evt_bsa_past' AND userId = 'u_kurt'").get();
  assert.equal(part.status, 'no_show');
});

test('Recurrence: Catch-up nach Downtime überspringt verpasste Termine', () => {
  const db = openDb(':memory:');
  seed(db);
  const now = Date.now();
  // Serie 3 Wochen in der Vergangenheit "einfrieren"
  const old = new Date(now - 21 * D).toISOString();
  db.prepare("UPDATE events SET datetime = ?, status = 'past' WHERE seriesId = 'ser_lauf'").run(old);
  const event = db.prepare("SELECT * FROM events WHERE seriesId = 'ser_lauf' LIMIT 1").get();
  const created = ensureNextInstance(db, event, now);
  assert.ok(created, 'keine Folge-Instanz erzeugt');
  const dt = new Date(created.datetime).getTime();
  assert.ok(dt > now, 'Folge-Instanz liegt nicht in der Zukunft');
  assert.ok(dt <= now + 7 * D, 'Folge-Instanz liegt mehr als eine Woche voraus');
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
