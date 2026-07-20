// Badges & Meilensteine — rein abgeleitet aus vorhandenen Daten
// (kein zusätzliches Schreibmodell nötig).

export function computeBadges(db, userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return [];

  const { c: fiveStars } = db
    .prepare('SELECT COUNT(*) AS c FROM feedback WHERE aboutUserId = ? AND stars = 5')
    .get(userId);
  const seriesRegular = db
    .prepare(`SELECT COUNT(*) AS c FROM (
        SELECT e.seriesId FROM participations p JOIN events e ON e.id = p.eventId
        WHERE p.userId = ? AND p.status = 'attended'
        GROUP BY e.seriesId HAVING COUNT(*) >= 3)`)
    .get(userId);

  return [
    { key: 'first_meeting', icon: '⭐', label: 'Erstes Treffen',
      desc: 'Beim ersten Treffen dabei gewesen', earned: user.meetingsAttended >= 1 },
    { key: 'ten_meetings', icon: '🔥', label: '10 Treffen',
      desc: 'Zehn Treffen absolviert', earned: user.meetingsAttended >= 10 },
    { key: 'series_regular', icon: '🔁', label: 'Stammgast',
      desc: 'Dreimal bei derselben Serie dabei', earned: seriesRegular.c >= 1 },
    { key: 'rock_solid', icon: '🛡️', label: 'Verlass dich drauf',
      desc: 'Score 95 %+ bei mindestens 5 Treffen',
      earned: user.reliabilityScore >= 95 && user.meetingsAttended >= 5 },
    { key: 'five_star', icon: '★', label: '5-Sterne-Mitglied',
      desc: 'Eine 5-Sterne-Bewertung erhalten', earned: fiveStars >= 1 },
  ];
}
