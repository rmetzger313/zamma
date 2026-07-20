// Smart Suggestions: "Weil du X magst, könnte dir Y gefallen."
// Statischer Ähnlichkeitsgraph über die kuratierte Hobby-Liste —
// in Produktion durch Kollaborativ-Filterung über echte Nutzungsdaten ersetzbar.

const SIMILAR = {
  Laufen: ['Radfahren', 'Wandern'],
  Fußball: ['Laufen'],
  Bouldern: ['Wandern', 'Laufen'],
  Radfahren: ['Laufen', 'Wandern'],
  Wandern: ['Radfahren', 'Bouldern', 'Fotografie'],
  Brettspiele: ['Schafkopf'],
  Schafkopf: ['Brettspiele'],
  Fotografie: ['Malen', 'Wandern'],
  Malen: ['Fotografie', 'Musik'],
  Musik: ['Malen'],
  Kochen: ['Bücher'],
  Bücher: ['Malen', 'Musik'],
};

export function suggestions(hobbies, max = 4) {
  const owned = new Set(hobbies.map((h) => h.hobby));
  const result = [];
  for (const h of hobbies) {
    for (const similar of SIMILAR[h.hobby] ?? []) {
      if (!owned.has(similar) && !result.some((r) => r.hobby === similar)) {
        result.push({ hobby: similar, because: h.hobby });
      }
    }
  }
  return result.slice(0, max);
}
