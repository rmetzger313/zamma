// Zuverlässigkeits-Score — Regeln laut Spezifikation:
// Startwert 100; Absage < 24 h: −3; No-Show (per Feedback bestätigt): −10;
// erfolgreiches Treffen: +1 (max 100). Anzeige in Prozent.

export const SCORE_START = 100;
export const SCORE_MAX = 100;
export const SCORE_MIN = 0;
export const LATE_CANCEL_PENALTY = 3;
export const NO_SHOW_PENALTY = 10;
export const ATTEND_BONUS = 1;
export const LATE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

export function clampScore(score) {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(score)));
}

// Absage gilt als "kurzfristig", wenn sie weniger als 24 h vor Event-Beginn erfolgt.
export function isLateCancel(eventStartIso, nowMs) {
  return new Date(eventStartIso).getTime() - nowMs < LATE_CANCEL_WINDOW_MS;
}

export function applyLateCancel(score) {
  return clampScore(score - LATE_CANCEL_PENALTY);
}

export function applyNoShow(score) {
  return clampScore(score - NO_SHOW_PENALTY);
}

export function applyAttend(score) {
  return clampScore(score + ATTEND_BONUS);
}

// Vorschau für das Absage-Modal: "Dein Score: 96 % → 93 %"
export function cancelPreview(score, eventStartIso, nowMs) {
  const late = isLateCancel(eventStartIso, nowMs);
  return { current: score, after: late ? applyLateCancel(score) : score, late };
}
