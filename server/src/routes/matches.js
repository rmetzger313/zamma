import { Router } from 'express';
import { getHobbies, getLocations } from '../repo.js';
import { compatibility } from '../logic/match.js';
import { isDemoted } from '../logic/verification.js';
import { matchLocations, formatKm, DEFAULT_RADIUS_KM } from '../logic/geo.js';
import { publicUser } from '../serialize.js';

// Leute in deiner Nähe: Hobby-Kompatibilität + Umkreis, nachrangige Nutzer
// (unverifiziert / niedriger Score) ans Ende — gleiche Regel wie im Event-Feed.
export function matchesRouter(db) {
  const r = Router();

  r.get('/', (req, res) => {
    const myHobbies = getHobbies(db, req.userId);
    let myLocations = getLocations(db, req.userId);
    const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (myLocations.length === 0 && me.lat != null) {
      myLocations = [{ name: me.city, lat: me.lat, lng: me.lng, radiusKm: DEFAULT_RADIUS_KM }];
    }
    const blocked = new Set(
      db.prepare('SELECT blockedId FROM blocks WHERE userId = ?').all(req.userId).map((b) => b.blockedId)
    );
    const candidates = db
      .prepare('SELECT DISTINCT u.* FROM users u JOIN user_hobbies h ON h.userId = u.id WHERE u.id != ?')
      .all(req.userId);
    const list = candidates
      .filter((u) => !blocked.has(u.id))
      .map((u) => {
        const { score, shared } = compatibility(myHobbies, getHobbies(db, u.id));
        const geo = u.lat != null && myLocations.length ? matchLocations(myLocations, u.lat, u.lng) : null;
        return { u, score, shared, geo };
      })
      .filter((x) => x.score > 0 && x.geo)
      .sort((a, b) =>
        (isDemoted(a.u) ? 1 : 0) - (isDemoted(b.u) ? 1 : 0) || b.score - a.score
      )
      .slice(0, 10)
      .map(({ u, score, shared, geo }) => ({
        ...publicUser(u),
        city: u.city,
        distLabel: formatKm(geo.distanceKm),
        score,
        sharedHobbies: shared,
      }));
    res.json(list);
  });

  return r;
}
