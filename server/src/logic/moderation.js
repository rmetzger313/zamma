// Trust & Safety: Blockieren und Melden.
// Blocks wirken auf Event-Feed (Host geblockt), Leute-Matching und
// Chat-Nachrichten (Nachrichten Geblockter werden ausgeblendet).

import { makeId } from '../db.js';

export const REPORT_REASONS = ['spam', 'harassment', 'fake', 'other'];

export function blockUser(db, userId, blockedId) {
  if (userId === blockedId) {
    const err = new Error('Du kannst dich nicht selbst blockieren');
    err.status = 400;
    throw err;
  }
  if (!db.prepare('SELECT 1 x FROM users WHERE id = ?').get(blockedId)) {
    const err = new Error('Nutzer nicht gefunden');
    err.status = 404;
    throw err;
  }
  db.prepare('INSERT OR IGNORE INTO blocks (userId, blockedId, createdAt) VALUES (?, ?, ?)')
    .run(userId, blockedId, new Date().toISOString());
}

export function unblockUser(db, userId, blockedId) {
  db.prepare('DELETE FROM blocks WHERE userId = ? AND blockedId = ?').run(userId, blockedId);
}

export function getBlockedIds(db, userId) {
  return new Set(
    db.prepare('SELECT blockedId FROM blocks WHERE userId = ?').all(userId).map((b) => b.blockedId)
  );
}

export function createReport(db, fromUserId, { targetType, targetId, reason }) {
  if (!['user', 'event', 'message'].includes(targetType ?? '')) {
    const err = new Error('Ungültiger Melde-Typ');
    err.status = 400;
    throw err;
  }
  if (!targetId || !REPORT_REASONS.includes(reason ?? '')) {
    const err = new Error('Ziel und Grund erforderlich');
    err.status = 400;
    throw err;
  }
  const id = makeId('rep');
  db.prepare('INSERT INTO reports (id, fromUserId, targetType, targetId, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, fromUserId, targetType, targetId, reason, new Date().toISOString());
  // Moderations-Stub: in Produktion Queue/Dashboard, hier Log
  console.log(`[moderation] Report ${id}: ${targetType}/${targetId} (${reason}) von ${fromUserId}`);
  return id;
}
