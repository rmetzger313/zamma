// Feedback-Fenster: öffnet nach Event-Ende, Push-Reminder nach 2 h,
// schließt nach 7 Tagen. 1× pro Teilnehmer-Paar, anonymisiert in den Score.

export const FEEDBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const FEEDBACK_REMINDER_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_EVENT_DURATION_MIN = 120;

export const FEEDBACK_TAGS = {
  punctual: { label: 'Pünktlich', negative: false },
  friendly: { label: 'Freundlich', negative: false },
  organized: { label: 'Gut organisiert', negative: false },
  as_described: { label: 'Wie beschrieben', negative: false },
  late: { label: 'Zu spät', negative: true },
  cancelled_short_notice: { label: 'Kurzfristig abgesagt', negative: true },
  no_show: { label: 'Nicht erschienen', negative: true },
};

export function eventEndMs(event) {
  return (
    new Date(event.datetime).getTime() +
    (event.durationMin ?? DEFAULT_EVENT_DURATION_MIN) * 60 * 1000
  );
}

// 'not_open' (Treffen läuft noch/steht bevor) | 'open' | 'closed'
export function feedbackWindowState(event, nowMs) {
  const end = eventEndMs(event);
  if (nowMs < end) return 'not_open';
  if (nowMs > end + FEEDBACK_WINDOW_MS) return 'closed';
  return 'open';
}

export function reminderDue(event, nowMs) {
  return nowMs >= eventEndMs(event) + FEEDBACK_REMINDER_MS;
}

export function validTags(tags) {
  return Array.isArray(tags) && tags.every((t) => t in FEEDBACK_TAGS);
}
