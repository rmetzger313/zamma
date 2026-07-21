// Gruppenchat je Event-Serie.
//
// Zwei Verbesserungen gegenüber der SQLite-Fassung:
// 1. Die Chat-Liste kam dort über eine Schleife zustande (pro Gruppe je eine
//    Abfrage für letzte Nachricht, Ungelesen-Zahl und Teilnehmerzahl). Hier
//    liefert EINE Abfrage alles, per LATERAL für die jeweils letzte Nachricht.
// 2. Der Thread lud ausnahmslos alle Nachrichten. Jetzt seitenweise über
//    `before` (Cursor auf created_at), damit lange Verläufe nicht das
//    Handy-Gedächtnis sprengen.
//
// Nachrichten blockierter Nutzer werden konsequent ausgeblendet — auch in der
// Vorschau der Chat-Liste, nicht nur im Thread.
import { one, many, run } from '../db-pg.js';

export async function listChats(userId) {
  return many(
    `select g.series_id, g.name, g.initials, g.color,
            m.last_read_at,
            (select count(*)::int from public.chat_members cm
              where cm.series_id = g.series_id) as member_count,
            lm.text as last_text, lm.created_at as last_at, lm.user_id as last_user_id,
            (select count(*)::int from public.chat_messages x
              where x.series_id = g.series_id
                and x.user_id <> $1
                and x.created_at > coalesce(m.last_read_at, 'epoch'::timestamptz)
                and not exists (select 1 from public.blocks b
                                 where b.user_id = $1 and b.blocked_id = x.user_id)
            ) as unread,
            (select min(e.datetime) from public.events e
              where e.series_id = g.series_id and e.status in ('open','full')) as next_datetime,
            (select max(e.datetime) from public.events e
              where e.series_id = g.series_id) as last_datetime
       from public.chat_groups g
       join public.chat_members m on m.series_id = g.series_id and m.user_id = $1
       left join lateral (
         select cm2.text, cm2.created_at, cm2.user_id
           from public.chat_messages cm2
          where cm2.series_id = g.series_id
            and not exists (select 1 from public.blocks b
                             where b.user_id = $1 and b.blocked_id = cm2.user_id)
          order by cm2.created_at desc
          limit 1
       ) lm on true
      where lm.created_at is not null
      order by lm.created_at desc`,
    [userId]
  );
}

export async function getGroup(seriesId) {
  return one(
    'select series_id, name, initials, color from public.chat_groups where series_id = $1',
    [seriesId]
  );
}

export async function isMember(seriesId, userId) {
  const row = await one(
    'select 1 as ok from public.chat_members where series_id = $1 and user_id = $2',
    [seriesId, userId]
  );
  return !!row;
}

// Nachrichten seitenweise, neueste zuerst geladen und für die Anzeige
// chronologisch zurückgedreht. `before` ist ein created_at-Cursor.
export async function listMessages(seriesId, userId, { limit = 50, before = null } = {}) {
  const rows = await many(
    `select m.id, m.text, m.created_at, m.user_id,
            u.name, u.avatar_color
       from public.chat_messages m
       join public.users u on u.id = m.user_id
      where m.series_id = $1
        and not exists (select 1 from public.blocks b
                         where b.user_id = $2 and b.blocked_id = m.user_id)
        and ($4::timestamptz is null or m.created_at < $4)
      order by m.created_at desc
      limit $3`,
    [seriesId, userId, limit, before]
  );
  return rows.reverse();
}

export async function sendMessage(seriesId, userId, text) {
  const row = await one(
    `insert into public.chat_messages (series_id, user_id, text)
     values ($1, $2, $3)
     returning id, text, created_at, user_id`,
    [seriesId, userId, text]
  );
  await markRead(seriesId, userId);
  return row;
}

export async function markRead(seriesId, userId) {
  return run(
    'update public.chat_members set last_read_at = now() where series_id = $1 and user_id = $2',
    [seriesId, userId]
  );
}

export async function listOtherMembers(seriesId, userId) {
  return many(
    'select user_id from public.chat_members where series_id = $1 and user_id <> $2',
    [seriesId, userId]
  );
}

export async function createGroup({ seriesId, name, initials, color, ownerId }) {
  await run(
    `insert into public.chat_groups (series_id, name, initials, color)
     values ($1, $2, $3, $4) on conflict (series_id) do nothing`,
    [seriesId, name, initials, color]
  );
  await run(
    `insert into public.chat_members (series_id, user_id, last_read_at)
     values ($1, $2, now()) on conflict do nothing`,
    [seriesId, ownerId]
  );
}
