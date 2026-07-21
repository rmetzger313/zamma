// Wandelt die flachen Query-Ergebnisse der pg-Repositories in exakt die
// JSON-Form, die die App heute schon bekommt. Ziel: Der Umstieg auf Postgres
// ist für die App unsichtbar — keine Client-Änderung nötig.
import { dateLabel, timeLabel, slotLabel, sinceLabel, whenLabel, deNumber, initials } from '../format.js';
import { recurringLabel } from '../logic/recurrence.js';
import { CATEGORIES, SKILL_LABELS, matchesUser } from '../serialize.js';
import { computeVerification } from '../logic/verification.js';
import { formatKm } from '../logic/geo.js';
import { feedbackWindowState } from '../logic/feedback.js';

// Demo-Karte: Pin-Position aus echten Koordinaten statt aus Extra-Spalten.
// Die alte SQLite-Tabelle hatte map_x/map_y nur für die stilisierte Karte —
// solche Anzeige-Artefakte gehören nicht ins Produktionsschema. Lineare
// Projektion über die Demo-Region (München–Waldkraiburg).
const MAP_BOUNDS = { latMin: 48.05, latMax: 48.30, lngMin: 11.40, lngMax: 12.50 };
function mapPosition(lat, lng) {
  if (lat == null || lng == null) return { mapX: '50%', mapY: '36%' };
  const clamp = (v) => Math.max(4, Math.min(96, v));
  const x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * 100;
  const y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100;
  return { mapX: `${clamp(x).toFixed(1)}%`, mapY: `${clamp(y).toFixed(1)}%` };
}

// Öffentliches Nutzerprofil aus host_*-Feldern einer Event-Zeile
export function hostFromRow(row) {
  const v = computeVerification({
    verifiedPhone: row.hostVerifiedPhone,
    verifiedId: row.hostVerifiedId,
    meetingsAttended: row.hostMeetingsAttended,
    noShowCount: row.hostNoShowCount,
  });
  return {
    id: row.hostId,
    name: row.hostName,
    initials: initials(row.hostName),
    avatarColor: row.hostAvatarColor,
    photo: null,
    bio: null,
    verified: v.fullyVerified,
    reliabilityScore: row.hostReliabilityScore,
    meetingsAttended: row.hostMeetingsAttended,
    repLabel: `${row.hostReliabilityScore} % zuverlässig · ${row.hostMeetingsAttended} Treffen`,
  };
}

export function publicUser(u) {
  const v = computeVerification(u);
  return {
    id: u.id,
    name: u.name,
    initials: initials(u.name),
    avatarColor: u.avatarColor,
    photo: u.photo ?? null,
    bio: u.bio ?? null,
    verified: v.fullyVerified,
    reliabilityScore: u.reliabilityScore,
    meetingsAttended: u.meetingsAttended,
    repLabel: `${u.reliabilityScore} % zuverlässig · ${u.meetingsAttended} Treffen`,
  };
}

// `myHobbies` wird EINMAL pro Request geladen und hier durchgereicht —
// nicht pro Event nachgeschlagen.
export function eventFromRow(row, { myHobbies = [], myId = null, participants = null, nowMs = Date.now() } = {}) {
  const distanceKm = row.distanceM == null ? null : Math.round((row.distanceM / 1000) * 10) / 10;
  const iso = row.datetime instanceof Date ? row.datetime.toISOString() : row.datetime;
  const { mapX, mapY } = mapPosition(row.lat, row.lng);
  return {
    id: row.id,
    seriesId: row.seriesId,
    title: row.title,
    category: row.category,
    catLabel: CATEGORIES[row.category],
    skillLevel: row.skillLevel,
    skillLabel: SKILL_LABELS[row.skillLevel],
    datetime: iso,
    dateLabel: dateLabel(iso),
    timeLabel: timeLabel(iso),
    durationMin: row.durationMin,
    recurrence: row.recurrence,
    recurringLabel: recurringLabel(row.recurrence, iso),
    locationName: row.locationName,
    city: row.city,
    distLabel: row.distLabelOverride ?? (distanceKm == null ? null : formatKm(distanceKm)),
    distanceKm,
    mapX,
    mapY,
    maxSpots: row.maxSpots,
    joinedCount: row.joinedCount,
    spotsLabel: `${row.joinedCount} / ${row.maxSpots} dabei`,
    status: row.status,
    description: row.description,
    host: hostFromRow(row),
    participants: participants
      ? participants.map((p) => {
          const isMe = p.id === myId;
          const name = isMe ? 'Du' : p.name;
          return { id: p.id, name, initials: name.slice(0, 2).toUpperCase(), avatarColor: p.avatarColor, isMe };
        })
      : [],
    match: matchesUser({ category: row.category, skillLevel: row.skillLevel }, myHobbies),
    joined: row.myStatus === 'joined' || row.myStatus === 'attended',
    isHost: myId === row.hostId,
    feedbackWindow: feedbackWindowState({ datetime: iso, durationMin: row.durationMin }, nowMs),
  };
}

export function meFromRow(user, hobbies, recentFeedback, availability, verificationSteps) {
  const v = computeVerification(user);
  return {
    ...publicUser(user),
    city: user.city,
    sinceLabel: sinceLabel(user.joinDate instanceof Date ? user.joinDate.toISOString() : user.joinDate),
    avgRating: user.avgRating,
    avgRatingLabel: deNumber(user.avgRating),
    noShowCount: user.noShowCount,
    hobbies: hobbies.map((h) => ({ name: h.hobby, skillLevel: h.skillLevel })),
    verification: v,
    verificationSteps,
    availability,
    recentFeedback: recentFeedback.map((f) => ({
      fromName: f.fromName,
      fromInitials: initials(f.fromName),
      fromColor: f.fromColor,
      stars: f.stars,
      starsLabel: '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars),
      text: f.comment,
      createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
    })),
  };
}

export function chatListFromRows(rows, myId, nowMs = Date.now()) {
  return rows.map((r) => {
    const lastAt = r.lastAt instanceof Date ? r.lastAt.toISOString() : r.lastAt;
    const slotSource = r.nextDatetime ?? r.lastDatetime;
    const slotIso = slotSource instanceof Date ? slotSource.toISOString() : slotSource;
    return {
      seriesId: r.seriesId,
      name: r.name,
      initials: r.initials,
      color: r.color,
      sub: `${r.memberCount} Teilnehmer${slotIso ? ` · ${slotLabel(slotIso)}` : ''}`,
      lastMsg: `${r.lastUserId === myId ? 'Du: ' : ''}${r.lastText}`,
      whenLabel: whenLabel(lastAt, nowMs),
      lastAt,
      unread: r.unread,
    };
  });
}

export function messageFromRow(m, myId) {
  return {
    id: m.id,
    who: m.name,
    initials: initials(m.name),
    color: m.avatarColor,
    text: m.text,
    mine: m.userId === myId,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}
