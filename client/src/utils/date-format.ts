const ruDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const ruDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatRuDate(value: string | Date) {
  return ruDateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatRuDateTime(value: string | Date) {
  return ruDateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}
