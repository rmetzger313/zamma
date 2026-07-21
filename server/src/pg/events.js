// Events-Datenzugriff (Postgres). Bewusst batch-orientiert: Der Feed kommt in
// EINER Abfrage inklusive Host-Daten, Teilnehmerzahl und eigener Teilnahme.
// Die alte SQLite-Fassung lud Host und Teilnehmer pro Event einzeln — im selben
// Prozess vernachlässigbar, gegen Supabase jedoch ein Netzwerk-Roundtrip je
// Event (20 Events ≈ 60 Roundtrips).
//
// PostGIS-Funktionen werden explizit als extensions.ST_* qualifiziert, weil im
// Transaction-Pooling der search_path nicht zuverlässig haftet.
import { many, one } from '../db-pg.js';

// Host-Spalten, die für Anzeige und Sortierung gebraucht werden
const HOST_COLUMNS = `
  h.name as host_name,
  h.avatar_color as host_avatar_color,
  h.reliability_score as host_reliability_score,
  h.meetings_attended as host_meetings_attended,
  h.verified_phone as host_verified_phone,
  h.verified_id as host_verified_id,
  h.no_show_count as host_no_show_count`;

// Umkreis des Nutzers: gespeicherte Orte, sonst Fallback auf den Profil-Standort
// mit Default-Radius (25 km) — entspricht der Logik aus geo.js.
const MY_LOCATIONS_CTE = `
  with my_locs as (
    select l.location, l.radius_km
      from public.user_locations l
     where l.user_id = $1
    union all
    select u.location, 25::numeric
      from public.users u
     where u.id = $1
       and u.location is not null
       and not exists (select 1 from public.user_locations l2 where l2.user_id = $1)
  )`;

// Feed: kommende, nicht abgesagte Events im Umkreis, Hosts nicht blockiert.
// Sortierung (Demotion, „Passt zu dir", eigene neue Events) passiert in der
// Anwendungsschicht, weil sie Hobby-/Verifizierungsregeln nutzt, die dort
// getestet sind. limit begrenzt die Ergebnismenge defensiv.
export async function listFeed(userId, { category = null, limit = 100 } = {}) {
  return many(
    `${MY_LOCATIONS_CTE}
     select e.id, e.series_id, e.host_id, e.title, e.category, e.description,
            e.skill_level, e.datetime, e.duration_min, e.recurrence,
            e.location_name, e.city, e.dist_label_override, e.max_spots,
            e.status, e.created_at,
            ${HOST_COLUMNS},
            1 + (select count(*) from public.participations p
                  where p.event_id = e.id and p.status in ('joined','attended')) as joined_count,
            mp.status as my_status,
            (select min(extensions.ST_Distance(e.location, ml.location)) from my_locs ml) as distance_m
       from public.events e
       join public.users h on h.id = e.host_id
       left join public.participations mp on mp.event_id = e.id and mp.user_id = $1
      where e.status in ('open','full')
        and e.datetime + make_interval(mins => e.duration_min) > now()
        and not exists (select 1 from public.blocks b
                         where b.user_id = $1 and b.blocked_id = e.host_id)
        and ($2::text is null or e.category = $2)
        and exists (select 1 from my_locs ml
                     where extensions.ST_DWithin(e.location, ml.location, ml.radius_km * 1000))
      order by e.datetime asc
      limit $3`,
    [userId, category, limit]
  );
}

// Einzelnes Event samt Host, Zähler, eigener Teilnahme und Distanz.
export async function getEventForUser(eventId, userId) {
  return one(
    `${MY_LOCATIONS_CTE}
     select e.id, e.series_id, e.host_id, e.title, e.category, e.description,
            e.skill_level, e.datetime, e.duration_min, e.recurrence,
            e.location_name, e.city, e.dist_label_override, e.max_spots,
            e.status, e.created_at,
            ${HOST_COLUMNS},
            1 + (select count(*) from public.participations p
                  where p.event_id = e.id and p.status in ('joined','attended')) as joined_count,
            mp.status as my_status,
            (select min(extensions.ST_Distance(e.location, ml.location)) from my_locs ml) as distance_m
       from public.events e
       join public.users h on h.id = e.host_id
       left join public.participations mp on mp.event_id = e.id and mp.user_id = $1
      where e.id = $2`,
    [userId, eventId]
  );
}

// Teilnehmerliste — nur für den Detail-Screen nötig, nicht für den Feed.
// Nimmt ein Array von Event-IDs entgegen, damit mehrere Events in einer
// Abfrage bedient werden können (kein N+1).
export async function listParticipants(eventIds) {
  if (!eventIds?.length) return [];
  return many(
    `select p.event_id, u.id, u.name, u.avatar_color
       from public.participations p
       join public.users u on u.id = p.user_id
      where p.event_id = any($1::uuid[])
        and p.status in ('joined','attended')
      order by p.joined_at asc nulls last`,
    [eventIds]
  );
}

// Aktuelle Teilnehmerzahl inkl. Host (für Kapazitätsprüfungen)
export async function countJoined(eventId, client = null) {
  const row = await one(
    `select 1 + count(*)::int as joined
       from public.participations
      where event_id = $1 and status in ('joined','attended')`,
    [eventId],
    client
  );
  return row.joined;
}
