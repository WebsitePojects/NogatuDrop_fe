// 'YYYY-MM-DD' delivery dates from the server -> "Nov 18 – Nov 23". Read as UTC so the day never shifts.
const dayLabel = (isoDate) => new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-PH', {
  timeZone: 'UTC', month: 'short', day: 'numeric',
});

export function formatDeliveryWindow(from, to) {
  if (!from || !to) return '';
  return from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`;
}

// Until payment is confirmed the dates assume it is paid today; the server recounts them on payment.
export const IF_PAID_TODAY_NOTE = 'if paid today';
