import { getTimezoneById } from '../constants/timezones';

const MS_IN_HOUR = 60 * 60 * 1000;

export const timeframeToMinutes = (timeframe?: string) => {
  const code = (timeframe || '').toUpperCase();
  switch (code) {
    case 'S1':
      return 1 / 60;
    case 'S15':
      return 15 / 60;
    case 'M1':
      return 1;
    case 'M5':
      return 5;
    case 'M15':
      return 15;
    case 'M30':
      return 30;
    case 'H1':
      return 60;
    case 'H4':
      return 240;
    case 'D1':
      return 1440;
    default:
      return 1;
  }
};

export const parseTimezoneOffsetHours = (tz?: string) => {
  if (!tz) return 0;
  const upper = tz.toUpperCase();
  if (upper === 'UTC') return 0;
  const match = upper.match(/^UTC([+-]?)(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return 0;
  const [, sign, hoursStr, minutesStr] = match;
  const hours = Number(hoursStr);
  const minutes = minutesStr ? Number(minutesStr) : 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  const value = hours + minutes / 60;
  return sign === '-' ? -value : value;
};

export const toTimestampSeconds = (value: string | number, tz?: string) => {
  const baseMs =
    typeof value === 'number'
      ? // If already in seconds, convert to ms; if already in ms, keep.
        (value > 1e12 ? value : value * 1000)
      : Date.parse(value);
  if (Number.isNaN(baseMs)) return null;
  const offsetMs = tz ? parseTimezoneOffsetHours(tz) * MS_IN_HOUR : 0;
  return Math.floor((baseMs + offsetMs) / 1000);
};

export const deriveMinBarSpacing = (timeframe?: string) => {
  const minutes = timeframeToMinutes(timeframe);
  // Valores bem menores para permitir zoom-out muito mais profundo
  // com a rodinha do mouse, independente do timeframe.
  if (minutes <= 1 / 60) return 0.2;
  if (minutes <= 1) return 0.3;
  if (minutes <= 5) return 0.4;
  if (minutes <= 15) return 0.5;
  return 0.6;
};

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const fullFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const getOffsetHoursForTimezoneId = (timezoneId?: string) => {
  if (!timezoneId) return 0;
  try {
    const tz = getTimezoneById(timezoneId);
    const raw = (tz?.offset || '').replace(/[()]/g, ''); // e.g. "UTC-3"
    return parseTimezoneOffsetHours(raw);
  } catch {
    return 0;
  }
};

export const formatTickLabel = (timestampSeconds: number, timezoneId?: string, timeframe?: string) => {
  const offsetHours = getOffsetHoursForTimezoneId(timezoneId);
  const date = new Date((timestampSeconds + offsetHours * 3600) * 1000);
  const hhmm = timeFormatter.format(date);
  if (hhmm === '00:00') {
    return dayFormatter.format(date);
  }

  const minutes = timeframeToMinutes(timeframe);
  if (minutes >= 60) {
    return hhmm;
  }

  return hhmm;
};

export const formatTooltipLabel = (timestampSeconds: number, timezoneId?: string) => {
  const offsetHours = getOffsetHoursForTimezoneId(timezoneId);
  const date = new Date((timestampSeconds + offsetHours * 3600) * 1000);
  return fullFormatter.format(date);
};
