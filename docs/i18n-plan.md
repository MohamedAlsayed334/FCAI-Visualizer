# i18n / Translation Layer Plan — FCAI-Visualizer (AlgoVs)

Plan for adding an Arabic-first i18n layer, with the ability to add any other language later.
No files are modified by this plan alone; it is implementation-ready after the open questions are answered.

---

## 1. Current state

### Stack
- React 19.2 + Vite 8, plain JavaScript/JSX (no TypeScript).
- Routing: `react-router-dom` v7, `BrowserRouter` + `<Routes>` in `src/App.jsx`.
- No state-management library: local React state + `localStorage`.
- Styling: CSS variables + one CSS file per page/feature; Tailwind v4 is configured but barely used.
- Icons: `lucide-react`.
- Build: Vercel + `api/chat.js` serverless proxy.
- Lint: ESLint 10 flat config. No test script, no CI workflow.

### i18n readiness: none
- No i18next / react-intl / lingui and no custom translation layer.
- `index.html` is static `lang="en"` with no `dir`.
- `src/hooks/useLang.js` is **not UI language** — it stores the selected **code language** (`js/py/cpp/java/csharp`) under `fcai_visualizer_lang`.
- The only locale-sensitive code found is `src/components/ai/ApiKeyTable.jsx`, which hardcodes `toLocaleTimeString('ar-EG')`.

### Where user-facing text lives

| Area | Location | Approximate scale |
|---|---|---|
| React UI chrome | pages/components | ~130 JSX text/attribute literals across 21 files |
| Catalog content | `src/data/courses.js` | 2 courses, 10 topics, 3 tools |
| Algorithm content | `src/data/algorithmData.js` | 17 explanation bodies, 28 algorithm names, 27 complexity entries, 5-language code snippets |
| Step narration | `src/application/algorithms/**`, `src/algorithms/**` | 148 `msg:` literals (41 application + 107 engine, excluding scratch) |
| Tree narration | `src/algorithms/trees/{BST,AVLTree,RedBlackTree,TreeBase}.js` | 84 `explanation:` + 86 `operation:` literals |
| Old DS engines | `src/algorithms/dataStructures/{ArrayDS,StackDS,QueueDS,LinkedListDS}.js` | ~109 text/HTML lines plus control labels |
| Quiz fallback | `src/components/ai/QuizPanel.jsx` | 113 built-in English questions |
| Imperative visualizer DOM/canvas | tree, DS, graph, sorting, searching visualizers and canvas renderers | hundreds of labels; details below |
| Static meta | `index.html` | title, description, keywords |
| CSS-generated text | `src/styles/Training.css` | `content: 'Coming Soon'` — cannot be translated by JS |

### Imperative visualizer labels

These are outside React and need a plain-JS `t()` function:

- `sortingVisualizer.js`: `${n} elements`, merge phases (`▼ SPLITTING`, `▲ MERGING`, `✅ SORTED`), quick phases (`▶ PIVOT SELECTED`, `● SCANNING`, `⇄ SWAPPING`, `✓ PIVOT PLACED`), counting labels (`ORIGINAL`, `COUNT[ ]`, `OUTPUT[ ]`, `● COUNTING`, `● BUILDING OUTPUT`, `● INIT`), pointer labels (`pivot`, `i`, `j`, `≤ pivot`, `> pivot`).
- `searchingVisualizer.js`: `Generate an array to begin`; pointer labels `lo`, `hi`, `mid`.
- DS engines: `← TOP`, `HEAD`, `TAIL`, `FRONT`, `REAR`, `[index]`, plus all control-panel HTML.
- `treeVisualizer.js`: titles, section labels, buttons, hints, property lists, stats, presets, code panel, status/popup text, aria labels, canvas `grandparent`, `Press Play to insert values.`
- Graph visualizers: panel titles, setup/edge-mode/traversal/drag labels, code-trace labels, speed/reset/clear, status, adjacency output, canvas edge weights, `d:` distances, discovery/finish labels.
- Infrastructure renderers used by Compare: `TreeCanvasRenderer` (`height … · … nodes`, `Press Play…`), `GraphCanvasRenderer` (`Queue:`, `Visit order:`), `DataStructureRenderer` (`← TOP`).

### RTL readiness: fragile
- Root has no `dir`.
- `src/styles` contains 61 physical directional declarations; `src/components/layout/Sidebar.css` adds many more (`border-right`, `right`, `padding-left`, etc.).
- Absolute-positioned panels, fixed 286px sidebar, 300px tree panel, 380px code panel.
- Directional icons throughout: `ArrowLeft/Right`, `ArrowUpRight`, `ChevronLeft/Right`, `SkipBack/Forward`.
- Fonts are Inter/Manrope/JetBrains Mono; no Arabic font.
- Canvas visuals must stay LTR; CSS mirroring must not touch them.

### Main risks
- Narration is split across two layers: registry wrappers and old engines both emit English.
- Canvas text cannot be translated through React.
- Code panels and Big-O notation must stay LTR even on RTL pages.
- `ApiKeyTable` already has a hardcoded Arabic locale.
- 113 fallback quiz questions are a large content-translation task.
- AI cache key does not include UI locale.
- Header titles, Sidebar labels, `courses.js`, `algoNames`, and ControlPanel dropdowns duplicate the same names.

---

## 2. Recommended approach

Use **i18next + react-i18next**, with a small Vite-backed lazy loader.

Why:
- `i18n.t()` works outside React, which is required by canvas visualizers.
- Namespaces, fallback language, interpolation and pluralization are built in.
- `react-i18next` gives components `useTranslation`.
- Locale files can be lazy-loaded with Vite `import.meta.glob` + `i18next-resources-to-backend`; only the active locale/namespace is fetched.
- It supports Arabic plural categories through `Intl.PluralRules`.

**Alternative:** `react-intl`/FormatJS. Its ICU message format is excellent for complex plurals/select messages, but it has weaker namespace/lazy-load ergonomics and requires more manual setup for canvas code. `@lingui` is another option but adds compile-time macros to the Vite pipeline — more invasive for this plain-JS project.

### Important boundary

Strictly zero edits to algorithm files is not achievable if we want structured keys and parameters. The only alternative is matching English strings at render time, which is brittle and duplicates logic.

So define "zero logic changes" as:

- Algorithm decisions, state transitions, and visualizer drawing math are untouched.
- Generators add **data-only** `msgKey` / `msgParams` fields alongside the existing English `msg`.
- Visualizers gain text-only edits; no algorithm or drawing changes.
- `api/chat.js` remains untouched; `aiService` gains an optional `locale` parameter and locale-aware cache key.
- No translation import in `src/domain` or in algorithm decision code.

Target flow:

```text
React UI ──────────────► useT() / useTranslation()
Imperative visualizers ─► i18n.t()
Generators ────────────► { msgKey, msgParams } ─► stepText()
AI service ────────────► locale + localized prompt
```

---

## 3. Proposed structure and key convention

```text
src/i18n/
  config.js              # default/fallback locale, storage key, auto-discovery
  i18n.js                # i18next init + lazy backend
  LocaleProvider.jsx     # sets <html lang/dir>, persists locale, route remount
  useLocale.js           # UI locale hook (NOT useLang)
  useT.js                # typed JSDoc wrapper for component translations
  format.js              # Intl number/date/duration/plural helpers
  stepText.js            # msgKey -> translated step text
  keys.d.ts              # generated key union for autocomplete/checkJs
  locales/
    en/
      meta.json
      common.json
      home.json
      catalog.json
      sorting.json
      searching.json
      dataStructures.json
      trees.json
      graphs.json
      practice.json
      compare.json
      apiKeys.json
      algorithms.json
      steps.json
    ar/
      meta.json
      ...same namespaces
```

`meta.json` is the registration point:

```json
{
  "name": "Arabic",
  "nativeName": "العربية",
  "dir": "rtl",
  "defaultNumberingSystem": "latn",
  "numberingSystems": ["latn", "arab"],
  "fontFamily": "\"Noto Sans Arabic\", \"Segoe UI\", sans-serif"
}
```

`config.js` auto-discovers locale folders and namespace files with `import.meta.glob`.
Adding a language means dropping in a folder — no source-code change.

### Key rules

- Semantic keys, never English text: `sorting:controls.arraySize`, not `"Array Size"`.
- Namespace per feature: `home`, `sorting`, `practice`, etc. New feature = new namespace file.
- Shared UI: `common:actions.reset`, `common:a11y.closeNavigation`, `common:units.steps`.
- Algorithm content: `algorithms:bubble.name`, `algorithms:bubble.explanation.intro`, `algorithms:bubble.explanation.bullets`, `algorithms:bubble.complexityNote`.
- Narration: `steps:sorting.bubble.compare`, `steps:searching.binary.found`, `steps:trees.avl.rotateRight`, `steps:dataStructures.array.insert`.
- Course content: `catalog:data-structure.title`, `catalog:data-structure.topics.arrays.description`.
- All interpolation uses named placeholders: `{{count}}`, `{{left}}`, `{{right}}`, `{{index}}`.
- Arabic plural keys use `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.
- Code, pseudocode, variable names, identifiers, and Big-O strings are not translation keys and are rendered with `dir="ltr"` / `<bdi>`.
- Use `Trans` only for sentences with inline markup; never build sentences by concatenation.

Example:

```json
{
  "compare": "Comparing a[{{i}}]={{left}} with a[{{j}}]={{right}}",
  "elements_one": "{{count}} element",
  "elements_other": "{{count}} elements"
}
```

Arabic gets the full plural set for `elements_*`; i18next falls back to English if a key is missing.

### Locale resolution

Recommended order:

1. `?lang=ar` query parameter (shareable/debug override)
2. `localStorage["fcai_visualizer_locale"]`
3. `navigator.languages` match
4. `DEFAULT_LOCALE` (`en`)

Use `FALLBACK_LOCALE = 'en'`. Do not use path-prefix routing now: all existing links are absolute and Vercel rewrites everything to `index.html`; a prefix would require a broad routing/link change. Query + persistence is enough for this app.

### Language switching

On switch:

1. Load locale namespaces.
2. Persist to `fcai_visualizer_locale`.
3. Update `<html lang>` and `<html dir>`.
4. Update `?lang=`.
5. Remount the route content with `key={locale}` on the `<Outlet />` wrapper.

The remount is the simplest way to make imperatively-built visualizer DOM and canvas labels re-render in the new language without adding reactive `setLocale()` APIs to every engine. It loses current visualization state on switch, which is acceptable for a rare action; this can be improved later.

---

## 4. Migration plan

### Phase 0 — Baseline and guardrails
- Document the string inventory and i18n rules in `docs/i18n.md`.
- Add skeleton `i18n:check` and `scan-ui-strings` scripts with an exclusion list.
- Declare excluded areas: `dist/`, `Red_Black_Tree/`, `algoviz-react/`, `scratch_*.cjs`, `src/algorithms/**/scratch.js`, `src/algorithms/trees/RedBlackTree.test.js`.
- No UI behavior changes.

**Exit:** scripts exist and report current counts; no source logic touched.

### Phase 1 — i18n foundation and locale plumbing
- Install `i18next`, `react-i18next`, `i18next-resources-to-backend`.
- Add `src/i18n/config.js`, `i18n.js`, `LocaleProvider.jsx`, `useLocale.js`, `format.js`.
- Wrap the app inside `BrowserRouter` so `useSearchParams` works.
- Set `lang`/`dir` before rendering content, with `useSuspense: false` or an explicit suspense boundary.
- Add `en/meta.json`, `en/common.json`, and an English-only language switcher in `Header.jsx`.
- Add `key={locale}` on the route content wrapper in `Layout.jsx`.
- Update `index.html` only for the Arabic font preconnect if desired; no static locale map.

**Exit:** English UI is visually identical; locale persists; `?lang=ar` sets `dir` correctly even while most keys fall back to English.

### Phase 2 — Extract React UI chrome and static visualizer DOM
- Replace JSX literals, tooltips, placeholders, aria labels, and error strings with `t()`.
- Convert `Header.TITLES` and `labels` to title-key maps.
- Convert `Sidebar` labels, section titles, support links, aria labels.
- Convert `Home`, course cards/overview/topic cards, `NotFound`, `ApiKeys`, `ApiKeyTable`, `PracticeMode`, `QuizPanel` shell, `ScoreBoard`, `Compare` shell/errors/presets, `Sorting`/`Searching` page chrome, `ControlPanel`, `ComplexityPanel`, shared `CodePanel`.
- Split `courses.js`: keep IDs, routes, icons, colors, lesson counts; move titles/descriptions/tags/eyebrows to `catalog.json`.
- Convert static DOM templates in `treeVisualizer`, `dsVisualizer`, graph visualizers, and DS engine `getHTMLControls()` to use `i18n.t`.
- Remove `content: 'Coming Soon'` from `Training.css`; render it as a JSX node with `t()`.
- Fix `ApiKeyTable` to use `formatTime(ts, locale)` instead of `'ar-EG'`.

**Exit:** no hardcoded UI strings in React chrome; English output is byte-for-byte equivalent at the UI level; lint/build pass.

### Phase 3 — RTL, fonts, and logical CSS
- Set `dir="rtl"` for Arabic via `LocaleProvider`.
- Convert layout chrome to logical properties:
  - `margin-left/right` → `margin-inline-*`
  - `padding-left/right` → `padding-inline-*`
  - `border-left/right` → `border-inline-*`
  - absolute `left/right` panels → `inset-inline-*`
  - `text-align: left/right` → `start/end`
- Add `[dir="rtl"]` overrides only where logical properties are insufficient.
- Mirror directional icons with a shared `.icon-directional` class; do not mirror play/pause, check, search, sun/moon, or rotation icons.
- Pin code/algorithm content to LTR: code panels, line numbers, pseudocode, Big-O spans, canvas wrappers. Do not blanket-convert code-panel borders/text alignment to logical properties.
- Add Arabic font fallback and reset `letter-spacing` on Arabic labels.
- Remove fixed-width overflow risks or add wrapping / `min-width: 0`.

Files: `Sidebar.css`, `TreeVisualizer.css`, `DataStructures.css`, `CourseCatalog.css`, `Searching.css`, `GlobalStyles.css`, `Compare.css`, `ApiKeys.css`, `Training.css`, plus `Header.jsx`, `Sidebar.jsx`, `CodePanel.jsx`.

**Exit:** Arabic shell is fully RTL, code/canvas stay LTR, sidebar collapse works on the correct side, no horizontal overflow at mobile widths.

### Phase 4 — Content and AI localization
- Keep `src/data/algorithmData.js` as a compatibility facade; move non-translatable data to `src/data/algorithmCatalog.js`:
  - keep: IDs, Big-O values, `codeSnippets`, `codeMap`, `javaCodeMap`;
  - move: algorithm names, explanation bodies, complexity notes to `algorithms.json`.
- Keep English `algoNames`/`explanations` exports as fallback for existing engine imports; UI uses `algorithms:<id>.*`.
- Prefer structured explanation content (`intro`, `bullets`) over HTML strings; current Sorting page strips HTML anyway.
- Localize `courses.js` content through `catalog.json`; keep structure separate.
- Localize AI:
  - add optional `locale`/`localeName` to `generateQuestion`, `evaluateAnswer`, and trace prompts;
  - instruct AI to respond in the selected locale, keep JSON keys English, keep code/Big-O LTR, keep option letters A–D;
  - add locale to `getCacheKey` and bump the cache storage key version;
  - keep `api/chat.js` as a pure proxy.
- Map AI/user-facing errors to `practice:errors.*`; do not display raw English `err.message`.
- Move the 113 fallback questions to per-locale content files with lazy loading; English remains the fallback. Translate them after the UI/AI path, or defer explicitly.

**Exit:** algorithm names/explanations/complexity labels and AI output follow the selected locale; missing keys fall back to English.

### Phase 5 — Step narration

Split this into shippable sub-phases by algorithm family.

1. **Contract**
   - Extend `Step` with optional `msgKey` and `msgParams`, preserving `msg` as fallback.
   - Add `operationKey`/`operationParams` and `explanationKey`/`explanationParams` for tree events.
   - Add `stepText()`/`eventText()` helpers that call `i18n.t`.

2. **Sorting/searching**
   - Migrate `sortingGenerators.js` (16 literals) and `searchingGenerators.js` (16 literals).
   - Render via `stepText()` in `Sorting.jsx` and `Searching.jsx`.

3. **Application-layer DS/graphs**
   - Migrate 41 DS and 17 graph `msg` literals in `src/application/algorithms/**`.
   - Render in `Compare.jsx` and any visualizer consumers.

4. **Tree engines**
   - Migrate `BST.js`, `AVLTree.js`, `RedBlackTree.js`, `TreeBase.js`: 84 explanations + 86 operation labels.
   - Keep the engine pure; only attach keys/params.
   - Render in `treeVisualizer.js` popups/steps and Compare.

5. **Old DS engines**
   - Migrate `ArrayDS.js`, `StackDS.js`, `QueueDS.js`, `LinkedListDS.js` step messages; static control labels are already done in Phase 2.
   - Render in `dsVisualizer.js`.

6. **Canvas labels**
   - Translate static phase/heading labels where safe.
   - Keep technical markers (`i`, `j`, `mid`, `lo`, `hi`, `pivot`, `HEAD`, `TAIL`, `FRONT`, `REAR`, `TOP`, `d:`, `f:`) LTR and untranslated.
   - Set explicit LTR direction/font for technical canvas text; use Arabic font only for translated full phrases.
   - Wait for `document.fonts.ready` before drawing translated canvas text.

**Exit:** every presentation step has a key, English fallback remains, and Arabic narration is available for at least sorting/searching; remaining families can ship independently.

### Phase 6 — Tooling and CI
- `npm run i18n:check`:
  - missing/extra/empty keys per locale;
  - placeholder parity;
  - Arabic plural category completeness;
  - unused-key report (warning);
  - identical-to-English report (warning).
- `npm run i18n:scan`:
  - flag JSX text and translatable attributes;
  - flag `fillText('...')` and `` innerHTML = `...` `` literals in visualizer files;
  - allow `i18n-ignore` / `eslint-disable-next-line` for intentional strings.
- ESLint:
  - prefer `eslint-plugin-i18next/no-literal-string` if it supports ESLint 10;
  - otherwise use core `no-restricted-syntax` selectors for JSXText and `placeholder|title|aria-label|alt` attributes, plus the custom scan script for imperative files.
- Key safety:
  - generate `src/i18n/keys.d.ts` from English JSON;
  - type `t()`/`useT()` with JSDoc `TranslationKey`;
  - add `jsconfig.json` with scoped `checkJs` and `npm run typecheck` using a TypeScript dev dependency. This does not introduce TypeScript source files.
- Coverage script:
  - import/parse `AlgorithmRegistry` IDs and `courses.js` IDs;
  - fail if a registered algorithm lacks `algorithms:<id>.name`/`.explanation`, or a course lacks `catalog:<id>.*`;
  - warn on missing `steps` coverage.
- Add `docs/i18n.md`: "Add a string", "Add a feature namespace", "Add a language", "Add an algorithm", plural/interpolation rules, LTR exceptions, glossary.
- Add `.github/workflows/ci.yml` (none exists today) running `npm ci`, `npm run lint`, `npm run i18n:check`, `npm run i18n:scan`, `npm run build`.

**Exit:** a hardcoded string or missing Arabic key fails verification; adding an algorithm without translation fails CI.

### Phase 7 — Prove "new language = folder only"
- Add a third locale folder with `meta.json` and partial namespaces.
- Confirm it appears in the switcher, loads lazily, falls back to English, and requires no source edits.
- Keep this as a repeatable validation step, not a permanent test locale unless desired.

---

## 5. Files/areas per phase

| Phase | Primary files/areas |
|---|---|
| 0 | `docs/i18n.md`, `scripts/i18n-check.mjs`, `scripts/scan-ui-strings.mjs`, `package.json`, optional `.github/workflows/ci.yml` |
| 1 | `src/i18n/*` (new), `src/App.jsx` or `src/main.jsx`, `src/components/layout/{Layout,Header,Sidebar}.jsx`, `index.html`, `src/i18n/locales/en/{meta,common}.json` |
| 2 | `src/pages/{Home,NotFound,ApiKeys,PracticeMode,Compare,Sorting,Searching,Graphs}.jsx`; `src/components/shared/{CourseCard,TopicCard,CourseOverview,CodePanel}.jsx`; `src/components/sorting/{ControlPanel,ComplexityPanel}.jsx`; `src/components/ai/{QuizPanel,ScoreBoard,ApiKeyTable}.jsx`; `src/data/courses.js`; static DOM sections of `src/algorithms/trees/treeVisualizer.js`, `src/algorithms/dataStructures/dsVisualizer.js`, graph visualizers, old DS engine `getHTMLControls()`; `src/styles/Training.css` |
| 3 | `src/components/layout/Sidebar.css`; `src/styles/{GlobalStyles,TreeVisualizer,DataStructures,CourseCatalog,Searching,Compare,ApiKeys,Training}.css`; `src/components/shared/CodePanel.jsx`; icon usage in `Header.jsx`/`Sidebar.jsx`; `LocaleProvider.jsx`; `index.html` font link |
| 4 | `src/data/algorithmData.js` (split/facade), new `src/data/algorithmCatalog.js`; base algorithm classes only if name-key helpers are needed; `src/pages/Sorting.jsx`, `Searching.jsx`, `Compare.jsx`; `src/services/aiService.js`; `src/application/quiz/GenerateQuestionUseCase.js`; `src/components/ai/QuizPanel.jsx`; `src/i18n/locales/*/{algorithms,practice}.json`; `TracePanel.jsx` optionally later |
| 5 | `src/domain/algorithms/Step.js`; `src/i18n/stepText.js`; `src/algorithms/sorting/sortingGenerators.js`; `src/algorithms/searching/searchingGenerators.js`; `src/application/algorithms/dataStructures/*.js`; `src/application/algorithms/graphs/*.js`; `src/application/algorithms/trees/*.js`; `src/algorithms/trees/{BST,AVLTree,RedBlackTree,TreeBase}.js`; `src/algorithms/dataStructures/{ArrayDS,StackDS,QueueDS,LinkedListDS}.js`; renderers in `src/algorithms/trees/treeVisualizer.js`, `src/algorithms/dataStructures/dsVisualizer.js`, graph visualizers, `src/pages/Compare.jsx`, `src/infrastructure/canvas/*`; `src/i18n/locales/*/steps.json` |
| 6 | `scripts/i18n-check.mjs`, `scripts/scan-ui-strings.mjs`, `scripts/gen-i18n-types.mjs`, `scripts/check-algorithm-i18n.mjs`, `eslint.config.js`, `jsconfig.json`, `package.json`, `docs/i18n.md`, `.github/workflows/ci.yml` |
| 7 | `src/i18n/locales/<new-locale>/*` only |

---

## 6. Risks and edge cases specific to this project

1. **Two narration implementations.** Sorting/searching pages use `src/algorithms/*Generators`, while Compare uses `src/application/algorithms/*`; DS/Trees have separate engine implementations too. A key catalog must serve both, or the same action will be translated differently in two places.
2. **`Step.msg` is part of the Step contract.** It feeds visible messages and `aria-live` regions. Keep `msg` as fallback while adding `msgKey`/`msgParams`; do not remove it until coverage is verified.
3. **Canvas Arabic is not React.** `fillText` does not automatically choose an Arabic font or reliably shape/measure text in every browser. Keep technical canvas text LTR, wait for fonts, and test Chrome/Safari/Firefox. Do not mirror canvas coordinates.
4. **Numbers and inputs.** `parseInt`/`Number` only accept ASCII digits. Keep algorithm inputs, indices, array values, and Big-O values ASCII/LTR. Use `Intl.NumberFormat` only for display counts. If Arabic-Indic digits are shown, normalize them before parsing.
5. **AI output can break the quiz contract.** If the AI translates option letters or identifiers, `QuizPanel`'s `charAt(0)` answer mapping breaks. The prompt must require English JSON keys, `A–D` option prefixes, LTR code, and untranslated Big-O. Add locale to the cache key and bump the cache version.
6. **113 fallback questions are a content project.** They are the largest translation cost and are used when AI is unavailable. Do not treat them as UI chrome; decide whether Arabic users may see English fallback initially.
7. **Title/name drift.** `Header.TITLES`, `Header.labels`, `Sidebar` links, `courses.js`, `algoNames`, and ControlPanel dropdowns all contain overlapping names. Use the same `algorithms:<id>.name` / `catalog:<id>.title` keys and add a coverage check; otherwise a new algorithm will be half-translated.
8. **Hardcoded-string lint will produce noise.** Code snippets, CSS classes, ARIA roles, IDs, graph tokens, parser syntax, `Red_Black_Tree/`, `algoviz-react/`, and scratch files must be excluded. JSX rules will not catch imperative `innerHTML` or `fillText`; a separate scanner is required.
9. **Dead/legacy code.** `HeroAnimation.jsx` is unused; `openInfo`/`openExplain`/`closeExplain` in `algorithmData.js` reference missing state; `TracePanel` is effectively unreachable because Tracing is "coming soon"; `learningTools` is unused. Exclude these from translation/lint until cleaned up.
10. **CSS-generated text.** `Training.css`'s `content: 'Coming Soon'` cannot be translated. It must become JSX text.
11. **RTL over-conversion.** Blanket-converting every `left/right` to logical properties will break the code panel: line numbers should stay right-aligned inside an LTR code block, and active-line borders should stay on the code's left. Apply logical properties to layout chrome, but pin code/algorithm content to LTR.
12. **Locale switching and imperative state.** Visualizers build DOM once. The recommended `key={locale}` route remount solves translation updates without engine APIs, but resets the current visualization. If preserving tree/array state matters, add `setLocale()`/`refreshLabels()` methods later.
13. **Static meta/SEO.** `index.html` title/description are static. Runtime title updates cover users, but crawlers will still see English. Full localized SEO requires path-prefix routing or prerendering — out of scope for this plan.
14. **Fixed-width layouts and Arabic text expansion.** Sidebar (286px/72px), tree panel (300px), code panel (380px), `white-space: nowrap` step messages, and header ellipsis need mobile/RTL checks. Reset `letter-spacing` on Arabic labels.
15. **Incidental bug while editing labels.** `ComplexityPanel.jsx` reads `complexity.average`, but `algorithmData.js` uses `avg`; the Average Time value is currently blank. Fix while extracting labels, but keep it separate from the translation layer.

---

## 7. Open questions

1. **URL strategy:** `?lang=ar` + localStorage (recommended, least invasive), or path-prefix routing `/ar/...` for SEO/shareable links?
2. **Library:** confirm i18next + react-i18next, or do you prefer `react-intl` / `@lingui` / a dependency-free custom layer?
3. **Arabic digits:** default to Western digits (recommended for a CS learning site) with an Arabic-Indic toggle, or default to Arabic-Indic?
4. **Content scope:** UI/AI first with English fallback, or full Arabic parity including the 113 fallback questions, 84 tree explanations, and canvas labels? Who supplies translations?
5. **Terminology:** keep algorithm names, code identifiers, and Big-O in English (recommended) or translate/transliterate algorithm names like "Heap Sort"?
6. **Switch behavior:** accept route remount and loss of current visualization state (recommended), or invest in reactive visualizer `setLocale()` methods?
7. **Tooling:** is adding a TypeScript dev dependency acceptable for scoped `checkJs` key checking, and should I add a GitHub Actions workflow?
8. **Font:** Noto Sans Arabic (recommended), IBM Plex Sans Arabic, or Cairo?
