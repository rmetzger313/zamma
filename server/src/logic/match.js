// Leute-Matching: Kompatibilitäts-Score über Hobby-Überschneidung.
// Gleiches Hobby: 3 Punkte + Level-Nähe-Bonus (gleich +2, ±1 Level +1);
// verschiedenes Hobby derselben Kategorie: 1 Punkt.

import { hobbyCategory } from '../serialize.js';

export function compatibility(myHobbies, theirHobbies) {
  let score = 0;
  const shared = [];
  for (const mine of myHobbies) {
    const same = theirHobbies.find((t) => t.hobby === mine.hobby);
    if (same) {
      const diff = Math.abs(same.skillLevel - mine.skillLevel);
      score += 3 + (diff === 0 ? 2 : diff === 1 ? 1 : 0);
      shared.push(mine.hobby);
    } else if (
      hobbyCategory(mine.hobby) &&
      theirHobbies.some((t) => hobbyCategory(t.hobby) === hobbyCategory(mine.hobby))
    ) {
      score += 1;
    }
  }
  return { score, shared };
}
