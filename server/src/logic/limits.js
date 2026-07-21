// Eingabe-Längenlimits — schützen vor DB-Bloat und Missbrauch.
// Zeichen, nicht Bytes (Emojis zählen als 1–2 Code Units, bewusst großzügig).

export const LIMITS = {
  chatText: 2000,
  eventTitle: 120,
  eventDescription: 2000,
  locationName: 120,
  feedbackComment: 1000,
  hobbyName: 40,
  reportReason: 40,
};

// Pflichtfeld: nicht leer und höchstens `max` Zeichen (nach Trim).
export function withinLimit(value, max) {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return t.length > 0 && t.length <= max;
}

// Optionales Feld: darf fehlen/leer sein, sonst höchstens `max` Zeichen.
export function optionalWithinLimit(value, max) {
  if (value == null || value === '') return true;
  return typeof value === 'string' && value.trim().length <= max;
}
