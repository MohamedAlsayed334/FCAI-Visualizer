import { useTranslation } from 'react-i18next';

/**
 * Translation hook tied to the active locale.
 * @param {string} [namespace] Namespace to scope {@link t} calls to (e.g. 'sorting').
 * Keys are namespaced when no namespace is passed, e.g. t('home:hero.title').
 * @returns {(key: string, options?: Record<string, unknown>) => string}
 */
export function useT(namespace) {
  const { t } = useTranslation(namespace || 'common');
  return t;
}

export default useT;
