// Zeitgesteuerte Regeln (minütlich):
// 1. Beendete Events abschließen: Teilnahme joined -> attended, +1 Score und
//    +1 Treffen für Teilnehmende UND Host, Event-Status -> past.
// 2. Recurrence: nächste Instanz der Serie anlegen (idempotent, überspringt
//    verpasste Termine nach Ausfallzeiten).
// 3. Feedback-Erinnerung 2 h nach Event-Ende, genau einmal je Person/Event.
//
// Die SQLite-Fassung arbeitete das in verschachtelten Schleifen ab (pro Event
// pro Teilnehmer eine Abfrage). Hier erledigen mengenbasierte Statements den
// Großteil; nur die Recurrence-Berechnung bleibt in JS, weil sie die
// DST-sichere Kalenderlogik aus logic/recurrence.js nutzt.
import { one, many, run, tx } from '../db-pg.js';
import { nextOccurrence } from '../logic/recurrence.js';

// Events, die vorbei sind, aber noch nicht abgeschlossen wurden
export async function findEndedEvents() {
  return many(
    `select id, series_id, host_id, recurrence, datetime, duration_min
       from public.events
      where status in ('open','full')
        and datetime + make_interval(mins => duration_min) <= now()
      order by datetime asc`
  );
}

// Schließt ein Event ab. Alles in einer Transaktion, damit Boni und
// Statuswechsel nicht auseinanderlaufen können (bei einem Absturz dazwischen
// hätte der Host sonst beim Neustart ein zweites Mal +1 bekommen).
export async function completeEvent(eventId) {
  return tx(async (client) => {
    const ev = await one(
      `select id, host_id, status from public.events where id = $1 for update`,
      [eventId],
      client
    );
    if (!ev || !['open', 'full'].includes(ev.status)) return { skipped: true };

    // Bonus für alle, die als 'joined' eingetragen sind — mengenbasiert
    await run(
      `update public.users u
          set reliability_score = least(100, u.reliability_score + 1),
              meetings_attended = u.meetings_attended + 1
         from public.participations p
        where p.user_id = u.id and p.event_id = $1 and p.status = 'joined'`,
      [eventId],
      client
    );
    await run(
      `update public.participations set status = 'attended'
        where event_id = $1 and status = 'joined'`,
      [eventId],
      client
    );
    // Der Host zählt überall als Teilnehmer und bekommt denselben Bonus
    await run(
      `update public.users
          set reliability_score = least(100, reliability_score + 1),
              meetings_attended = meetings_attended + 1
        where id = $1`,
      [ev.hostId],
      client
    );
    await run("update public.events set status = 'past' where id = $1", [eventId], client);
    return { ok: true };
  });
}

// Legt die nächste Instanz einer Serie an — nur wenn es noch keine zukünftige
// gibt. Überspringt verpasste Termine, falls der Dienst länger stand.
export async function ensureNextInstance(seriesId, nowMs = Date.now()) {
  return tx(async (client) => {
    const future = await one(
      'select 1 as ok from public.events where series_id = $1 and datetime > now() limit 1',
      [seriesId],
      client
    );
    if (future) return { skipped: true };

    const latest = await one(
      `select id, series_id, host_id, title, category, description, skill_level,
              datetime, duration_min, recurrence, location_name, city,
              dist_label_override, max_spots,
              extensions.ST_Y(location::geometry) as lat,
              extensions.ST_X(location::geometry) as lng
         from public.events
        where series_id = $1
        order by datetime desc
        limit 1`,
      [seriesId],
      client
    );
    if (!latest?.recurrence) return { skipped: true };

    let datetime = latest.datetime;
    let guard = 0;
    do {
      datetime = nextOccurrence(datetime, latest.recurrence);
      guard += 1;
    } while (new Date(datetime).getTime() <= nowMs && guard < 520); // max ~10 Jahre

    const row = await one(
      `insert into public.events
         (series_id, host_id, title, category, description, skill_level, datetime,
          duration_min, recurrence, location_name, city, location,
          dist_label_override, max_spots, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               case when $12::float8 is null then null
                    else extensions.ST_SetSRID(extensions.ST_MakePoint($13, $12), 4326)::extensions.geography end,
               $14, $15, 'open')
       returning id, datetime`,
      [latest.seriesId, latest.hostId, latest.title, latest.category, latest.description,
        latest.skillLevel, datetime, latest.durationMin, latest.recurrence,
        latest.locationName, latest.city, latest.lat, latest.lng,
        latest.distLabelOverride, latest.maxSpots],
      client
    );
    return { ok: true, ...row };
  });
}

// Wer braucht eine Feedback-Erinnerung? Eine Abfrage statt verschachtelter
// Schleifen: beendete Events im offenen Fenster, Teilnehmende UND Host,
// die noch nicht bewertet haben und noch keine Erinnerung bekamen.
export async function findFeedbackReminders() {
  return many(
    `select e.id as event_id, e.title, x.user_id
       from public.events e
       cross join lateral (
         select p.user_id from public.participations p
          where p.event_id = e.id and p.status = 'attended'
          union
         select e.host_id
       ) x
      where e.status = 'past'
        and e.datetime + make_interval(mins => e.duration_min) + interval '2 hours' <= now()
        and e.datetime + make_interval(mins => e.duration_min) + interval '7 days' > now()
        and not exists (select 1 from public.feedback f
                         where f.event_id = e.id and f.from_user_id = x.user_id)
        and not exists (select 1 from public.notifications n
                         where n.user_id = x.user_id
                           and n.type = 'feedback_reminder'
                           and n.payload->>'eventId' = e.id::text)`
  );
}

export async function createNotification(userId, type, payload) {
  return one(
    `insert into public.notifications (user_id, type, payload)
     values ($1, $2, $3::jsonb) returning id, created_at`,
    [userId, type, JSON.stringify(payload)]
  );
}
