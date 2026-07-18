// Deutsche Datums-/Textformatierung für API-Labels.

export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];

const pad = (n) => String(n).padStart(2, '0');

// "Sa, 19.07."
export function dateLabel(iso) {
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

// "09:00"
export function timeLabel(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Sa 09:00" (Chat-Untertitel)
export function slotLabel(iso) {
  const d = new Date(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "dabei seit März 2026"
export function sinceLabel(iso) {
  const d = new Date(iso);
  return `dabei seit ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Chat-Liste: heute "09:41", gestern "Gestern", sonst "Mo"/"Di"…
export function whenLabel(iso, nowMs) {
  const d = new Date(iso);
  const now = new Date(nowMs);
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return timeLabel(iso);
  if (diffDays === 1) return 'Gestern';
  return WEEKDAYS_SHORT[d.getDay()];
}

// "4,9" — deutsche Dezimalformatierung
export function deNumber(n, digits = 1) {
  return n == null ? null : n.toFixed(digits).replace('.', ',');
}

// Initialen: "Anna M." → "AM" (Wortanfänge), "Lea" → "LE" (erste zwei Buchstaben)
export function initials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
