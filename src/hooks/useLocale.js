import { useContext } from 'react';
import { LocaleContext } from '../i18n/LocaleContext';

// NOTE: distinct from `useLang` (code-language persistence, fcai_visualizer_lang).
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

export default useLocale;
