// ── Locale registry & constants ─────────────────────────────────────────────
// Languages are auto-discovered from ./locales/<code>/meta.json — adding a new
// language requires no code changes: create the folder, add meta.json plus one
// JSON file per namespace, fill in ar-style translations, and it appears in the
// switcher automatically.

export const DEFAULT_LOCALE = 'en';
export const FALLBACK_LOCALE = 'en';

// All localStorage keys are prefixed `fcai_visualizer_`.
export const LOCALE_STORAGE_KEY = 'fcai_visualizer_locale';
export const DIGITS_STORAGE_KEY = 'fcai_visualizer_digits'; // 'latn' | 'arab'
export const URL_LANG_PARAM = 'lang';

export const DEFAULT_DIGITS = 'latn';
export const DIGITS_CHOICES = ['latn', 'arab'];

// Eager meta glob — tiny files, needed synchronously by the switcher and <html> setup.
/**
 * meta.json shape: { name, nativeName, dir, fontFamily?, defaultNumberingSystem? }
 * @typedef {{ name: string, nativeName: string, dir?: 'rtl'|'ltr', fontFamily?: string, defaultNumberingSystem?: string }} LocaleMetaRaw
 * @type {Record<string, LocaleMetaRaw>}
 */
const metaModules = import.meta.glob('./locales/*/meta.json', {
  eager: true,
  import: 'default',
});

// Canonical namespace list (what "en" carries). Every locale provides the same set.
const messageModules = import.meta.glob('./locales/*/*.json');

const codeFromPath = (path) => path.split('/')[2];
const nsFromPath = (path) => path.replace(/\.json$/, '').split('/')[3];

export const NAMESPACES = Array.from(
  new Set(
    Object.keys(messageModules)
      .filter((path) => codeFromPath(path) === DEFAULT_LOCALE)
      .map(nsFromPath)
      .filter(Boolean),
  ),
).filter((ns) => ns !== 'meta');

export const SUPPORTED_LOCALES = Object.entries(metaModules)
  .map(([path, meta]) => {
    const { dir, ...rest } = meta;
    return {
      code: codeFromPath(path),
      dir: dir === 'rtl' ? 'rtl' : 'ltr',
      ...rest,
    };
  })
  .sort((a, b) =>
    a.code === DEFAULT_LOCALE ? -1 : b.code === DEFAULT_LOCALE ? 1 : a.code.localeCompare(b.code),
  );

export function isSupportedLocale(code) {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

export function getLocaleMeta(code) {
  return SUPPORTED_LOCALES.find((l) => l.code === code) || null;
}

export function isRTL(code) {
  return getLocaleMeta(code)?.dir === 'rtl';
}

export function localeDir(code) {
  return isRTL(code) ? 'rtl' : 'ltr';
}

// ── Resolution order: URL ?lang= → localStorage → navigator → default ──────
export function resolveInitialLocale() {
  let fromUrl = null;
  try {
    fromUrl = new URLSearchParams(window.location.search).get(URL_LANG_PARAM) ?? null;
  } catch {
    // ignore malformed URLs
  }
  if (fromUrl && isSupportedLocale(fromUrl)) return fromUrl;

  let stored = null;
  try {
    stored ??= localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // Safari/private mode can block localStorage
  }
  if (stored && isSupportedLocale(stored)) return stored;

  const candidates =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  for (const tag of candidates) {
    const base = String(tag || '').toLowerCase().split('-')[0];
    if (isSupportedLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
