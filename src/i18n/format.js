// ── Locale-aware number & date formatting ───────────────────────────────────
// Plain functions (no React) so imperative canvas code can call them too.
import {
  DEFAULT_LOCALE,
  DIGITS_STORAGE_KEY,
  getLocaleMeta,
} from './config';

export function readDigitsPreference() {
  try {
    const stored = localStorage.getItem(DIGITS_STORAGE_KEY);
    if (stored === 'latn' || stored === 'arab') return stored;
  } catch {
    /* ignore */
  }
  return null;
}
/**
 * Build an Intl locale tag honoring the user's digit-prefix preference and the
 * locale's default numbering system (Arabic defaults to Western digits).
 */
function buildTag(locale) {
  const numberingSystem =
    readDigitsPreference() ?? getLocaleMeta(locale)?.defaultNumberingSystem ?? 'latn';
  return new Intl.Locale(locale, { numberingSystem }).toString();
}

/** Format a number with the locale's grouping/decimal rules. */
export function formatNumber(value, locale = DEFAULT_LOCALE, options = {}) {
  try {
    return new Intl.NumberFormat(buildTag(locale), options).format(value);
  } catch {
    return new Intl.NumberFormat(locale, options).format(value);
  }
}

export function formatPercent(value, locale = DEFAULT_LOCALE) {
  return formatNumber(value, locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
}

/**
 * @param {Date | number} value
 * @param {string} [locale]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDate(value, locale = DEFAULT_LOCALE, options) {
  const opts = options ?? { dateStyle: 'medium' };
  try {
    return new Intl.DateTimeFormat(buildTag(locale), opts).format(value);
  } catch {
    return new Intl.DateTimeFormat(locale, opts).format(value);
  }
}

export function formatTime(value, locale = DEFAULT_LOCALE) {
  return formatDate(value, locale, { hour: '2-digit', minute: '2-digit' });
}
