export type DateKey = `${number}-${number}-${number}`;

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalDateKey(date = new Date()): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}` as DateKey;
}

export function fromLocalDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Invalid date key: ${dateKey}`);

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  if (toLocalDateKey(date) !== dateKey) {
    throw new Error(`Invalid calendar date: ${dateKey}`);
  }

  return date;
}

export function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDateKeyDays(dateKey: string, days: number): DateKey {
  return toLocalDateKey(addCalendarDays(fromLocalDateKey(dateKey), days));
}

