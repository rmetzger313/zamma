// Demo-Daten (München & Waldkraiburg) — Inhalte aus dem Design-Prototyp.
// Termine werden dynamisch relativ zu "jetzt" gesetzt, damit Feedback-Fenster,
// Recurrence und Reminder jederzeit konsistent demonstrierbar sind.

import { initials } from './format.js';

const H = 3600000, D = 24 * H;

// Nächster Wochentag (0=So..6=Sa) mit Uhrzeit, strikt in der Zukunft.
function nextWeekday(now, weekday, hour, minute = 0) {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  while (d.getDay() !== weekday || d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

// Letzter Wochentag mit Uhrzeit, strikt in der Vergangenheit.
function prevWeekday(now, weekday, hour, minute = 0) {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  while (d.getDay() !== weekday || d.getTime() >= now) d.setDate(d.getDate() - 1);
  return d.toISOString();
}

export function seed(db, now = Date.now()) {
  const iso = (ms) => new Date(ms).toISOString();

  const users = [
    // Demo-Nutzerin (angemeldet)
    { id: 'u_anna', name: 'Anna M.', avatarColor: '#8B5CF6', city: 'München', lat: 48.1374, lng: 11.5755,
      joinDate: '2026-03-10T10:00:00.000Z', verifiedPhone: 1, verifiedPhoneAt: '2026-03-10T10:05:00.000Z',
      verifiedId: 1, verifiedIdAt: '2026-03-12T18:00:00.000Z',
      reliabilityScore: 96, meetingsAttended: 14, avgRating: 4.9, noShowCount: 0 },
    // Hosts
    { id: 'u_jonas', name: 'Jonas K.', avatarColor: '#0F9B8E', city: 'München', lat: 48.152, lng: 11.593,
      joinDate: '2025-09-01T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 98, meetingsAttended: 31, avgRating: 4.8, noShowCount: 0 },
    { id: 'u_helga', name: 'Helga B.', avatarColor: '#DB2777', city: 'Waldkraiburg', lat: 48.208, lng: 12.398,
      joinDate: '2025-06-15T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 100, meetingsAttended: 22, avgRating: 5.0, noShowCount: 0 },
    { id: 'u_miriam', name: 'Miriam S.', avatarColor: '#8B5CF6', city: 'München', lat: 48.13, lng: 11.6,
      joinDate: '2025-11-20T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 95, meetingsAttended: 17, avgRating: 4.7, noShowCount: 0 },
    // David ist NICHT voll verifiziert (kein Video-Ident) → nachrangig sortiert
    { id: 'u_david', name: 'David R.', avatarColor: '#D97706', city: 'München', lat: 48.14, lng: 11.58,
      joinDate: '2026-05-02T10:00:00.000Z', verifiedPhone: 1, verifiedId: 0,
      reliabilityScore: 89, meetingsAttended: 6, avgRating: 4.5, noShowCount: 0 },
    { id: 'u_sepp', name: 'Sepp L.', avatarColor: '#0F9B8E', city: 'Waldkraiburg', lat: 48.206, lng: 12.4,
      joinDate: '2025-03-10T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 97, meetingsAttended: 40, avgRating: 4.9, noShowCount: 0 },
    { id: 'u_luca', name: 'Luca M.', avatarColor: '#FF6B42', city: 'München', lat: 48.16, lng: 11.55,
      joinDate: '2026-01-08T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 93, meetingsAttended: 11, avgRating: 4.6, noShowCount: 0 },
    // Teilnehmende
    ...[['u_lea', 'Lea', '#FF6B42'], ['u_tom', 'Tom', '#8B5CF6'], ['u_sofia', 'Sofia', '#D97706'],
      ['u_ben', 'Ben', '#DB2777'], ['u_kurt', 'Kurt', '#0F9B8E'], ['u_ines', 'Ines', '#FF6B42'],
      ['u_ali', 'Ali', '#8B5CF6'], ['u_mia', 'Mia', '#DB2777'], ['u_otto', 'Otto', '#D97706'],
      ['u_paul', 'Paul', '#D97706'], ['u_nina', 'Nina', '#0F9B8E'], ['u_mara', 'Mara', '#DB2777'],
      ['u_jens', 'Jens', '#FF6B42'], ['u_kim', 'Kim', '#8B5CF6'], ['u_emma', 'Emma', '#8B5CF6'],
      ['u_ravi', 'Ravi', '#0F9B8E'], ['u_julia', 'Julia', '#D97706'],
    ].map(([id, name, avatarColor]) => ({
      id, name, avatarColor, city: 'München', lat: 48.14, lng: 11.57,
      joinDate: '2026-02-01T10:00:00.000Z', verifiedPhone: 1, verifiedId: 1,
      reliabilityScore: 95, meetingsAttended: 8, avgRating: 4.8, noShowCount: 0,
    })),
  ];

  const insUser = db.prepare(`INSERT INTO users (id, name, avatarColor, city, lat, lng, joinDate,
    verifiedPhone, verifiedPhoneAt, verifiedId, verifiedIdAt, reliabilityScore, meetingsAttended, avgRating, noShowCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const u of users) {
    insUser.run(u.id, u.name, u.avatarColor, u.city, u.lat, u.lng, u.joinDate,
      u.verifiedPhone ?? 0, u.verifiedPhoneAt ?? null, u.verifiedId ?? 0, u.verifiedIdAt ?? null,
      u.reliabilityScore, u.meetingsAttended, u.avgRating, u.noShowCount);
  }

  const insHobby = db.prepare('INSERT INTO user_hobbies (userId, hobby, skillLevel) VALUES (?, ?, ?)');
  for (const [hobby, lvl] of [['Laufen', 1], ['Brettspiele', 1], ['Fotografie', 1]]) insHobby.run('u_anna', hobby, lvl);
  // Hobbys der übrigen Demo-Nutzer (Basis fürs Leute-Matching)
  const HOBBY_SEED = {
    u_jonas: [['Laufen', 2], ['Radfahren', 1]],
    u_helga: [['Brettspiele', 3], ['Schafkopf', 2]],
    u_miriam: [['Bouldern', 2], ['Laufen', 1]],
    u_david: [['Fotografie', 2], ['Wandern', 1]],
    u_sepp: [['Schafkopf', 3]],
    u_luca: [['Kochen', 2]],
    u_lea: [['Laufen', 1], ['Fotografie', 1]],
    u_tom: [['Laufen', 1], ['Brettspiele', 1]],
    u_kurt: [['Brettspiele', 1]],
    u_ines: [['Brettspiele', 2], ['Kochen', 1]],
    u_emma: [['Kochen', 1], ['Malen', 1]],
  };
  for (const [uid, hs] of Object.entries(HOBBY_SEED)) {
    for (const [hobby, lvl] of hs) insHobby.run(uid, hobby, lvl);
  }

  // Verfügbarkeit (Wochentage + Tageszeiten)
  const insAvail = db.prepare('INSERT INTO user_availability (userId, kind, value) VALUES (?, ?, ?)');
  const AVAIL_SEED = {
    u_anna: { days: ['Mo', 'Mi', 'Fr'], slots: ['evening'] },
    u_jonas: { days: ['Sa', 'So'], slots: ['morning'] },
    u_helga: { days: ['Fr'], slots: ['evening'] },
  };
  for (const [uid, { days, slots }] of Object.entries(AVAIL_SEED)) {
    for (const d of days) insAvail.run(uid, 'day', d);
    for (const s of slots) insAvail.run(uid, 'slot', s);
  }

  const insLoc = db.prepare('INSERT INTO user_locations (userId, name, lat, lng, radiusKm, isPrimary) VALUES (?, ?, ?, ?, ?, ?)');
  insLoc.run('u_anna', 'München & Umgebung', 48.1374, 11.5755, 25, 1);
  insLoc.run('u_anna', 'Waldkraiburg', 48.208, 12.398, 10, 0);

  const insEvent = db.prepare(`INSERT INTO events (id, seriesId, hostId, title, category, description, skillLevel,
    datetime, durationMin, recurrence, locationName, city, lat, lng, distLabelOverride, mapX, mapY, maxSpots, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const ev = (e) => insEvent.run(e.id, e.seriesId, e.hostId, e.title, e.category, e.description ?? null, e.skillLevel,
    e.datetime, e.durationMin ?? 120, e.recurrence ?? null, e.locationName, e.city, e.lat, e.lng,
    e.distLabelOverride ?? null, e.mapX ?? null, e.mapY ?? null, e.maxSpots, e.status ?? 'open', iso(now - 30 * D));

  // ── Bevorstehende Events (Feed) ─────────────────────────────────────────
  ev({ id: 'evt_lauf', seriesId: 'ser_lauf', hostId: 'u_jonas', title: 'Lauftreff Englischer Garten',
    category: 'sport', skillLevel: 1, datetime: nextWeekday(now, 6, 9), recurrence: 'weekly',
    locationName: 'Englischer Garten (Monopteros)', city: 'München', lat: 48.152, lng: 11.5928,
    mapX: '34%', mapY: '26%', maxSpots: 8,
    description: 'Lockere 6-km-Runde durch den Englischen Garten, Tempo ca. 6:30 min/km. Danach Kaffee am Kiosk — Dranbleiben freiwillig, Quatschen erwünscht.' });
  ev({ id: 'evt_bsa', seriesId: 'ser_bsa', hostId: 'u_helga', title: 'Brettspielabend im Jugendhaus',
    category: 'spiele', skillLevel: 1, datetime: nextWeekday(now, 5, 19), recurrence: 'biweekly',
    locationName: 'Jugendhaus Waldkraiburg', city: 'Waldkraiburg', lat: 48.211, lng: 12.397,
    distLabelOverride: 'Zentrum', mapX: '72%', mapY: '40%', maxSpots: 10,
    description: 'Von Catan bis Cascadia — Spiele sind da, bring gern eigene mit. Anfänger ausdrücklich willkommen, wir erklären alles.' });
  ev({ id: 'evt_boulder', seriesId: 'ser_boulder', hostId: 'u_miriam', title: 'Bouldern für Einsteiger',
    category: 'sport', skillLevel: 1, datetime: nextWeekday(now, 0, 10, 30),
    locationName: 'Boulderhalle München-Ost', city: 'München-Ost', lat: 48.123, lng: 11.645,
    mapX: '62%', mapY: '62%', maxSpots: 6,
    description: 'Erste Griffe, Falltechnik und viel Spaß an der Wand. Leihschuhe gibt es vor Ort, keine Vorkenntnisse nötig.' });
  ev({ id: 'evt_foto', seriesId: 'ser_foto', hostId: 'u_david', title: 'Fotowalk durch die Altstadt',
    category: 'kreativ', skillLevel: 2, datetime: nextWeekday(now, 6, 17),
    locationName: 'Marienplatz', city: 'München', lat: 48.135, lng: 11.5915,
    mapX: '44%', mapY: '48%', maxSpots: 6,
    description: 'Goldene Stunde rund um Marienplatz und Viktualienmarkt. Egal ob Handy oder Vollformat — es geht ums Sehen, nicht ums Gear.' });
  ev({ id: 'evt_schafkopf', seriesId: 'ser_schafkopf', hostId: 'u_sepp', title: 'Schafkopf-Runde im Wirtshaus',
    category: 'spiele', skillLevel: 2, datetime: nextWeekday(now, 5, 19, 30), recurrence: 'weekly',
    locationName: 'Wirtshaus am Stadtplatz', city: 'Waldkraiburg', lat: 48.206, lng: 12.4,
    distLabelOverride: 'Stadtplatz', mapX: '80%', mapY: '22%', maxSpots: 4,
    description: 'Klassisches Schafkopfen mit kurzer Auffrischung für Wiedereinsteiger. Einsatz: symbolische 10 Cent, Hauptsache Gaudi.' });
  ev({ id: 'evt_pasta', seriesId: 'ser_pasta', hostId: 'u_luca', title: 'Gemeinsam kochen: Pasta-Abend',
    category: 'kochen', skillLevel: 1, datetime: nextWeekday(now, 0, 18),
    locationName: 'Gemeinschaftsküche Schwabing', city: 'München', lat: 48.165, lng: 11.545,
    mapX: '22%', mapY: '66%', maxSpots: 5,
    description: 'Frische Tagliatelle von Hand — Zutaten teilen wir uns, gegessen wird zusammen. Küche ist groß genug für alle.' });

  // ── Vergangene Events (Feedback-Historie & pending Feedback) ───────────
  // Brettspielabend gestern Abend → Feedback-Fenster offen → Prompt-Banner im Feed
  const bsaPastStart = prevWeekday(now, 5, 19);
  ev({ id: 'evt_bsa_past', seriesId: 'ser_bsa', hostId: 'u_helga', title: 'Brettspielabend im Jugendhaus',
    category: 'spiele', skillLevel: 1, datetime: bsaPastStart, recurrence: 'biweekly',
    locationName: 'Jugendhaus Waldkraiburg', city: 'Waldkraiburg', lat: 48.211, lng: 12.397,
    distLabelOverride: 'Zentrum', maxSpots: 10, status: 'past' });
  // Referenz -5 h: verhindert am Samstagvormittag eine "heute laufende" Instanz
  // (und damit Feedback-Zeitstempel in der Zukunft)
  const laufPastStart = prevWeekday(now - 5 * H, 6, 9);
  ev({ id: 'evt_lauf_past', seriesId: 'ser_lauf', hostId: 'u_jonas', title: 'Lauftreff Englischer Garten',
    category: 'sport', skillLevel: 1, datetime: laufPastStart, recurrence: 'weekly',
    locationName: 'Englischer Garten (Monopteros)', city: 'München', lat: 48.152, lng: 11.5928,
    maxSpots: 8, status: 'past' });
  ev({ id: 'evt_foto_past', seriesId: 'ser_foto_past', hostId: 'u_david', title: 'Fotowalk Haidhausen',
    category: 'kreativ', skillLevel: 1, datetime: iso(now - 12 * D),
    locationName: 'Wiener Platz', city: 'München', lat: 48.133, lng: 11.601, maxSpots: 6, status: 'past' });

  const insPart = db.prepare('INSERT INTO participations (userId, eventId, status, joinedAt) VALUES (?, ?, ?, ?)');
  const join = (eventId, ids, status = 'joined') => {
    for (const u of ids) insPart.run(u, eventId, status, iso(now - 5 * D));
  };
  join('evt_lauf', ['u_lea', 'u_tom', 'u_sofia', 'u_ben']);          // 5 / 8 dabei (inkl. Host)
  join('evt_bsa', ['u_kurt', 'u_ines', 'u_ali', 'u_mia', 'u_otto']); // 6 / 10 dabei
  join('evt_boulder', ['u_paul', 'u_nina']);                         // 3 / 6 dabei
  join('evt_foto', ['u_mara', 'u_jens', 'u_kim']);                   // 4 / 6 dabei
  join('evt_schafkopf', []);                                         // 1 / 4 dabei (nur Host)
  join('evt_pasta', ['u_emma', 'u_ravi', 'u_julia']);                // 4 / 5 dabei
  join('evt_bsa_past', ['u_anna', 'u_kurt', 'u_ines', 'u_ali'], 'attended');
  join('evt_lauf_past', ['u_anna', 'u_lea', 'u_tom'], 'attended');
  join('evt_foto_past', ['u_anna', 'u_mara'], 'attended');

  // ── Feedback (über Anna — erscheint im Profil) ─────────────────────────
  const insFb = db.prepare(`INSERT INTO feedback (id, eventId, fromUserId, aboutUserId, stars, tags, comment, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insFb.run('fb_1', 'evt_lauf_past', 'u_jonas', 'u_anna', 5, JSON.stringify(['punctual', 'friendly']),
    'Pünktlich, motiviert und super nett — gern wieder beim Lauftreff!', iso(new Date(laufPastStart).getTime() + 4 * H));
  insFb.run('fb_2', 'evt_bsa_past', 'u_helga', 'u_anna', 5, JSON.stringify(['as_described', 'friendly']),
    'Hat wie versprochen die Spiele mitgebracht. Absolut verlässlich.', iso(new Date(bsaPastStart).getTime() + 4 * H));
  insFb.run('fb_3', 'evt_foto_past', 'u_david', 'u_anna', 4, JSON.stringify(['friendly', 'late']),
    'Kam 10 Minuten später, hatte aber vorher Bescheid gesagt. Alles gut!', iso(now - 11 * D));
  // Annas eigenes Feedback (bereits gegeben) — nur der Brettspielabend ist noch offen
  insFb.run('fb_4', 'evt_lauf_past', 'u_anna', 'u_jonas', 5, JSON.stringify(['punctual', 'organized']),
    'Tolle Runde, super organisiert!', iso(new Date(laufPastStart).getTime() + 5 * H));
  insFb.run('fb_5', 'evt_foto_past', 'u_anna', 'u_david', 5, JSON.stringify(['friendly']),
    'Schöner Spaziergang mit viel Inspiration.', iso(now - 11 * D));

  // ── Chats (Gruppenchat je Event-Serie) ─────────────────────────────────
  const insGroup = db.prepare('INSERT INTO chat_groups (seriesId, name, initials, color) VALUES (?, ?, ?, ?)');
  insGroup.run('ser_lauf', 'Lauftreff Englischer Garten', 'LG', '#0F9B8E');
  insGroup.run('ser_bsa', 'Brettspielabend Waldkraiburg', 'BW', '#8B5CF6');
  insGroup.run('ser_boulder', 'Bouldern für Einsteiger', initials('Bouldern Einsteiger'), '#FF6B42');
  insGroup.run('ser_foto', 'Fotowalk durch die Altstadt', 'FA', '#D97706');
  insGroup.run('ser_schafkopf', 'Schafkopf-Runde im Wirtshaus', 'SW', '#8B5CF6');
  insGroup.run('ser_pasta', 'Gemeinsam kochen: Pasta-Abend', 'GP', '#DB2777');
  insGroup.run('ser_foto_past', 'Fotowalk Haidhausen', 'FH', '#D97706');

  const insMember = db.prepare('INSERT INTO chat_members (seriesId, userId, lastReadAt) VALUES (?, ?, ?)');
  const msgTimes = {
    lauf: [now - 3 * H, now - 2 * H, now - 1.5 * H, now - 80 * 60000],
    bsa: [now - 26 * H, now - 25 * H, now - 24.5 * H],
  };
  // Anna hat die letzten beiden Lauftreff-Nachrichten noch nicht gelesen → Badge "2"
  for (const u of ['u_jonas', 'u_lea', 'u_tom', 'u_sofia', 'u_ben']) insMember.run('ser_lauf', u, iso(now));
  insMember.run('ser_lauf', 'u_anna', iso(msgTimes.lauf[0] + 60000));
  for (const u of ['u_helga', 'u_anna', 'u_kurt', 'u_ines', 'u_ali', 'u_mia', 'u_otto']) insMember.run('ser_bsa', u, iso(now));
  for (const u of ['u_miriam', 'u_paul', 'u_nina']) insMember.run('ser_boulder', u, iso(now));
  for (const u of ['u_david', 'u_mara', 'u_jens', 'u_kim']) insMember.run('ser_foto', u, iso(now));
  insMember.run('ser_schafkopf', 'u_sepp', iso(now));
  for (const u of ['u_luca', 'u_emma', 'u_ravi', 'u_julia']) insMember.run('ser_pasta', u, iso(now));
  for (const u of ['u_david', 'u_anna', 'u_mara']) insMember.run('ser_foto_past', u, iso(now));

  const insMsg = db.prepare('INSERT INTO chat_messages (id, seriesId, userId, text, createdAt) VALUES (?, ?, ?, ?, ?)');
  insMsg.run('msg_l1', 'ser_lauf', 'u_jonas', 'Servus zusammen! Samstag wie immer 9 Uhr am Monopteros?', iso(msgTimes.lauf[0]));
  insMsg.run('msg_l2', 'ser_lauf', 'u_lea', 'Bin dabei! Bringt jemand Wasser mit?', iso(msgTimes.lauf[1]));
  insMsg.run('msg_l3', 'ser_lauf', 'u_anna', 'Ja, ich pack zwei Flaschen ein 👍', iso(msgTimes.lauf[2]));
  insMsg.run('msg_l4', 'ser_lauf', 'u_jonas', 'Top. Wetter sieht gut aus, ca. 21 Grad.', iso(msgTimes.lauf[3]));
  insMsg.run('msg_b1', 'ser_bsa', 'u_helga', 'Freitag ist wieder Spieleabend! Wer bringt Cascadia mit?', iso(msgTimes.bsa[0]));
  insMsg.run('msg_b2', 'ser_bsa', 'u_anna', 'Kann ich machen, hab es zuhause.', iso(msgTimes.bsa[1]));
  insMsg.run('msg_b3', 'ser_bsa', 'u_helga', 'Wunderbar, bis Freitag!', iso(msgTimes.bsa[2]));
}

export function seedIfEmpty(db) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seed(db);
  return c === 0;
}
