import { Router } from 'express';
import { makeId } from '../db.js';
import { getUser } from '../repo.js';
import { whenLabel, slotLabel, initials } from '../format.js';
import { getBlockedIds } from '../logic/moderation.js';

function groupSub(db, seriesId) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM chat_members WHERE seriesId = ?').get(seriesId);
  const next = db
    .prepare(`SELECT datetime FROM events WHERE seriesId = ? AND status IN ('open','full')
      ORDER BY datetime ASC LIMIT 1`)
    .get(seriesId);
  const last = next || db
    .prepare('SELECT datetime FROM events WHERE seriesId = ? ORDER BY datetime DESC LIMIT 1')
    .get(seriesId);
  return `${c} Teilnehmer${last ? ` · ${slotLabel(last.datetime)}` : ''}`;
}

export function chatsRouter(db, notify, broadcast) {
  const r = Router();

  r.get('/', (req, res) => {
    const nowMs = Date.now();
    const groups = db
      .prepare(`SELECT g.*, m.lastReadAt FROM chat_groups g
        JOIN chat_members m ON m.seriesId = g.seriesId AND m.userId = ?`)
      .all(req.userId);
    const list = groups
      .map((g) => {
        const lastMsg = db
          .prepare('SELECT * FROM chat_messages WHERE seriesId = ? ORDER BY createdAt DESC LIMIT 1')
          .get(g.seriesId);
        const unread = db
          .prepare(`SELECT COUNT(*) AS c FROM chat_messages
            WHERE seriesId = ? AND userId != ? AND createdAt > COALESCE(?, '')`)
          .get(g.seriesId, req.userId, g.lastReadAt).c;
        return {
          seriesId: g.seriesId,
          name: g.name,
          initials: g.initials,
          color: g.color,
          sub: groupSub(db, g.seriesId),
          lastMsg: lastMsg
            ? `${lastMsg.userId === req.userId ? 'Du: ' : ''}${lastMsg.text}`
            : 'Noch keine Nachrichten',
          whenLabel: lastMsg ? whenLabel(lastMsg.createdAt, nowMs) : '',
          lastAt: lastMsg?.createdAt ?? '',
          unread,
        };
      })
      .filter((g) => g.lastAt) // leere Gruppen erst nach der ersten Nachricht listen
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    res.json(list);
  });

  r.get('/:seriesId/messages', (req, res) => {
    const group = db.prepare('SELECT * FROM chat_groups WHERE seriesId = ?').get(req.params.seriesId);
    if (!group) return res.status(404).json({ error: 'Chat nicht gefunden' });
    const member = db.prepare('SELECT * FROM chat_members WHERE seriesId = ? AND userId = ?')
      .get(req.params.seriesId, req.userId);
    if (!member) return res.status(403).json({ error: 'Kein Mitglied dieser Gruppe' });
    const blocked = getBlockedIds(db, req.userId);
    const messages = db
      .prepare('SELECT * FROM chat_messages WHERE seriesId = ? ORDER BY createdAt ASC')
      .all(req.params.seriesId)
      .filter((m) => !blocked.has(m.userId))
      .map((m) => {
        const u = getUser(db, m.userId);
        return {
          id: m.id,
          who: u.name,
          initials: initials(u.name), // Wortinitialen: "Jonas K." → "JK" (wie Prototyp)
          color: u.avatarColor,
          text: m.text,
          mine: m.userId === req.userId,
          createdAt: m.createdAt,
        };
      });
    // Icebreaker: gemeinsame Hobbys mit dem Host der Serie („Ihr teilt: …")
    const latest = db
      .prepare('SELECT hostId FROM events WHERE seriesId = ? ORDER BY datetime DESC LIMIT 1')
      .get(req.params.seriesId);
    let sharedHobbies = [];
    if (latest && latest.hostId !== req.userId) {
      const mine = new Set(
        db.prepare('SELECT hobby FROM user_hobbies WHERE userId = ?').all(req.userId).map((h) => h.hobby)
      );
      sharedHobbies = db
        .prepare('SELECT hobby FROM user_hobbies WHERE userId = ? ORDER BY rowid')
        .all(latest.hostId)
        .map((h) => h.hobby)
        .filter((h) => mine.has(h));
    }
    res.json({
      seriesId: group.seriesId,
      name: group.name,
      initials: group.initials,
      color: group.color,
      sub: groupSub(db, group.seriesId),
      sharedHobbies,
      messages,
    });
  });

  r.post('/:seriesId/messages', (req, res) => {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'Leere Nachricht' });
    const member = db.prepare('SELECT * FROM chat_members WHERE seriesId = ? AND userId = ?')
      .get(req.params.seriesId, req.userId);
    if (!member) return res.status(403).json({ error: 'Kein Mitglied dieser Gruppe' });
    const now = new Date().toISOString();
    const id = makeId('msg');
    db.prepare('INSERT INTO chat_messages (id, seriesId, userId, text, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.seriesId, req.userId, text, now);
    db.prepare('UPDATE chat_members SET lastReadAt = ? WHERE seriesId = ? AND userId = ?')
      .run(now, req.params.seriesId, req.userId);
    const me = getUser(db, req.userId);
    const others = db.prepare('SELECT userId FROM chat_members WHERE seriesId = ? AND userId != ?')
      .all(req.params.seriesId, req.userId);
    for (const o of others) notify(db, o.userId, 'chat', { seriesId: req.params.seriesId, from: me.name, text });
    const message = { id, who: me.name, initials: initials(me.name), color: me.avatarColor,
      text, mine: false, createdAt: now };
    broadcast(others.map((o) => o.userId), { type: 'chat:message', seriesId: req.params.seriesId, message });
    res.status(201).json({ ...message, mine: true });
  });

  r.post('/:seriesId/read', (req, res) => {
    db.prepare('UPDATE chat_members SET lastReadAt = ? WHERE seriesId = ? AND userId = ?')
      .run(new Date().toISOString(), req.params.seriesId, req.userId);
    res.json({ ok: true });
  });

  return r;
}
