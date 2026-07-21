// Teilnahmen: Beitreten, Absagen, Host-Absage.
//
// WICHTIG — Nebenläufigkeit: Die SQLite-Fassung prüfte erst die Platzzahl und
// fügte danach ein. Im Einzelprozess unkritisch, gegen Postgres mit parallelen
// Anfragen jedoch eine klassische TOCTOU-Lücke: Zwei Nutzer könnten denselben
// letzten Platz bekommen. Deshalb wird die Event-Zeile hier per
// `select ... for update` gesperrt, solange gezählt und eingefügt wird.
import { one, run, tx } from '../db-pg.js';
import { countJoined } from './events.js';
import { isLateCancel, applyLateCancel } from '../logic/score.js';

// Sperrt das Event und liefert die für Entscheidungen nötigen Felder.
async function lockEvent(eventId, client) {
  return one(
    `select id, series_id, host_id, status, max_spots, datetime, duration_min, title
       from public.events where id = $1 for update`,
    [eventId],
    client
  );
}

// Ergebnis-Codes statt Exceptions — die Route bildet sie auf HTTP-Status ab.
export async function joinEvent(eventId, userId) {
  return tx(async (client) => {
    const ev = await lockEvent(eventId, client);
    if (!ev) return { error: 'not_found' };
    if (ev.status === 'past' || ev.status === 'cancelled') return { error: 'closed' };
    if (ev.hostId === userId) return { error: 'is_host' };

    const existing = await one(
      'select status from public.participations where event_id = $1 and user_id = $2',
      [eventId, userId],
      client
    );
    if (existing?.status === 'joined') return { error: 'already_joined' };

    const joined = await countJoined(eventId, client);
    if (joined >= ev.maxSpots) return { error: 'full' };

    await run(
      `insert into public.participations (user_id, event_id, status, joined_at, cancelled_at)
       values ($1, $2, 'joined', now(), null)
       on conflict (user_id, event_id)
       do update set status = 'joined', joined_at = now(), cancelled_at = null`,
      [userId, eventId],
      client
    );
    await run(
      `insert into public.chat_members (series_id, user_id, last_read_at)
       values ($1, $2, now()) on conflict do nothing`,
      [ev.seriesId, userId],
      client
    );
    if (joined + 1 >= ev.maxSpots) {
      await run("update public.events set status = 'full' where id = $1", [eventId], client);
    }
    return { ok: true, hostId: ev.hostId, title: ev.title };
  });
}

// Absage eines Teilnehmers. Score-Abzug nur bei kurzfristiger Absage (< 24 h)
// und nur, wenn das Event weder abgesagt noch vorbei ist.
export async function cancelParticipation(eventId, userId, nowMs = Date.now()) {
  return tx(async (client) => {
    const ev = await lockEvent(eventId, client);
    if (!ev) return { error: 'not_found' };

    const part = await one(
      'select status from public.participations where event_id = $1 and user_id = $2',
      [eventId, userId],
      client
    );
    if (part?.status !== 'joined') return { error: 'not_joined' };

    const endMs = new Date(ev.datetime).getTime() + ev.durationMin * 60_000;
    const eventOver = endMs <= nowMs;

    // Host hat bereits abgesagt -> Austritt bleibt straffrei
    if (ev.status === 'cancelled') {
      await run(
        `update public.participations set status = 'cancelled', cancelled_at = now()
          where event_id = $1 and user_id = $2`,
        [eventId, userId],
        client
      );
      const me = await one('select reliability_score from public.users where id = $1', [userId], client);
      return { ok: true, delta: 0, late: false, score: me.reliabilityScore };
    }
    if (eventOver || ev.status === 'past') return { error: 'over' };

    await run(
      `update public.participations set status = 'cancelled', cancelled_at = now()
        where event_id = $1 and user_id = $2`,
      [eventId, userId],
      client
    );

    const me = await one(
      'select reliability_score from public.users where id = $1 for update',
      [userId],
      client
    );
    const late = isLateCancel(ev.datetime, nowMs);
    let score = me.reliabilityScore;
    if (late) {
      score = applyLateCancel(score);
      await run('update public.users set reliability_score = $1 where id = $2', [score, userId], client);
    }
    // Falls das Event voll war, ist jetzt wieder ein Platz frei
    if (ev.status === 'full') {
      await run("update public.events set status = 'open' where id = $1", [eventId], client);
    }
    return { ok: true, delta: late ? me.reliabilityScore - score : 0, late, score, seriesId: ev.seriesId, title: ev.title };
  });
}

// Host sagt sein eigenes Event ab. Die 24-h-Regel gilt auch für Hosts.
export async function hostCancelEvent(eventId, hostId, nowMs = Date.now()) {
  return tx(async (client) => {
    const ev = await lockEvent(eventId, client);
    if (!ev) return { error: 'not_found' };
    if (ev.hostId !== hostId) return { error: 'not_host' };
    if (!['open', 'full'].includes(ev.status)) return { error: 'closed' };

    await run("update public.events set status = 'cancelled' where id = $1", [eventId], client);

    const host = await one(
      'select reliability_score from public.users where id = $1 for update',
      [hostId],
      client
    );
    const late = isLateCancel(ev.datetime, nowMs);
    let score = host.reliabilityScore;
    if (late) {
      score = applyLateCancel(score);
      await run('update public.users set reliability_score = $1 where id = $2', [score, hostId], client);
    }
    return { ok: true, late, score, delta: late ? host.reliabilityScore - score : 0,
             seriesId: ev.seriesId, title: ev.title };
  });
}

export async function getParticipation(eventId, userId, client = null) {
  return one(
    'select status, joined_at, cancelled_at from public.participations where event_id = $1 and user_id = $2',
    [eventId, userId],
    client
  );
}
