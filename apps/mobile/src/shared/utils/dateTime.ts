/** Format an ISO 8601 UTC string to local date string */
export const toLocalDate = (utcIso: string, locale: string = 'en'): string => {
  const date = new Date(utcIso);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/** Format an ISO 8601 UTC string to local time string */
export const toLocalTime = (utcIso: string, locale: string = 'en'): string => {
  const date = new Date(utcIso);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
  });
};

/** Get today's date as ISO date string (YYYY-MM-DD) in local timezone */
export const todayIsoDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0]!;
};

/** Get current UTC ISO 8601 timestamp */
export const nowUtc = (): string => new Date().toISOString();
