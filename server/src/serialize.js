// Response-Formen für die App: Events und Nutzer mit fertigen deutschen Labels.

import { dateLabel, timeLabel, deNumber, initials, sinceLabel } from './format.js';
import { recurringLabel } from './logic/recurrence.js';
import { computeVerification } from './logic/verification.js';
import { matchLocations, formatKm } from './logic/geo.js';
import { feedbackWindowState } from './logic/feedback.js';

export const CATEGORIES = {
  sport: 'Sport',
  spiele: 'Spiele',
  kreativ: 'Kreativ',
  outdoor: 'Outdoor',
  kochen: 'Kochen',
};

export const SKILL_LABELS = { 1: 'Alle Level', 2: 'Fortgeschritten', 3: 'Profi' };

const HOBBY_CATEGORY = {
  Laufen: 'sport', Fußball: 'sport', Bouldern: 'sport', Radfahren: 'sport',
  Wandern: 'outdoor', Brettspiele: 'spiele', Schafkopf: 'spiele',
  Fotografie: 'kreativ', Malen: 'kreativ', Musik: 'kreativ', Bücher: 'kreativ',
  Kochen: 'kochen',
};

export function hobbyCategory(hobby) {
  return HOBBY_CATEGORY[hobby] ?? null;
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

export function meUser(u, hobbies, recentFeedback) {
  const v = computeVerification(u);
  return {
    ...publicUser(u),
    city: u.city,
    sinceLabel: sinceLabel(u.joinDate),
    avgRating: u.avgRating,
    avgRatingLabel: deNumber(u.avgRating),
    noShowCount: u.noShowCount,
    hobbies: hobbies.map((h) => ({ name: h.hobby, skillLevel: h.skillLevel })),
    verification: v,
    recentFeedback,
  };
}

// „Passt zu dir": Event-Level == Nutzer-Level (oder Event „Alle Level").
export function matchesUser(event, hobbies) {
  if (event.skillLevel === 1) return true;
  return hobbies.some(
    (h) => hobbyCategory(h.hobby) === event.category && h.skillLevel === event.skillLevel
  );
}

export function serializeEvent(event, ctx) {
  const { host, participants, me, myHobbies, myLocations, myParticipation, nowMs } = ctx;
  const geo = myLocations?.length ? matchLocations(myLocations, event.lat, event.lng) : null;
  const distLabel = event.distLabelOverride ?? (geo ? formatKm(geo.distanceKm) : null);
  const joinedCount = 1 + participants.length; // Host zählt mit
  return {
    id: event.id,
    seriesId: event.seriesId,
    title: event.title,
    category: event.category,
    catLabel: CATEGORIES[event.category],
    skillLevel: event.skillLevel,
    skillLabel: SKILL_LABELS[event.skillLevel],
    datetime: event.datetime,
    dateLabel: dateLabel(event.datetime),
    timeLabel: timeLabel(event.datetime),
    durationMin: event.durationMin,
    recurrence: event.recurrence,
    recurringLabel: recurringLabel(event.recurrence, event.datetime),
    locationName: event.locationName,
    city: event.city,
    distLabel,
    distanceKm: geo ? Math.round(geo.distanceKm * 10) / 10 : null,
    mapX: event.mapX,
    mapY: event.mapY,
    maxSpots: event.maxSpots,
    joinedCount,
    spotsLabel: `${joinedCount} / ${event.maxSpots} dabei`,
    status: event.status,
    description: event.description,
    host: publicUser(host),
    participants: participants.map((p) => {
      const isMe = p.id === me?.id;
      const name = isMe ? 'Du' : p.name;
      return {
        id: p.id,
        name,
        initials: name.slice(0, 2).toUpperCase(), // "Du" → "DU" wie im Prototyp
        avatarColor: p.avatarColor,
        isMe,
      };
    }),
    match: myHobbies ? matchesUser(event, myHobbies) : false,
    joined: myParticipation?.status === 'joined' || myParticipation?.status === 'attended',
    isHost: me?.id === event.hostId,
    feedbackWindow: feedbackWindowState(event, nowMs),
  };
}
