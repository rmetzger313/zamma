// Verfügbarkeit: an welchen Wochentagen und zu welchen Tageszeiten hat ein
// Nutzer typischerweise Zeit. Basis für spätere Matching-/Vorschlagslogik.

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const SLOTS = ['morning', 'afternoon', 'evening'];
export const SLOT_LABELS = { morning: 'Vormittags', afternoon: 'Nachmittags', evening: 'Abends' };

export function validAvailability({ days, slots }) {
  return (
    Array.isArray(days) &&
    Array.isArray(slots) &&
    days.every((d) => WEEKDAYS.includes(d)) &&
    slots.every((s) => SLOTS.includes(s)) &&
    new Set(days).size === days.length &&
    new Set(slots).size === slots.length
  );
}

export function getAvailability(db, userId) {
  const rows = db.prepare('SELECT kind, value FROM user_availability WHERE userId = ?').all(userId);
  const has = (kind, value) => rows.some((r) => r.kind === kind && r.value === value);
  return {
    days: WEEKDAYS.filter((d) => has('day', d)),      // in kanonischer Wochenreihenfolge
    slots: SLOTS.filter((s) => has('slot', s)),
  };
}

export function setAvailability(db, userId, { days, slots }) {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM user_availability WHERE userId = ?').run(userId);
    const ins = db.prepare('INSERT OR IGNORE INTO user_availability (userId, kind, value) VALUES (?, ?, ?)');
    for (const d of days) ins.run(userId, 'day', d);
    for (const s of slots) ins.run(userId, 'slot', s);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
