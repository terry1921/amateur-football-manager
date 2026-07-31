type WallTime = {
  date: string;
  time: string;
  timeZone: string;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function parseTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function isValidDateInput(value: string) {
  return parseDate(value) !== null;
}

export function isValidTimeInput(value: string) {
  return parseTime(value) !== null;
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}

function partsInTimeZone(value: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
  };
}

function partsToEpoch(parts: DateParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

export function wallTimeToUtc({ date, time, timeZone }: WallTime) {
  const dateParts = parseDate(date);
  const timeParts = parseTime(time);
  if (!dateParts || !timeParts || !isValidTimeZone(timeZone)) return null;

  const target: DateParts = { ...dateParts, ...timeParts };
  const targetEpoch = partsToEpoch(target);
  let candidateEpoch = targetEpoch;

  for (let index = 0; index < 5; index += 1) {
    const observed = partsInTimeZone(new Date(candidateEpoch), timeZone);
    const difference = targetEpoch - partsToEpoch(observed);
    if (difference === 0) break;
    candidateEpoch += difference;
  }

  const finalParts = partsInTimeZone(new Date(candidateEpoch), timeZone);
  if (partsToEpoch(finalParts) !== targetEpoch) return null;
  return new Date(candidateEpoch).toISOString();
}

export function utcToFormValues(value: string, timeZone: string) {
  if (!isValidTimeZone(timeZone)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = partsInTimeZone(date, timeZone);
  const pad = (number: number) => number.toString().padStart(2, "0");
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}
