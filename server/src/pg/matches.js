// Leute-Matching: Kandidaten im Umkreis, Bewertung über gemeinsame Hobbys.
//
// Zwei Abfragen statt N+1: erst die Kandidaten (PostGIS-Umkreis, Blocks
// gefiltert), dann alle Hobbys der Kandidaten gebündelt. Die eigentliche
// Kompatibilitätsrechnung bleibt in logic/match.js — pure Funktion, getestet.
import { many } from '../db-pg.js';

export async function listCandidates(userId, { limit = 100 } = {}) {
  return many(
    `with my_locs as (
       select l.location, l.radius_km
         from public.user_locations l
        where l.user_id = $1
       union all
       select u.location, 25::numeric
         from public.users u
        where u.id = $1 and u.location is not null
          and not exists (select 1 from public.user_locations l2 where l2.user_id = $1)
     )
     select u.id, u.name, u.avatar_color, u.city,
            u.reliability_score, u.meetings_attended,
            u.verified_phone, u.verified_id, u.no_show_count,
            (select min(extensions.ST_Distance(u.location, ml.location)) from my_locs ml) as distance_m
       from public.users u
      where u.id <> $1
        and u.location is not null
        and exists (select 1 from public.user_hobbies h where h.user_id = u.id)
        and not exists (select 1 from public.blocks b
                         where b.user_id = $1 and b.blocked_id = u.id)
        and exists (select 1 from my_locs ml
                     where extensions.ST_DWithin(u.location, ml.location, ml.radius_km * 1000))
      limit $2`,
    [userId, limit]
  );
}
