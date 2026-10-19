# AGENTS.md — FCAI-Visualizer (AlgoVs)

Educational algorithm & data-structure visualizer built for FCAI-CU students.
React 19 + Vite 8, plain JavaScript/JSX (**no TypeScript**), Canvas 2D rendering,
deployed to Vercel. Algorithm logic is deliberately decoupled from React.

## Commands

Node 24.x is pinned (`.node-version`, `engines: 24.x`).

### Choosing a Node setup (developers and AI agents)

- If Node 24.x is already available, use ordinary `npm` commands. The portable
  setup is optional.
- If a developer prefers not to install or upgrade Node globally, Windows
  x64/ARM64 users can use the shared **portable, project-local Node** tooling:
  run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-node.ps1` once,
  then use `.\npm.cmd <args>` (for example, `.\npm.cmd install`). The launcher
  selects the local runtime for npm and child scripts without changing the
  system installation or persistent PATH.
- AI agents: respect the developer's chosen setup. When they request a local
  runtime on Windows, use this tooling rather than installing Node globally.
  If `.tools/` already contains the pinned runtime, use `.\npm.cmd` directly.
- `.node-version`, `scripts/setup-node.ps1`, and `npm.cmd` are shared tooling;
  keep them in Git. Downloaded `.tools/` contents and `node_modules/` stay ignored.
  Rerun setup when the pinned version changes. This installer is Windows-only;
  on macOS/Linux use an existing Node 24.x or a user-local version manager.

The commands below use the optional Windows launcher; replace `.\npm.cmd` with
`npm` when using your own Node 24.x installation.

```powershell
.\npm.cmd run dev        # Vite dev server
.\npm.cmd run lint       # ESLint (flat config) — must pass before finishing work
.\npm.cmd run build      # production build (Vercel deploys with this)
.\npm.cmd run preview    # serve the dist/ build
```

- **Tests are not wired up.** `src/algorithms/trees/RedBlackTree.test.js`
  exists but there is no `test` script and no runner dependency. Treat tests
  as informational; verification = `npm run lint` + exercising the affected
  page in the dev server, plus a full `npm run build` when touching build
  config or many files.
- Do not hand-edit `dist/` (build output) or `package-lock.json`.

## Architecture (layered — keep it)

```
src/
  domain/          Pure model layer. No React, no DOM import.
    algorithms/    Algorithm base class, AlgorithmMetadata, Step (playback unit)
    apikeys/       ApiKey entity
    quiz/          Question entity
  application/     Use cases + strategies + registry
    AlgorithmRegistry.js     ← single source of truth for algorithm discovery
    algorithms/<category>/   Step-generating strategy classes; category base
                             classes: SortingAlgorithm, SearchingAlgorithm,
                             TreeAlgorithm, GraphAlgorithm, DataStructureAlgorithm
                             (all extend domain Algorithm)
    apikeys/ApiKeyManager.js key rotation & status
    quiz/GenerateQuestionUseCase.js
  algorithms/      Pure-JS engines + imperative canvas visualizers (older layer,
                   still in use): TreeBase + BST/AVLTree/RedBlackTree nodes,
                   DS engines (ArrayDS/QueueDS/StackDS/LinkedListDS),
                   treeVisualizer.js, dsVisualizer.js, sorting/searching/graph
                   visualizers, sortingGenerators.js
  infrastructure/  Adapters only: storage (localStorage), canvas renderers,
                   apikeys/ApiKeyStore.js
  services/        aiService.js — provider-agnostic AI fetch client with key
                   rotation, 429/401/402/403 handling, question caching
  pages/           React "playback controllers" (state: steps + stepIdx)
  components/      layout/ (Layout, Sidebar, Header), ai/, sorting/, shared/
  hooks/           useLang (persisted code language), useProgress (quiz state)
  audio/           audioEngine singleton — Web Audio stub, NOT wired to UI yet
  data/            algorithmData.js (complexity, names, explanations, code
                   snippets), courses.js
  styles/          CSS-variable design system; one CSS file per page area
api/chat.js        Vercel serverless proxy to OpenRouter (server-side key)
Red_Black_Tree/    C++ course reference implementation (do not modify)
scratch_*.cjs,     scratch/experiment files (leave alone)
src/algorithms/.../scratch.js
```

**Key rule:** new algorithm logic goes in the pure layers
(`domain` / `application` / `algorithms` engines). Pages only orchestrate
playback (generate steps → step forward/back → draw). Never put algorithm
logic inside components.

## The Step contract

`generateSteps()` returns an array of `Step` objects
(`src/domain/algorithms/Step.js`):
`{ arr, compare, swap, sorted, current, found, msg, codeLine, codeLines }`.

- `codeLine` is a single legacy line index; prefer `codeLines` keyed by
  language (`'js' | 'python' | 'cpp' | 'java' | 'csharp'` — see `useLang`).
- When adding/editing `codeSnippets` in `src/data/algorithmData.js`, line
  numbers stored in steps must stay aligned (snippets are stored as line
  arrays and joined by pages).
- Every step should carry a human-readable `msg` — it drives narration and
  screen readers.

## Adding an algorithm (registry pattern)

1. Create a class in `src/application/algorithms/<category>/` extending the
   category base class; implement `generateSteps()` and (if needed)
   `getDefaultInput()`.
2. Export it from the category's `index.js`.
3. Register it in the array at `src/application/AlgorithmRegistry.js`
   (fourth/fifth step matters — it is the only place pages look up algorithms).
4. Add metadata to `src/data/algorithmData.js`: `complexity`, `explanations`,
   `algoNames`, `codeSnippets` (multi-language, per language arrays of lines).
5. Add URL slug handling: route in `src/App.jsx`, title label in
   `src/components/layout/Header.jsx` (`TITLES` + `labels` maps), sidebar nav
   in `src/components/layout/Sidebar.jsx`. Some pages additionally filter by
   id lists (e.g. `SORTING_KEYS` in `src/pages/Sorting.jsx`).
6. Deep-link conventions: list route + `/<category>/<algo-slug>` route both
   render the same page (sync state from `useParams`).

## Canvas visualizer conventions

Visualizers (`treeVisualizer.js`, `dsVisualizer.js`, graph/sorting/searching
visualizers) build their DOM **imperatively** inside container. Follow the
existing pattern exactly:

- Scoped CSS class prefix per visualizer (`tree-*`, `ds-*`, …) with its CSS
  file in `src/styles/` imported by the page wrapper.
- Unique element ids per page (`tv-*`, `ds-*`, …) — they must not collide
  with other visualizers.
- Multiply by `devicePixelRatio` in `resizeCanvas()`; observe with
  `ResizeObserver`; support zoom/pan camera (`resetCamera()`).
- Must return `{ ..., destroy, resetCamera }`: cancel `requestAnimationFrame`,
  disconnect observers, remove window listeners, clear container. Pages call
  `destroy()` in their `useEffect` cleanup (see
  `src/components/shared/TreeVisualizerPage.jsx`) — never skip this, or
  double-mounts leak rAF loops.
- Theme: pages set `<html data-theme="light|dark">`
  (`Layout.jsx`, persisted as `fcai_visualizer_theme`). Canvas code cannot use
  CSS variables, so each visualizer defines its own `THEMES` map and picks by
  reading `data-theme`. Note the inconsistent key names (`night` in some
  files, `dark` in others; `THEMES.dark = THEMES.night` exists as alias) —
  match whichever the file you are editing uses.
- Accessibility: `role="img"` + `aria-label` on canvases, `aria-live="polite"`
  region for step narration. Keep these in new visualizers.

## Persistence & state

- All `localStorage` keys are prefixed `fcai_visualizer_`
  (`_lang`, `_theme`, `_training_progress`, question cache, API-key store).
  Wrap reads/writes in try/catch — Safari/private mode can block localStorage.
- User AI keys are entered on `/api-keys` and rotated by `ApiKeyManager`;
  a key hitting 429/401/402/403 is marked out of work and the next key is
  tried. Don't bypass this flow with raw `fetch` calls to AI providers.

## AI features & secrets

- **Never commit real API keys.** Client env vars (`VITE_*`, see
  `.env.example`) are exposed to the browser; server-side only
  (`api/chat.js` / Vercel env): `OPENROUTER_API_KEY`.
- Two AI paths exist: user-managed multi-provider keys
  (`src/services/aiService.js` + `/api-keys`) and the OpenRouter serverless
  proxy (`api/chat.js`). Keep new AI features consistent with one of them.
- `vercel.json` rewrites everything except `/api/*` to `index.html` (SPA).

## Style & code conventions

- ES modules (`"type": "module"`). Import style is mixed: extension-less in
  React code, with explicit `.js` inside some engine files — match the file
  you are editing.
- ESLint flat config (`eslint.config.js`) extends `react-hooks` +
  `react-refresh/vite`; run `npm run lint`.
- UI icons come from `lucide-react`. Styling is primarily the custom
  CSS-variable system in `src/styles/` (one CSS file per page, imported by
  the page) — Tailwind v4 is configured via the Vite plugin but existing
  pages don't rely on it.
- React 19 + React Router v7 (imported from `react-router-dom`).
- Step-generation and engine code should be framework-free pure JS

## One-off reference

- `Red_Black_Tree/` (C++) is course reference material — the JS
  `src/algorithms/trees/RedBlackTree.js` mirrors it; keep semantics in sync
  if you change either.
- `npm.cmd` and `scripts/setup-node.ps1` are maintained optional portable-Node
  tooling; keep their behavior aligned with `.node-version`.
- `algoviz-react/` is a separate existing directory; leave it alone unless the
  task specifically targets it.
