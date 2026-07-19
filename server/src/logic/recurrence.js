// Wiederkehrende Events: Recurrence erzeugt die nächste Instanz automatisch
// nach Event-Ende; Teilnahme gilt pro Instanz.

export const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function nextOccurrence(datetimeIso, recurrence) {
  if (!recurrence) return null;
  // Lokale Kalenderarithmetik statt ms-Addition: hält "wöchentlich zur
  // gleichen Zeit" auch über Sommer-/Winterzeit-Umstellungen stabil.
  const d = new Date(datetimeIso);
  d.setDate(d.getDate() + (recurrence === 'biweekly' ? 14 : 7));
  return d.toISOString();
}

// "↻ Jeden Samstag" / "↻ Alle 2 Wochen"
export function recurringLabel(recurrence, datetimeIso) {
  if (!recurrence) return null;
  if (recurrence === 'biweekly') return 'Alle 2 Wochen';
  return `Jeden ${WEEKDAYS_DE[new Date(datetimeIso).getDay()]}`;
}

