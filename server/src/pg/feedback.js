// Feedback nach Treffen — Kern des Anti-Timewaster-Systems.
//
// Die SQLite-Fassung ermittelte offene Bewertungen über eine Schleife: alle
// Kandidaten laden, dann pro Event Fenster prüfen und nachsehen, ob schon
// bewertet wurde. Hier erledigt das eine Abfrage.
//
// Fachregeln unverändert: Fenster öffnet nach Event-Ende, schließt nach
// 7 Tagen, 1× pro Teilnehmer-Paar, nur über Beteiligte, No-Show wirkt genau
// einmal je (Event, Nutzer) und nimmt den Anwesenheits-Bonus zurück.
import { one, many, run, tx } from '../db-pg.js';
import { NO_SHOW_PENALTY, ATTEND_BONUS, clampScore } from '../logic/score.js';

export async function listPending(userId) {
  return many(
    `select e.id as event_id, e.title, e.datetime, e.city, e.series_id, e.host_id,
            h.name as host_name,
            g.initials as group_initials, g.color as group_color
       from public.events e
       join public.users h on h.id = e.host_id
       left join public.chat_groups g on g.series_id = e.series_id
       left join public.participations p on p.event_id = e.id and p.user_id = $1
      where e.status = 'past'
        and (p.status in ('joined','attended') or e.host_id = $1)
        and e.datetime + make_interval(mins => e.duration_min) <= now()
        and e.datetime + make_interval(mins => e.duration_min) + interval '7 days' > now()
        and not exists (select 1 from public.feedback f
                         where f.event_id = e.id and f.from_user_id = $1)
      order by e.datetime desc`,
    [userId]
  );
}

// Ist jemand am Event beteiligt (Host oder Teilnahme-Zeile, auch abgesagt)?
async function isInvolved(eventId, userId, hostId, client) {
  if (userId === hostId) return true;
  const p = await one(
    'select 1 as ok from public.participations where event_id = $1 and user_id = $2',
    [eventId, userId],
    client
  );
  return !!p;
}

// No-Show wirkt genau einmal je (Event, bewerteter Nutzer) — egal wie viele
// Teilnehmende ihn melden. Nimmt zusätzlich den Anwesenheits-Bonus zurück,
// den der Tick beim Event-Ende pauschal vergeben hat.
async function confirmNoShow(eventId, aboutUserId, event, client) {
  const prior = await one(
    `select 1 as ok from public.feedback
      where event_id = $1 and about_user_id = $2 and tags ? 'no_show' limit 1`,
    [eventId, aboutUserId],
    client
  );
  if (prior) return false;

  const part = await one(
    'select status from public.participations where event_id = $1 and user_id = $2',
    [eventId, aboutUserId],
    client
  );
  const isHost = event.hostId === aboutUserId;
  const bonusGiven = part?.status === 'attended' || (isHost && event.status === 'past');

  const user = await one(
    'select reliability_score from public.users where id = $1 for update',
    [aboutUserId],
    client
  );
  const newScore = clampScore(
    user.reliabilityScore - NO_SHOW_PENALTY - (bonusGiven ? ATTEND_BONUS : 0)
  );
  await run(
    `update public.users
        set reliability_score = $1,
            no_show_count = no_show_count + 1,
            meetings_attended = greatest(0, meetings_attended - $2)
      where id = $3`,
    [newScore, bonusGiven ? 1 : 0, aboutUserId],
    client
  );
  if (part) {
    await run(
      "update public.participations set status = 'no_show' where event_id = $1 and user_id = $2",
      [eventId, aboutUserId],
      client
    );
  }
  return true;
}

export async function createFeedback({ eventId, fromUserId, aboutUserId, stars, tags = [], comment = null }) {
  return tx(async (client) => {
    const event = await one(
      `select id, host_id, status, datetime, duration_min, title
         from public.events where id = $1`,
      [eventId],
      client
    );
    if (!event) return { error: 'event_not_found' };
    if (event.status === 'cancelled') return { error: 'cancelled' };

    const endMs = new Date(event.datetime).getTime() + event.durationMin * 60_000;
    const now = Date.now();
    if (now < endMs) return { error: 'not_open' };
    if (now > endMs + 7 * 24 * 60 * 60 * 1000) return { error: 'closed' };

    const about = aboutUserId || event.hostId;
    if (about === fromUserId) return { error: 'self' };

    if (!(await isInvolved(eventId, fromUserId, event.hostId, client))) return { error: 'not_participant' };
    const target = await one('select 1 as ok from public.users where id = $1', [about], client);
    if (!target) return { error: 'user_not_found' };
    if (!(await isInvolved(eventId, about, event.hostId, client))) return { error: 'about_not_involved' };

    const dupe = await one(
      `select 1 as ok from public.feedback
        where event_id = $1 and from_user_id = $2 and about_user_id = $3`,
      [eventId, fromUserId, about],
      client
    );
    if (dupe) return { error: 'duplicate' };

    // No-Show VOR dem Insert, damit die Idempotenz-Prüfung nicht die eigene
    // gerade geschriebene Zeile sieht.
    if (tags.includes('no_show')) await confirmNoShow(eventId, about, event, client);

    const row = await one(
      `insert into public.feedback (event_id, from_user_id, about_user_id, stars, tags, comment)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       returning id`,
      [eventId, fromUserId, about, stars, JSON.stringify(tags), comment || null],
      client
    );

    const avg = await one(
      'select round(avg(stars)::numeric, 1) as avg from public.feedback where about_user_id = $1',
      [about],
      client
    );
    await run('update public.users set avg_rating = $1 where id = $2', [avg.avg, about], client);

    return { ok: true, id: row.id, aboutUserId: about, title: event.title };
  });
}
