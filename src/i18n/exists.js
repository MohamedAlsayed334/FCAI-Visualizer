import i18n from './i18n';

/**
 * True when a key resolves to a real translation (vs. falling back to the raw
 * key). Lets callers layer a canonical English/data value underneath a
 * possibly-missing translation key.
 */
export function hasTranslation(key) {
  try {
    return Boolean(i18n.exists(key));
  } catch {
    return false;
  }
}
