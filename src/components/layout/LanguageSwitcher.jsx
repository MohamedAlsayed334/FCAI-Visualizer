import { Languages } from 'lucide-react';
import { useT } from '../../hooks/useT';
import { useLocale } from '../../hooks/useLocale';
import './LanguageSwitcher.css';

// Locale switcher lives in the Header. Arabic locales also get a digit-style
// toggle (Western 123 vs Arabic-Indic ١٢٣) stored in fcai_visualizer_digits.
export default function LanguageSwitcher() {
  const { locale, setLocale, locales, isRTL, digits, setDigits } = useLocale();
  const t = useT();
  const arabicNumerals = digits === 'arab';

  return (
    <>
      <label className="theme-toggle lang-switcher">
        <Languages size={16} aria-hidden="true" />
        <select
          className="lang-switcher-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label={t('settings.language')}
        >
          {locales.map((l) => (
            <option key={l.code} value={l.code}>{l.nativeName}</option>
          ))}
        </select>
      </label>
      {isRTL && (
        <button
          type="button"
          className="theme-toggle lang-digits-toggle"
          onClick={() => setDigits(arabicNumerals ? 'latn' : 'arab')}
          title={t(arabicNumerals ? 'settings.digitsToLatn' : 'settings.digitsToArab')}
          aria-label={t(arabicNumerals ? 'settings.digitsToLatn' : 'settings.digitsToArab')}
          aria-pressed={arabicNumerals}
        >
          <span>{arabicNumerals ? '١٢٣' : '123'}</span>
        </button>
      )}
    </>
  );
}
