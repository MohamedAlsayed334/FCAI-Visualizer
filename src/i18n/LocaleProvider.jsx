// ── Locale provider ─────────────────────────────────────────────────────────
// Owns the active UI locale + digit preference, drives <html lang|dir>, the
// URL ?lang= param, localStorage persistence, and lazy resource loading.
// Route content remounts on language change via Layout's key={locale}.
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { LocaleContext } from './LocaleContext';
import {
  DEFAULT_DIGITS,
  DEFAULT_LOCALE,
  DIGITS_CHOICES,
  DIGITS_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  NAMESPACES,
  SUPPORTED_LOCALES,
  URL_LANG_PARAM,
  getLocaleMeta,
  isSupportedLocale,
  resolveInitialLocale,
} from './config';

function readDigitsPreference() {
  try {
    const stored = localStorage.getItem(DIGITS_STORAGE_KEY);
    if (DIGITS_CHOICES.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_DIGITS;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(resolveInitialLocale);
  const [digits, setDigitsState] = useState(readDigitsPreference);
  const [ready, setReady] = useState(false);

  // html lang/dir + font + persistence + URL param, synced before first paint.
  useLayoutEffect(() => {
    const meta = getLocaleMeta(locale) ?? getLocaleMeta(DEFAULT_LOCALE);
    const root = document.documentElement;
    root.lang = locale;
    root.dir = meta.dir;
    if (meta.fontFamily) {
      root.style.setProperty('--font-locale', meta.fontFamily);
    } else {
      root.style.removeProperty('--font-locale');
    }
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(URL_LANG_PARAM) !== locale) {
        url.searchParams.set(URL_LANG_PARAM, locale);
        window.history.replaceState(null, '', url);
      }
    } catch {
      /* ignore */
    }
  }, [locale]);

  // Preload the new language's resources, then activate it.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await i18n.loadLanguages(locale);
        await i18n.loadNamespaces(NAMESPACES);
      } catch {
        /* ignore */
      }
      if (!alive) return;
      await i18n.changeLanguage(locale);
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState((prev) => (isSupportedLocale(next) ? next : prev));
  }, []);

  const setDigits = useCallback((next) => {
    const value = DIGITS_CHOICES.includes(next) ? next : DEFAULT_DIGITS;
    setDigitsState(value);
    try {
      localStorage.setItem(DIGITS_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const meta = getLocaleMeta(locale) ?? getLocaleMeta(DEFAULT_LOCALE);
  const value = useMemo(
    () => ({
      locale,
      meta,
      isRTL: meta.dir === 'rtl',
      // Registry entries ({code, nativeName, dir, …}) for pickers/switchers.
      locales: SUPPORTED_LOCALES,
      digits,
      setLocale,
      setDigits,
      ready,
    }),
    [locale, meta, digits, setLocale, setDigits, ready],
  );

  // Hold the first paint until the initial bundle is active so the app never
  // flashes raw keys or a mixed-language shell. The I18nextProvider hands our
  // custom i18next instance to react-i18next — without it every useTranslation
  // call falls back to the never-initialized global instance and the app
  // white-screens ("You will need to pass in an i18next instance…").
  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
}

export default LocaleProvider;
