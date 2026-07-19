// No-Show per Feedback bestätigt — wirkt genau einmal pro (Event, Nutzer),
// egal wie viele Teilnehmende den No-Show melden. Revertiert außerdem den
// automatischen Attend-Bonus (+1 Score, Treffen-Zähler), den der Tick beim
// Event-Ende pauschal vergeben hat: ein No-Show ist kein erfolgreiches Treffen.

import { clampScore, NO_SHOW_PENALTY, ATTEND_BONUS } from './score.js';

export function confirmNoShow(db, event, aboutUserId) {
  const prior = db
    .prepare(`SELECT COUNT(*) AS c FROM feedback WHERE eventId = ? AND aboutUserId = ? AND tags LIKE '%"no_show"%'`)
    .get(event.id, aboutUserId);
  if (prior.c > 0) return { applied: false };

  const part = db
    .prepare('SELECT * FROM participations WHERE eventId = ? AND userId = ?')
    .get(event.id, aboutUserId);
  // Bonus wurde vergeben, wenn der Tick das Treffen abgeschlossen hat:
  // Teilnehmer → Teilnahme 'attended'; Host (ohne Teilnahme-Zeile) → Event 'past'.
  const isHost = event.hostId === aboutUserId;
  const bonusGiven = part?.status === 'attended' || (isHost && event.status === 'past');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(aboutUserId);
  const newScore = clampScore(
    user.reliabilityScore - NO_SHOW_PENALTY - (bonusGiven ? ATTEND_BONUS : 0)
  );
  db.prepare(`UPDATE users SET reliabilityScore = ?, noShowCount = noShowCount + 1,
      meetingsAttended = MAX(0, meetingsAttended - ?) WHERE id = ?`)
    .run(newScore, bonusGiven ? 1 : 0, aboutUserId);
  if (part) {
    db.prepare(`UPDATE participations SET status = 'no_show' WHERE eventId = ? AND userId = ?`)
      .run(event.id, aboutUserId);
  }
  return { applied: true };
}
