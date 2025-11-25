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
  if (!tz || tz.toUpperCase() === 'UTC') return 0;
  const match = tz.toUpperCase().match(/^UTC([+-]?)(\d{1,2})$/);
  if (!match) return 0;
  const [, sign, value] = match;
  const hours = Number(value);
  if (Number.isNaN(hours)) return 0;
  return sign === '-' ? -hours : hours;
};

export const toTimestampSeconds = (value: string | number, tz?: string) => {
  const baseMs =
    typeof value === 'number'
      ? // If already in seconds, convert to ms; if already in ms, keep.
        (value > 1e12 ? value : value * 1000)
      : Date.parse(value);
  if (Number.isNaN(baseMs)) return null;
  const offsetMs = parseTimezoneOffsetHours(tz) * MS_IN_HOUR;
  return Math.floor((baseMs + offsetMs) / 1000);
};

export const deriveMinBarSpacing = (timeframe?: string) => {
  const minutes = timeframeToMinutes(timeframe);
  if (minutes <= 1 / 60) return 1;
  if (minutes <= 1) return 2.5;
  if (minutes <= 5) return 3.5;
  if (minutes <= 15) return 4.5;
  return 6;
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

export const formatTickLabel = (timestampSeconds: number, tz?: string, timeframe?: string) => {
  const date = new Date(timestampSeconds * 1000);
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

export const formatTooltipLabel = (timestampSeconds: number, _tz?: string) => {
  const date = new Date(timestampSeconds * 1000);
  return fullFormatter.format(date);
};
