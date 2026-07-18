// Wiederkehrende Events: Recurrence erzeugt die nächste Instanz automatisch
// nach Event-Ende; Teilnahme gilt pro Instanz.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function nextOccurrence(datetimeIso, recurrence) {
  if (!recurrence) return null;
  const step = recurrence === 'biweekly' ? 2 * WEEK_MS : WEEK_MS;
  return new Date(new Date(datetimeIso).getTime() + step).toISOString();
}

// "↻ Jeden Samstag" / "↻ Alle 2 Wochen"
export function recurringLabel(recurrence, datetimeIso) {
  if (!recurrence) return null;
  if (recurrence === 'biweekly') return 'Alle 2 Wochen';
  return `Jeden ${WEEKDAYS_DE[new Date(datetimeIso).getDay()]}`;
}

// Idempotent: legt die Folge-Instanz nur an, wenn die Serie noch keine
// zukünftige Instanz hat. Wird vom Tick nach Event-Ende aufgerufen.
export function buildNextInstance(event, makeId) {
  const datetime = nextOccurrence(event.datetime, event.recurrence);
  if (!datetime) return null;
  return {
    ...event,
    id: makeId(),
    datetime,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}
