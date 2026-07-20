import { Router } from 'express';
import { getUser, getHobbies } from '../repo.js';
import { meUser, publicUser } from '../serialize.js';
import { MONTHS, initials } from '../format.js';
import { MEETINGS_REQUIRED } from '../logic/verification.js';
import { suggestions } from '../logic/suggest.js';
import { computeBadges } from '../logic/badges.js';

function monthYear(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function recentFeedbackAbout(db, userId, limit = 3) {
  return db
    .prepare(`SELECT f.*, u.name, u.avatarColor FROM feedback f JOIN users u ON u.id = f.fromUserId
      WHERE f.aboutUserId = ? ORDER BY f.createdAt DESC LIMIT ?`)
    .all(userId, limit)
    .map((f) => ({
      fromName: f.name,
      fromInitials: initials(f.name),
      fromColor: f.avatarColor,
      stars: f.stars,
      starsLabel: '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars),
      text: f.comment,
      createdAt: f.createdAt,
    }));
}

export function verificationSteps(db, user) {
  const meetingsOk = user.meetingsAttended >= MEETINGS_REQUIRED;
  return [
    {
      key: 'phone',
      done: !!user.verifiedPhone,
      title: user.verifiedPhone ? 'Telefonnummer bestätigt' : 'Telefonnummer bestätigen',
      sub: user.verifiedPhone ? `SMS-Code · ${monthYear(user.verifiedPhoneAt) ?? 'bestätigt'}` : 'Kurzer SMS-Code an deine Nummer',
    },
    {
      key: 'ident',
      done: !!user.verifiedId,
      title: user.verifiedId ? 'Ausweis geprüft' : 'Ausweis prüfen lassen',
      sub: user.verifiedId ? `Video-Ident · ${monthYear(user.verifiedIdAt) ?? 'bestätigt'}` : 'Video-Ident, dauert ca. 5 Minuten',
    },
    {
      key: 'meetings',
      done: meetingsOk,
      title: meetingsOk ? '3 Treffen ohne No-Show' : `${user.meetingsAttended} von 3 Treffen ohne No-Show`,
      sub: meetingsOk ? 'Bestätigt durch Feedback anderer Mitglieder' : 'Nimm an Treffen teil und erscheine zuverlässig',
    },
  ];
}

// Konto löschen: eigene Inhalte werden entfernt, das Profil anonymisiert
// (Event-Historie bleibt referenzintakt), zukünftige gehostete Events werden
// abgesagt und die Gruppen benachrichtigt.
export function deleteAccount(db, userId, notify = () => {}) {
  const me = getUser(db, userId);
  db.exec('BEGIN');
  let hosted;
  try {
    hosted = db
      .prepare("SELECT * FROM events WHERE hostId = ? AND status IN ('open','full')")
      .all(userId);
    for (const event of hosted) {
      db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(event.id);
    }
    db.prepare('DELETE FROM chat_messages WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM chat_members WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM participations WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM feedback WHERE fromUserId = ? OR aboutUserId = ?').run(userId, userId);
    db.prepare('DELETE FROM notifications WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM user_hobbies WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM user_locations WHERE userId = ?').run(userId);
    db.prepare(`UPDATE users SET name = 'Gelöschtes Profil', avatarColor = '#a99a85',
        city = NULL, lat = NULL, lng = NULL, bio = NULL, photo = NULL,
        verifiedPhone = 0, verifiedPhoneAt = NULL, verifiedId = 0, verifiedIdAt = NULL,
        avgRating = NULL WHERE id = ?`).run(userId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // Benachrichtigungen erst nach dem Commit (kein Push bei Rollback)
  for (const event of hosted) {
    const members = db.prepare('SELECT userId FROM chat_members WHERE seriesId = ? AND userId != ?')
      .all(event.seriesId, userId);
    for (const m of members) {
      notify(db, m.userId, 'cancel', { eventId: event.id, title: event.title, user: me.name, byHost: true });
    }
  }
}

export function usersRouter(db, notify = () => {}) {
  const r = Router();

  r.get('/me', (req, res) => {
    const user = getUser(db, req.userId);
    if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    const payload = meUser(user, getHobbies(db, user.id), recentFeedbackAbout(db, user.id));
    payload.verificationSteps = verificationSteps(db, user);
    res.json(payload);
  });

  // Onboarding: Hobby-Auswahl speichern (Level optional, Default 1)
  r.put('/me/hobbies', (req, res) => {
    const hobbies = req.body?.hobbies;
    if (!Array.isArray(hobbies) || hobbies.length === 0)
      return res.status(400).json({ error: 'Mindestens ein Hobby wählen' });
    const parsed = hobbies.map((h) => ({
      name: typeof h === 'string' ? h : h?.name,
      skillLevel: typeof h === 'object' && h?.skillLevel != null ? h.skillLevel : 1,
    }));
    for (const { name, skillLevel } of parsed) {
      if (typeof name !== 'string' || !name.trim() || name.length > 40)
        return res.status(400).json({ error: 'Ungültiger Hobby-Name' });
      if (![1, 2, 3].includes(skillLevel))
        return res.status(400).json({ error: 'Skill-Level muss 1–3 sein' });
    }
    db.prepare('DELETE FROM user_hobbies WHERE userId = ?').run(req.userId);
    const ins = db.prepare('INSERT OR IGNORE INTO user_hobbies (userId, hobby, skillLevel) VALUES (?, ?, ?)');
    for (const { name, skillLevel } of parsed) ins.run(req.userId, name.trim(), skillLevel);
    res.json({ ok: true });
  });

  // Smart Suggestions: ähnliche Hobbys zu den eigenen
  r.get('/me/suggestions', (req, res) => {
    res.json(suggestions(getHobbies(db, req.userId)));
  });

  // Badges & Meilensteine (abgeleitet)
  r.get('/me/badges', (req, res) => {
    res.json(computeBadges(db, req.userId));
  });

  // Konto löschen (DSGVO/Store-Anforderung)
  r.delete('/me', (req, res) => {
    const me = getUser(db, req.userId);
    if (!me) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    deleteAccount(db, req.userId, notify);
    res.json({ ok: true });
  });

  r.get('/:id', (req, res) => {
    const user = getUser(db, req.params.id);
    if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    res.json(publicUser(user));
  });

  return r;
}
