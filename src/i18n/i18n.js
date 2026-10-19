// ── i18next instance ────────────────────────────────────────────────────────
// Messages are lazy-loaded per locale + namespace via Vite import.meta.glob,
// so only the selected language is ever shipped to the browser.
import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
} from './config';

const messageModules = import.meta.glob('./locales/*/*.json');

const i18n = i18next.createInstance();

i18n.use(
  resourcesToBackend(
    /**
     * @param {string} locale
     * @param {string} namespace
     */
    (locale, namespace) => {
      const loader = messageModules[`./locales/${locale}/${namespace}.json`];
      if (!loader) {
        return Promise.reject(new Error(`No messages for ${locale}/${namespace}`));
      }
      /** @type {() => Promise<{ default: object }>} */
      const load = /** @type {any} */ (loader);
      return load().then((module) => module.default);
    },
  ),
);

i18n.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
  nonExplicitSupportedLngs: true,
  defaultNS: 'common',
  ns: ['common'],
  // React escapes text itself; stepText()/innerHTML users only pass safe params
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
  returnEmptyString: false,
});

export default i18n;
