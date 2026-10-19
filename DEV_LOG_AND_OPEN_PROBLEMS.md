# AlgoVs — Dev Log & Open Problems

> **Single source of truth** for what was built and reviewed, what is still broken, and the order to fix it in.
> Last updated: **2026-10-19** · Lint baseline: **62 problems (54 errors, 8 warnings)** · Build: **green** (617.8 kB, 1 chunk warning)
> Scope notes: **Practice Mode components are excluded by product decision** (only their unused-var lint entries remain, tracked under OP-10).

---

## 1. Status dashboard

| Area | State |
|---|---|
| Graph pages (BFS/DFS/Dijkstra) | ✅ Crash fixed, speed fixed, tabs added, Reset/Clear clipping fixed |
| Compare lab (`/compare`) | ✅ Reviewed end-to-end — works across all 5 groups |
| Tree engine (BST/AVL/RBT) | ✅ Recorder refactor verified correct |
| Lint gate | ❌ Red — 62 problems (was 605 at session start) |
| Known user-facing bugs | ❌ 4 quick ones open (OP-04…OP-07) |
| AI keys flow | ❌ 2 logic bugs open (OP-02, OP-03) |

Reproduction of the lint number at any time: `.\npm.cmd run lint` (or `npm run lint`).

---

## 2. Dev log (chronological)

### 2026-10-19 12:29 — `f4942d4` “node 24.x local dev support and Agents.md”
- Added portable Node 24 tooling (`.node-version`, `scripts/setup-node.ps1`, `npm.cmd`) and the first `AGENTS.md`.
- **Review verdict:** commands work; AGENTS.md later refined by the team.

### 2026-10-19 13:24 — `2293af7` “added comparsion”
The Compare lab — side-by-side runs of two algorithms on one shared input, five groups (sorting, searching, graph traversal, MST, stack-vs-queue, BST-vs-AVL).

**Architecture (verified in review):**
- New renderers in `src/infrastructure/canvas/`: `CanvasRenderer` (sorting/searching), `GraphRenderer`, `TreeCanvasRenderer`, `DataStructureCanvasRenderer` — all DPR-aware, theme-aware (observe `data-theme`), with `destroy()`.
- **Singleton conflict solved:** `sortingVisualizer.js` / `searchingVisualizer.js` were module-level singletons; wrapped each in a factory (`createSortingVisualizer()` / `createSearchingVisualizer()`), so each Compare panel owns an isolated instance and the classic pages keep the named singleton. `CanvasRenderer.draw()` now also forwards `array`/`target` so search panels keep the target highlight.
- `CanvasRenderer`/`GraphRenderer`/`DataStructureCanvasRenderer` adapters all accept `(steps, stepIdx, …)` and clamp/guard; step counts per side may differ — index clamps to each run and the “Finished” badge freezes the panel.
- Data verified to line up: registry ids (`bst`, `avl`, `stack-ds`, `queue-ds`, `bfs`, `dfs`, `prim`, `kruskal`, `linear-search`…), complexity keys (`avg`, `access`, `insert`, `delete`, `search`, `space`), `foundIdx` for search results, `mstEdges`/`order`/`queue` shapes for graphs.
- Input validation is robust: self-loops and duplicate edges rejected, weights 1–999, ≤ 12 nodes / 24 edges, arrays 1–32 values 0–99, trees 1–10 values 0–99, ops “delete with value” rejected; searching pre-sorts one shared copy and documents that as preprocessing.
- Playback correctness (timer, speed, seek, replay-at-end, per-tick clamps) traced; StrictMode double-mount safe; remaining observers disconnected properly.

**Minor polish found (non-blocking, see OP-14):** the draw effect re-creates `ResizeObserver` + `MutationObserver` every tick; tree snippet highlight is pinned to line 1.

### 2026-10-19 14:24 — `c8389cf` “graph fixes, and animation standardization”
1. **Graph crash fix (colA).** `colA` (hex+rgba → rgba string) is now exported from `src/algorithms/trees/AVLTree.js` and imported by all three graph visualizers (20 call sites). Missing theme keys `edgeCol` / `nodeShadow` / `textDim` added to both themes. Root cause earlier: `colA` was referenced but never defined → ReferenceError on the first populated canvas frame, killing the rAF loop on /graphs/bfs, /dfs, /dijkstra. **Now verified: 0 lint mentions, pages render.**
2. **Speed fix.** Graph `sleep(ms / SPEED_TABLE[speedIdx])` divided by ms-per-step values (400/200/80) → real delays of 3–6 ms (invisible). Replaced with `SPEED_MULTIPLIERS = [0.6, 1.2, 2.5]` as divisors → true 600–2000 ms delays, applied to every `sleep` call site in all three visualizers. (`SPEED_TABLE` intentionally remains for the tree page’s tick system; `dsVisualizer` has its own multipliers.)
3. **`Graphs.jsx` cleanup.** Dead `alg`/`setAlg` state, unused `getAlgorithm` import and the double empty `try/catch` removed. Added BFS/DFS/Dijkstra tab nav (`role="tablist"`, aria-selected) that rewrites the path correctly under the course shell; `App.jsx` gained `/courses/data-structure/graphs/:algo` (`CourseGraphs` → `<Graphs />`).
4. **Tree engine standardization (the big one, −535 lines in `treeVisualizer.js`).**
   - `BST` / `AVLTree` `insert`/`delete` rewritten recursive → iterative with an optional `recorder` callback (`TreeBase._emit`, `_snapshotTree`). Events carry `operation`, `explanation`, `involved`, `roles`, `property`, `snapshot`.
   - AVL rebalance traced correct: bottom-up loop keeps parent attachment via object identity (`p.left === z` still holds after deeper rotations; `path[i] = newSubtreeRoot` keeps later iterations right); heights updated per node; cascading works.
   - BST delete: all three cases (leaf / one child / two children via in-order successor splice) verified — including the `succParent` splice when the successor is `curr.right` itself.
   - `treeVisualizer.js` now plays the *same* RBT-style recorded history for BST/AVL/RBT: interpolated snapshot transitions, pause/next/restart, per-type property checklist, lock message. Presets were rebuilt as recordings (no more async `setSlowMode` choreography) → **race/interruption-safe by construction**.
   - Predecessor/successor results highlight through the shared snapshot renderer (`isSearchHit`).
5. **Dijkstra double-click** resets the camera (320 ms threshold).

### 2026-10-19 14:57 — `f876e0a` “fix Ui clipping” (working-tree review before commit)
**Problem:** Reset Graph / Clear Graph buttons were clipped on the right.
**Root cause (deterministic):** `.tree-btn { width:100% }` with default content-box sizing → padding (32px) + border (3px) are **added** → button 35px wider than the 300px panel minus its 18px padding → clipped.
**Fix (verified complete):**
- `.tree-btn` now `box-sizing:border-box` — overflow mathematically zero, for **all** tree-page buttons too (same latent overflow existed there, including 2-button flex rows).
- Both buttons in `graphVisualizer.js`, `dfsVisualizer.js`, `dijkstraVisualizer.js` wrapped in `<section class="tree-section">` (inline `margin:8px 18px` removed); `.tree-section` provides the identical spacing (18px sides, 6px gap).
- Button ids unchanged (`gv-btn-reset/clear`, `dfs-btn-*`, `dj-btn-*`) → no handler impact. No other inline-margin `.tree-btn` remains in `src/algorithms/`.

### 2026-10-19 — lint repair for `scratch.js` (baked into `f876e0a`)
- `src/algorithms/sorting/scratch.js` is an **unimported** experimental file (duplicate animation drafts, multiple orphaned `frame()` functions, undefined `ctx`) contributing ~523 of the 585 lint problems without shipping in the bundle.
- Resolution: file-level banner `/* eslint-disable */` with a explanatory header (file kept intact; deleting it is also safe anytime). **Lint: 585 → 62.**
- Side-discovery: `api/chat.js` (`'process' is not defined` ×2) was always failing lint but hidden in earlier per-file truncation — tracked as OP-09.

---

## 3. Lint trajectory

| When | Problems | Notes |
|---|---|---|
| First review | 605 (599 err) | scratch.js ≈ 523 of these |
| After colA fix (uncommitted) | 592 | 13 colA no-undef gone |
| `c8389cf` graphs cleanup | 589 | Graphs.jsx dead state removed |
| Before standardization | 585 | minor diffs |
| `scratch.js` banner (**current**) | **62 (54 err, 8 warn)** | every count maps to an OP below |

Current 62 by file → owning OP:
- `api/chat.js` ×2 → **OP-09**
- `Searching.jsx` ×7 + `Sorting.jsx` ×7 (+ 7 warnings) → **OP-01**
- `algorithmData.js` ×9, `QuizPanel.jsx` ×6 (+1 warn), `useLang` ×3, `TracePanel` ×2, `HeroAnimation` ×2, `ApiKeyTable` ×2, `dsVisualizer` ×2, `sortingGenerators` ×2, `PracticeMode` ×2, `ComplexityPanel` ×1, `ControlPanel` ×1, `Algorithm.js` ×1, `GenerateQuestionUseCase` ×1 → **OP-10**
- `aiService.js` ×4 → **OP-11** (cache) + **OP-10** (dead exports)

---

## 4. Open problems — ranked

Legend: **P0** = correctness/blocking · **P1** = user-facing bug, quick win · **P2** = hygiene/dead code · **P3** = polish/perf.
Effort: XS < 30 min · S < 2 h · M < half day.

### P0 — fix first

**OP-01 · Search/Sorting page effect defects (React correctness + lint blockers)** — Effort M
- *Files:* `src/pages/Searching.jsx`, `src/pages/Sorting.jsx`
- *Evidence:* "Calling setState synchronously within an effect" ×9 (Searching 61/99/103/115/153; Sorting 45/77/119…), "Cannot access variable before it is declared" ×3 (Searching 62 → `resetPlayback`; Sorting 46–47 → `generateArray`/`reset`), `react-hooks/immutability` ×2 (Sorting 67, Searching 130 block).
- *Why it matters:* the URL-sync effect calls functions declared later with `const`; it happens to work today (the effect runs after render, so the TDZ has passed), but it is fragile and the lint gate stays red. The `set-state-in-effect` calls on `[algo]`/`[arraySize]` cause cascading renders and are the exact pattern React 19 lint refuses.
- *Fix plan:*
  1. Hoist `resetPlayback` / `generateArray` / `reset` (or their logic) above the effects that use them.
  2. Convert the "sync from URL" effect to run only when `urlAlgo` actually changes (guard as now), with the called functions declared before it.
  3. For the step-generation effect: derive steps during event handlers where possible, or keep the effect but silence with structured state (e.g. a `pendingGenerate` flag set in handlers, consumed by the effect).
  4. Fix the two `immutability` hits (line 67 `applyCustomInput` mutates nothing — the flagged pattern is calling `setArray(nums)` with the parsed array; wrap in a fresh array `[...nums]` and validate there).
- *Verify:* `npm run lint` — Searching/Sorting contribute **0** errors; deep-link `/sorting/quick`, switch algorithm via sidebar, change size slider, apply custom input; no double-generation, playback resets.

**OP-02 · ApiKeyManager can hand out a cooling-down key → 429 doom loop** — Effort S
- *File:* `src/application/apikeys/ApiKeyManager.js` (`getKeyForRequest()`, lines 72–97)
- *Evidence:* when all non-out-of-work keys are cooling down, the function falls back to the first cooldown key instead of reporting "all keys cooling" — the doomed key gets retried every request, 429s again, and the cooldown never helps.
- *Fix plan:* in `getKeyForRequest()`, filter to keys with `status === STATUS_ACTIVE && (!cooldownUntil || Date.now() >= cooldownUntil)`; if empty, try reviving expired cooldowns once (existing revive logic at line 52), else return `null` and let callers surface a friendly "all keys cooling down until HH:MM" message.
- *Verify:* with one key, trip a 429 (or force `cooldownUntil`), then request → UI message instead of a retry storm; after cooldown expiry the key is reused automatically.

**OP-03 · QuizPanel ignores user key pool — AI quiz dead without env key** — Effort S
- *File:* `src/components/ai/QuizPanel.jsx` line 640
- *Evidence:* `const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;` is the only source checked — keys entered on `/api-keys` (managed by `ApiKeyManager`) are never consulted, while other AI panels use the pool.
- *Fix plan:* route generation through the same code path other AI surfaces use (`src/services/aiService.js` / ApiKeyManager with rotation + `429/401/402/403` handling); fall back to the env key only if no user keys exist. Do **not** raw-`fetch` around ApiKeyManager (project rule).
- *Verify:* `/api-keys` with a valid key only (no env var) → quiz generates; env vars still work when present; key rotation marks a dead key out of work and moves to the next.

### P1 — user-facing bugs, quick wins

**OP-04 · ComplexityPanel shows empty Average/Worst (wrong data key)** — Effort XS
- *File:* `src/components/sorting/ComplexityPanel.jsx` line 14: `{complexity.average}` — every entry in `src/data/algorithmData.js` uses `avg`, so the value renders empty.
- *Fix:* line 14 → `{complexity.avg ?? '—'}` (keep the same styling for the Worst row if applicable).
- *Verify:* `/sorting/bubble` info panel displays `O(n²)` values.

**OP-05 · Header titles/breadcrumbs broken for search deep links (slug mismatch)** — Effort XS
- *File:* `src/components/layout/Header.jsx` line 31: labels map keys `linear` / `binary` / `jump` — actual route slugs are `linear-search` / `binary-search` / `jump-search` (registry ids confirmed). Deep-linked search pages fall back to a generic title.
- *Fix:* rename the three keys to match the slugs.
- *Verify:* open `/searching/binary-search` directly → title/breadcrumb say “Binary Search”.

**OP-06 · Sorting size slider silently caps at 20 elements** — Effort S
- *Files:* `src/pages/Sorting.jsx` line 60 (`instance.getDefaultInput().slice(0, size)`); `src/application/algorithms/sorting/SortingAlgorithm.js` `getDefaultInput()` hardcodes 20.
- *Symptom:* slider goes to N but every size > 20 yields the same 20-element array.
- *Fix plan (pick one):* (a) generate exactly `size` values in `generateArray` (respecting each generator’s own constraints) instead of slicing a fixed array; or (b) clamp the slider max to 20 until (a). Prefer (a): e.g. `Array.from({length: size}, …)` with the registry’s min/max range, and keep Counting/Radix in mind (see OP-07 — cap their custom path to the 0–99 domain or document k).
- *Verify:* slider 40 → bars count 40; steps still generate for quick/merge/counting.

**OP-07 · Counting/Radix accept unbounded/negative custom values** — Effort S
- *Files:* `src/components/sorting/ControlPanel.jsx` `handleApply()` (lines 35–46 — only "integers, ≥ 2, no range/negative check") → `src/pages/Sorting.jsx applyCustomInput()` → `src/algorithms/sorting/sortingGenerators.js` line 368 `new Array(max + 1)`.
- *Symptom:* custom `100000` allocates a 100k-slot count array; negative values are silently **dropped** from the output (arrays ignore negative index semantics in the reconstruction loop), radix buckets get garbage for negatives.
- *Fix plan:* validate in `ControlPanel.handleApply` — integers in `-99…999`? For this project, align with the shared contract used elsewhere: **0–99** for sorting/searching pages (a one-line regex + range check, matching the Compare page’s validation), show the existing error styling; optionally clamp negatives before calling generators if pedagogically desired (then document it in the panel).
- *Verify:* apply `1, 2, 999999` → error border + no freeze; apply `-5, 10` → either rejected or documented behavior, never silent data loss.

**OP-08 · Java/C# tabs render for languages with no snippets** — Effort S
- *Files:* `src/components/shared/CodePanel.jsx` (tabs list includes `java`, `csharp` — lines ~7–8) + `src/data/algorithmData.js` `codeSnippets` (only `js`, `python`, `cpp` are populated).
- *Symptom:* picking Java/C# shows an empty panel; the JS fallback hides the gap.
- *Fix plan:* filter the tab list by languages present for that algorithm (`Object.keys(snippet)`), or hide disabled tabs; keep `useLang` selection when available. Longer term: add the missing snippet arrays (lines in steps’ `codeLines` are already keyed by language — `java: 1, csharp: 1` entries exist in tree steps).
- *Verify:* every algorithm page shows only tabs that render code; tree compare snippets still highlight.

### P2 — hygiene / dead code (single sweep + tiny fixes)

**OP-09 · `api/chat.js` lint (node globals)** — Effort XS
- Add an eslint override in `eslint.config.js` for `api/**/*.js` with `globals.node` (or move `process.env` behind a helper the config knows). Do not touch the serverless logic.
- *Verify:* `npm run lint` shows no `api/chat.js` entries.

**OP-10 · Dead-code sweep to make lint green (≈30 remaining items)** — Effort S
- `src/data/algorithmData.js` — delete `openInfo` / `openExplain` / `closeExplain` (lines 58–190; they reference an undefined `state` and unused `algoExplanations`/`setStepMsg` — pure dead code, 9 lint hits).
- `src/pages/DFS.jsx` — unreachable (no route, no importers) → delete or route it; do not leave both.
- `src/algorithms/trees/AVLTree.js drawTree` — zero callers since the recorder refactor → remove (keep `THEMES`, `SPEED_TABLE`, `colA` exports).
- `src/algorithms/trees/TreeBase.js` — `highlightNode` / `clearHighlight` are unused; `setSlowMode()` is a stub → remove/stabilize.
- Unused imports/vars (1-liners): `TracePanel.jsx` (useCallback/useEffect), `HeroAnimation.jsx` (React), `ComplexityPanel.jsx` (React), `ControlPanel.jsx` (React), `useLang.js` (useEffect, `_`), `QuizPanel.jsx` (topic, correctLabel, errorType, accuracy, questionData/questionSource/errorMessage useful-assignment), `ApiKeyTable.jsx` (`refreshTick`), `dsVisualizer.js` (`currentSteps`, `titleMain`), `sortingGenerators.js` (codeLine/codeLines 242–243), `Algorithm.js` (`input`), `GenerateQuestionUseCase.js` (add `{ cause }` to the rethrown error), `PracticeMode.jsx` (topicScore, handleTopicChange — keep the file, just tidy).
- *Verify:* `npm run lint` = **0 problems**; run each affected page once in the dev server.

**OP-11 · aiService cache/user-key flow cleanups** — Effort S
- `src/services/aiService.js` line 166: question cache `pop()` (eviction) never re-persists → cache re-grows past its cap after reload. Persist after mutation.
- Dead exports `evaluateAnswer` / `generateTraceStep` (lines ~95/117 flagged unused `key` params at 7/15/25) → remove or wire up; also `modeDescription` useless assignment (line 187).
- *Verify:* cache stays capped across reload; unit check by toggling in devtools (`fcai_visualizer_*` keys).

**OP-12 · README drift** — Effort XS
- README claims React 18.3 / Vite 5.4 / Router v6 — actual: React 19.2, Vite 8, React Router 7, Node 24. Update versions and the lint/gate instructions (portable `.\npm.cmd`).

### P3 — polish

**OP-13 · Bundle 617 kB > 500 kB warning** — Effort M
- Vite suggests route-based code splitting; the tree/graph/DS visualizers are heavy. `React.lazy` per page (rows in `App.jsx`) is the natural cut. Only worth it after OP-01…OP-08 are done.

**OP-14 · Compare page minor polish** — Effort XS
- `ComparisonPanel` draw effect re-creates `ResizeObserver` + `MutationObserver` every tick (deps include `index`) — split observer setup from drawing (draw via ref).
- Tree snippet highlight pinned to line 1 (static `codeLines`) — either compute per-step or drop the highlight there.

**OP-15 · `/graphs/<unknown>` shows BFS but keeps the wrong URL** — Effort XS
- Add `<Navigate to="/graphs/bfs" replace />` when the slug isn’t in `VIZ_MAP` (same for the course route), preserving the deep-link contract.

---

## 5. Verified-clear register (do not “fix” these again)

| Item | Evidence it is resolved |
|---|---|
| `colA` graph crash | Graph pages render; 0 lint; exports verified (`AVLTree.js` 34–46) |
| Graph animation speed | `SPEED_MULTIPLIERS` all call sites (bfs/dfs/dijkstra ×…) |
| Reset/Clear clipping | box-sizing + section wrapper; spacing verified; ids unchanged |
| Side-by-side singleton conflict | Factory instances per Compare panel; pages keep singletons |
| BST/AVL recorded algorithms | Input/delete paths, rotations, reattachment, cascade traced |
| Compare data wiring | ids, complexity keys, `foundIdx`, `mstEdges`, validation all match |
| `scratch.js` lint | banner added; file unimported/unbundled — safe to delete anytime |
| Tests claim | none wired up; verification = lint + dev-server exercise (AGENTS.md) |

---

## 6. Suggested attack order

1. **OP-04 → OP-05** (two 1-line fixes, instant user-visible wins)
2. **OP-09 → OP-10** (config tweak + one sweep → **lint reaches 0**, gate green)
3. **OP-02 → OP-03** (AI key flow correctness)
4. **OP-06 → OP-07** (sorting input correctness)
5. **OP-01** (the M-effort React effect rework — last big one)
6. **OP-08, OP-11, OP-12**, then P3 polish (OP-13…15)

Rationale: items 1–2 green the lint gate quickly and remove the noise floor so OP-01’s rework happens with a clean signal.

---

## 7. Definition of done (per AGENTS.md)

- `npm run lint` passes (0 problems) — the project gate.
- Affected pages exercised in the dev server (`.\npm.cmd run dev`); full `npm run build` when touching build config, `api/**`, or many files.
- No algorithm logic in components; step generation stays in the pure layers (`domain` / `application` / `algorithms` engines).
- `localStorage` keys keep the `fcai_visualizer_` prefix; AI calls keep going through `aiService` / `ApiKeyManager` (never raw `fetch` to providers).
- Canvas visualizers keep their `destroy()` contracts and `data-theme` handling.

---

*This file is the handoff point for the next session: reopen §4 and work top-down; §5 lists what is already verified so it is not re-litigated.*
