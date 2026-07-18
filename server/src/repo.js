// Kleine Query-Helfer über dem SQLite-Schema.

export function getUser(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getHobbies(db, userId) {
  return db.prepare('SELECT hobby, skillLevel FROM user_hobbies WHERE userId = ? ORDER BY rowid').all(userId);
}

export function getLocations(db, userId) {
  return db.prepare('SELECT * FROM user_locations WHERE userId = ? ORDER BY isPrimary DESC').all(userId);
}

export function getEvent(db, id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

// Teilnehmende (ohne Host), die aktiv dabei sind
export function getParticipants(db, eventId) {
  return db
    .prepare(`SELECT u.* FROM participations p JOIN users u ON u.id = p.userId
      WHERE p.eventId = ? AND p.status IN ('joined','attended') ORDER BY p.joinedAt`)
    .all(eventId);
}

export function getMyParticipation(db, eventId, userId) {
  return db.prepare('SELECT * FROM participations WHERE eventId = ? AND userId = ?').get(eventId, userId);
}

export function joinedCount(db, event) {
  const { c } = db
    .prepare("SELECT COUNT(*) AS c FROM participations WHERE eventId = ? AND status IN ('joined','attended')")
    .get(event.id);
  return 1 + c; // Host zählt mit
}

// Kontext für serializeEvent aus Sicht des angemeldeten Nutzers
export function eventCtx(db, event, meId, nowMs = Date.now()) {
  const me = meId ? getUser(db, meId) : null;
  return {
    host: getUser(db, event.hostId),
    participants: getParticipants(db, event.id),
    me,
    myHobbies: me ? getHobbies(db, meId) : null,
    myLocations: me ? getLocations(db, meId) : null,
    myParticipation: me ? getMyParticipation(db, event.id, meId) : null,
    nowMs,
  };
}
