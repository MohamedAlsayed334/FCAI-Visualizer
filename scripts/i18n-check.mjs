// ── i18n consistency checker ─────────────────────────────────────────────────
// Verifies every locale stays in sync with the canonical `en` bundle:
//   • identical key set per namespace (meta.json is config, not copy — skipped)
//   • plurals: translated locale must cover every category en supplies;
//     Arabic must additionally provide all six categories (zero/one/two/
//     few/many/other) wherever en uses one/other with a `count` context
//   • {{interpolation}} placeholders must match between en and translations
//     (plural variants are exempt — {{count}} is implicit in i18next)
// Usage: node scripts/i18n-check.mjs   (npm run i18n:check)
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import process from 'node:process';

const repoUrl = new URL('../', import.meta.url);
const LOCALES_DIR = decodeURIComponent(new URL('src/i18n/locales', repoUrl).pathname)
  .replace(/^\/([A-Za-z]:)/, '$1');

const PLURAL_CATS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const isPluralCat = (k) => PLURAL_CATS.includes(k);

// i18next v26 only understands the suffix form (`key_one` / `key_other`). The
// nested object form (`{ "one": …, "other": … }`) silently resolves to the
// object instead of a string, so the UI prints the key. Collect every nested
// plural so the check can reject them.
const nestedPluralKeys = new Map();
let currentSource = '';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`✗ ${path}: invalid JSON — ${err.message}`);
    process.exitCode = 1;
    return null;
  }
}

/**
 * Flatten nested JSON into "a.b.c" paths. Two plural shapes fold up to one
 * bare key carrying a Set of supplied categories:
 *   nested: { "msgs": { "one": "...", "other": "..." } }
 *   suffix: { "insertBst_one": "...", "insertBst_other": "..." }
 */
function flatten(obj, prefix = '', out = {}) {
  const keys = Object.keys(obj);
  const isPluralObj = prefix && keys.length > 0
    && keys.every((k) => isPluralCat(k) && typeof obj[k] === 'string');
  if (isPluralObj) {
    if (!nestedPluralKeys.has(prefix)) nestedPluralKeys.set(prefix, new Set());
    nestedPluralKeys.get(prefix).add(currentSource);
    out[prefix] = { plural: new Set(keys) };
    return out;
  }
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else if (Array.isArray(value)) {
      // Tag lists — only length parity enforced; elements are translated copy.
      out[path] = { array: value };
    } else if (typeof value === 'string') {
      const suffix = key.match(/_(zero|one|two|few|many|other)$/);
      const bare = suffix ? path.slice(0, -suffix[0].length) : path;
      if (suffix) {
        out[bare] ??= { plural: new Set() };
        out[bare].plural ??= new Set();
        out[bare].plural.add(suffix[1]);
        out[bare].leaves = { ...out[bare].leaves, [suffix[1]]: value };
      } else {
        out[path] = { leaf: value };
      }
    } else {
      console.error(`✗ unsupported value type at ${path}`);
      process.exitCode = 1;
    }
  }
  return out;
}

const paramsOf = (str) => new Set([...String(str).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));

const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((dir) => dir !== 'en')
  .sort();

// Canonical bundle: { ns: { keyPath: {leaf?, plural?, array?} } }
const en = {};
for (const file of readdirSync(join(LOCALES_DIR, 'en'))) {
  if (file.endsWith('.json')) {
    currentSource = `en/${file}`;
    en[basename(file, '.json')] = flatten(readJson(join(LOCALES_DIR, 'en', file))) ?? {};
  }
}

let problems = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); problems += 1; };

for (const locale of locales) {
  for (const ns of Object.keys(en)) {
    if (ns === 'meta') continue; // per-locale configuration (dir, fonts), not copy

    currentSource = `${locale}/${ns}.json`;
    const flat = flatten(readJson(join(LOCALES_DIR, locale, `${ns}.json`)));
    if (!flat) continue;
    if (process.exitCode) continue;

    const enKeys = new Set(Object.keys(en[ns]));
    const locKeys = new Set(Object.keys(flat));

    for (const key of enKeys) {
      if (!locKeys.has(key)) fail(`${locale}/${ns}.json missing key "${ns}:${key}"`);
    }
    for (const key of locKeys) {
      if (!enKeys.has(key)) fail(`${locale}/${ns}.json has extra key "${ns}:${key}"`);
    }

    for (const key of enKeys) {
      const enLeaf = en[ns][key];
      const locLeaf = flat[key];
      if (!locLeaf || !enLeaf) continue;

      if (enLeaf.plural) {
        // Translated locale must carry at least en's categories; `ar` must
        // additionally implement the complete six-category set.
        const locCats = locLeaf.plural ?? new Set();
        for (const cat of enLeaf.plural) {
          if (!locCats.has(cat)) fail(`${locale}/${ns}.json plural "${ns}:${key}" missing category "${cat}"`);
        }
        if (locale === 'ar') {
          for (const cat of PLURAL_CATS) {
            if (!locCats.has(cat)) fail(`${locale}/${ns}.json plural "${ns}:${key}" missing Arabic category "${cat}"`);
          }
        }
        continue; // {{count}} is implicit for plural variants
      }

      if (locLeaf.leaf !== undefined && enLeaf.leaf !== undefined) {
        const enP = paramsOf(enLeaf.leaf);
        const locP = paramsOf(locLeaf.leaf);
        for (const p of enP) {
          if (!locP.has(p)) fail(`${locale}/${ns}.json "${ns}:${key}" lost placeholder {{${p}}}`);
        }
        for (const p of locP) {
          if (!enP.has(p)) fail(`${locale}/${ns}.json "${ns}:${key}" has unknown placeholder {{${p}}}`);
        }
      }

      if (locLeaf.array !== undefined && enLeaf.array !== undefined
        && locLeaf.array.length !== enLeaf.array.length) {
        fail(`${locale}/${ns}.json "${ns}:${key}" array length ${locLeaf.array.length} ≠ ${enLeaf.array.length}`);
      }
    }
  }
}

// Nested plural objects are not a valid i18next v26 format — reject them so
// nobody ships the broken shape again.
for (const [key, sources] of nestedPluralKeys) {
  fail(`${[...sources].join(', ')}: "${key}" uses the nested plural format — i18next v26 needs the suffix form ("${key}_one" / "${key}_other")`);
}

if (problems) {
  console.error(`\n✗ i18n check failed with ${problems} problem${problems === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`✓ i18n check passed: ${locales.length} locale(s) in sync with en across ${Object.keys(en).length} namespaces`);