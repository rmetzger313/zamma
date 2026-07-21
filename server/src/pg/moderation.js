// Trust & Safety: Blockieren und Melden.
// Blocks wirken auf Event-Feed, Leute-Matching und Chat (dort in den jeweiligen
// Repositories als `not exists`-Filter eingebaut).
import { one, many, run } from '../db-pg.js';

export async function getBlockedIds(userId) {
  const rows = await many('select blocked_id from public.blocks where user_id = $1', [userId]);
  return new Set(rows.map((r) => r.blockedId));
}

export async function blockUser(userId, blockedId) {
  if (userId === blockedId) return { error: 'self' };
  const target = await one('select 1 as ok from public.users where id = $1', [blockedId]);
  if (!target) return { error: 'not_found' };
  await run(
    `insert into public.blocks (user_id, blocked_id) values ($1, $2)
     on conflict do nothing`,
    [userId, blockedId]
  );
  return { ok: true };
}

export async function unblockUser(userId, blockedId) {
  await run('delete from public.blocks where user_id = $1 and blocked_id = $2', [userId, blockedId]);
  return { ok: true };
}

// Meldung anlegen. status='open' — Grundlage für das Moderations-Backoffice,
// das die EU-DSA-Meldewege bedienen muss.
export async function createReport(fromUserId, { targetType, targetId, reason }) {
  const row = await one(
    `insert into public.reports (from_user_id, target_type, target_id, reason)
     values ($1, $2, $3, $4) returning id, status, created_at`,
    [fromUserId, targetType, targetId, reason]
  );
  return { ok: true, ...row };
}

// Für das spätere Backoffice: offene Meldungen, älteste zuerst.
export async function listOpenReports({ limit = 50 } = {}) {
  return many(
    `select r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at,
            u.name as from_name
       from public.reports r
       join public.users u on u.id = r.from_user_id
      where r.status in ('open','reviewing')
      order by r.created_at asc
      limit $1`,
    [limit]
  );
}
