// Nutzer-Datenzugriff (Postgres): Profil, Hobbys, Orte, Verfügbarkeit,
// Feedback-Historie und die DSGVO-Konto-Löschung.
//
// Hobbys werden für mehrere Nutzer gebündelt geladen (listHobbiesFor), weil
// das Leute-Matching sonst pro Kandidat eine eigene Abfrage bräuchte.
import { one, many, run, tx } from '../db-pg.js';

export async function getUser(userId, client = null) {
  return one(
    `select id, name, avatar_color, photo, city, bio, join_date,
            verified_phone, verified_phone_at, verified_id, verified_id_at,
            reliability_score, meetings_attended, avg_rating, no_show_count,
            extensions.ST_Y(location::geometry) as lat,
            extensions.ST_X(location::geometry) as lng
       from public.users where id = $1`,
    [userId],
    client
  );
}

export async function getHobbies(userId, client = null) {
  return many(
    `select hobby, skill_level
       from public.user_hobbies
      where user_id = $1
      order by position, hobby`,
    [userId],
    client
  );
}

// Gebündelt für viele Nutzer — verhindert N+1 im Matching.
// Liefert eine Map userId -> [{hobby, skillLevel}].
export async function listHobbiesFor(userIds) {
  if (!userIds?.length) return new Map();
  const rows = await many(
    `select user_id, hobby, skill_level
       from public.user_hobbies
      where user_id = any($1::uuid[])
      order by user_id, position, hobby`,
    [userIds]
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.userId)) map.set(r.userId, []);
    map.get(r.userId).push({ hobby: r.hobby, skillLevel: r.skillLevel });
  }
  return map;
}

// Ersetzt die Hobby-Auswahl vollständig; position hält die gewählte Reihenfolge.
export async function setHobbies(userId, hobbies) {
  await tx(async (client) => {
    await run('delete from public.user_hobbies where user_id = $1', [userId], client);
    for (const [i, h] of hobbies.entries()) {
      await run(
        `insert into public.user_hobbies (user_id, hobby, skill_level, position)
         values ($1, $2, $3, $4)
         on conflict (user_id, hobby) do nothing`,
        [userId, h.name, h.skillLevel, i],
        client
      );
    }
  });
}

export async function getLocations(userId, client = null) {
  return many(
    `select name, radius_km, is_primary,
            extensions.ST_Y(location::geometry) as lat,
            extensions.ST_X(location::geometry) as lng
       from public.user_locations
      where user_id = $1
      order by is_primary desc, name`,
    [userId],
    client
  );
}

export async function getAvailability(userId, client = null) {
  const rows = await many(
    'select kind, value from public.user_availability where user_id = $1',
    [userId],
    client
  );
  const has = (kind, value) => rows.some((r) => r.kind === kind && r.value === value);
  return {
    days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].filter((d) => has('day', d)),
    slots: ['morning', 'afternoon', 'evening'].filter((s) => has('slot', s)),
  };
}

export async function setAvailability(userId, { days, slots }) {
  await tx(async (client) => {
    await run('delete from public.user_availability where user_id = $1', [userId], client);
    for (const d of days) {
      await run(
        `insert into public.user_availability (user_id, kind, value) values ($1, 'day', $2)
         on conflict do nothing`,
        [userId, d],
        client
      );
    }
    for (const s of slots) {
      await run(
        `insert into public.user_availability (user_id, kind, value) values ($1, 'slot', $2)
         on conflict do nothing`,
        [userId, s],
        client
      );
    }
  });
}

export async function getRecentFeedbackAbout(userId, limit = 3) {
  return many(
    `select f.stars, f.comment, f.created_at,
            u.name as from_name, u.avatar_color as from_color
       from public.feedback f
       join public.users u on u.id = f.from_user_id
      where f.about_user_id = $1
      order by f.created_at desc
      limit $2`,
    [userId, limit]
  );
}

// Konto löschen (DSGVO): eigene Inhalte entfernen, Profil anonymisieren,
// zukünftige gehostete Events absagen. Alles in EINER Transaktion — bei einem
// Fehler bleibt nichts halb gelöscht zurück.
// Gibt die abgesagten Events zurück, damit die Gruppen benachrichtigt werden
// können (bewusst NACH dem Commit, nicht innerhalb).
export async function deleteAccount(userId) {
  return tx(async (client) => {
    const hosted = await many(
      `select id, series_id, title from public.events
        where host_id = $1 and status in ('open','full')`,
      [userId],
      client
    );
    await run(
      `update public.events set status = 'cancelled'
        where host_id = $1 and status in ('open','full')`,
      [userId],
      client
    );
    await run('delete from public.chat_messages where user_id = $1', [userId], client);
    await run('delete from public.chat_members where user_id = $1', [userId], client);
    await run('delete from public.participations where user_id = $1', [userId], client);
    await run(
      'delete from public.feedback where from_user_id = $1 or about_user_id = $1',
      [userId],
      client
    );
    await run('delete from public.notifications where user_id = $1', [userId], client);
    await run('delete from public.user_hobbies where user_id = $1', [userId], client);
    await run('delete from public.user_locations where user_id = $1', [userId], client);
    await run('delete from public.user_availability where user_id = $1', [userId], client);
    await run('delete from public.blocks where user_id = $1 or blocked_id = $1', [userId], client);
    await run(
      `update public.users
          set name = 'Gelöschtes Profil', avatar_color = '#A8A29E',
              city = null, location = null, bio = null, photo = null,
              verified_phone = false, verified_phone_at = null,
              verified_id = false, verified_id_at = null, avg_rating = null
        where id = $1`,
      [userId],
      client
    );
    return hosted;
  });
}
