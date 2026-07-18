// Verifizierung: Stufe 1 SMS, Stufe 2 Video-Ident, Stufe 3 = 3 Treffen ohne No-Show.
// Badge-Entzug bei 2 unentschuldigten No-Shows; unverifizierte/niedrige Scores
// werden in der Suche nachrangig sortiert.

export const MEETINGS_REQUIRED = 3;
export const BADGE_REVOKE_NO_SHOWS = 2;
export const LOW_SCORE_THRESHOLD = 80;

export function computeVerification(user) {
  const phone = !!user.verifiedPhone;
  const ident = !!user.verifiedId;
  const meetings = user.meetingsAttended >= MEETINGS_REQUIRED;
  const revoked = user.noShowCount >= BADGE_REVOKE_NO_SHOWS;
  return {
    phone,
    ident,
    meetings,
    revoked,
    fullyVerified: phone && ident && meetings && !revoked,
  };
}

// Feed-Sortierung: nachrangig, wenn Host unverifiziert oder Score niedrig.
export function isDemoted(user) {
  const v = computeVerification(user);
  return !v.fullyVerified || user.reliabilityScore < LOW_SCORE_THRESHOLD;
}
