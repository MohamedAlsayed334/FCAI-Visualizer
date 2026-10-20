# Question Levels — offline practice plan

Game-like offline practice: **topics → levels → stages of 5 questions**, with
stars, unlocks and progress persistence. All questions come from the built-in
bank — **no AI anywhere in this feature**. Mirrors the tone of `docs/i18n.md`;
references use `file:line`.

## 1. Goal & non-goals

**Goal.** A level-based quiz mode over the existing 97-question offline bank:
each topic has 3 levels (Easy / Medium / Hard — labels already translated
`quiz.levels.*` in all 4 locales), each level is split into **stages**, each
stage is a fixed, deterministic set of 5 questions. Passing stages earns stars
and unlocks the next stage/level. All chrome is i18n; question content stays
English this phase.

**Non-goals.**

- **No AI question generation** — the whole AI path is removed in Phase 0
  (below). This feature is 100% offline.
- **No localized question content this phase.** UI chrome uses `practice`
  namespace in en/ar/ja/zh; question content (q/options/exp) is English-only
  by decision (mirrors course material, like canvas annotations — see
  `docs/i18n.md` rule 5). Arabic/localized content is a deferred future phase
  (§7, Phase 3) — details out of scope here.

## 2. Current state inventory

What exists and is reusable:

- **Question bank** — module-private `FALLBACK_QUESTIONS` const,
  `src/components/ai/QuizPanel.jsx:82–282`. 97 questions, shape
  `{ q, options[4] ("A) …" prefixed), answer 'A'..'D', exp }`, organized
  `topic.type.difficulty` where type ∈ `general|code|complexity`. Question
  content is hardcoded English.
- **Offline quiz UI** — `QuizPanel.jsx` renders question/options/feedback with
  `quiz-*` classes from `src/styles/Training.css`; scoring is +10 per correct
  answer (`handleSubmit`, `:703–711`). The unused `.quiz-progress-bar` CSS
  (`Training.css:131`) is available for session progress.
- **Selection + generation helpers** — `getRandomQuestion` (`:291–376`) and
  `generateComplexityQuestions` / `generateCodeQuestions` / `generateAlgoOptions`
  (`:378–556`); the latter derive questions from `complexity`/`codeSnippets`
  in `src/data/algorithmData.js`. Useful to top up thin pools (§4).
- **Progress hook** — `src/hooks/useProgress.js` persists per-topic scores +
  streaks under `fcai_visualizer_training_progress` (try/catch wrapped), and
  computes an easy→medium→hard ladder (`calculateNewDifficulty`, `:122–133`)
  that **nobody consumes** — `getDifficulty` is exported but never read by
  QuizPanel. This feature will (a) consume it as a tie-breaker and (b) extend
  the schema with level progress (§6).
- **Practice page chrome** — `src/pages/PracticeMode.jsx` with
  `training-grid` / `training-card` cards (`Training.css:31–74`), topic icons
  and `TOPIC_COLORS` (`:16–21` — duplicated from `QuizPanel.jsx:284`;
  dedupe in Phase 2). `ScoreBoard` (stats/accuracy/streak/clear) stays as-is.
- **Trace mode** — static "Coming Soon" `TracePanel`; untouched by this plan.
- **Lesson vocabulary** — `src/data/algorithmData.js` (`complexity`,
  `algoNames`, `explanations`, `codeSnippets`) feeds the generators and can
  ground new hand-written questions.

**Known bug (confirmed).** `getRandomQuestion` takes no difficulty parameter;
its loop (`:345–362`) iterates `['easy','medium','hard']` and returns from the
first non-empty tier → the offline quiz is **effectively always easy**. Fixed
in Phase 1 (`fix(quiz): respect requested difficulty`).

## 3. Level system design (core spec)

### 3.1 Structure

```
topic (sorting | searching | trees | graphs)
 └─ level (easy | medium | hard)          labels: quiz.levels.* (translated)
     └─ stages[]  — each stage = fixed set of 5 questions
```

| Level  | Stages (default) | Questions | Notes |
| ------ | ---------------- | --------- | ----- |
| Easy   | 2                | 10        | first stage open by default |
| Medium | 2                | 10        | unlocked after Easy complete |
| Hard   | 1                | 5         | grows as content grows (§4.8) |

Stage counts are **data-driven config**, not hardcoded loops, so Hard can gain
stages later without UI changes. Per-topic bank target: 25 questions ×
4 topics = 100 (§4 measures what exists vs this).

### 3.2 Stage determinism

A stage is a **fixed, deterministic set of 5 questions** — no repeats within
a stage, identical across reloads and devices. Selection must not use
`Math.random()`/`Date`: the stage builder (§6) slices an **ordering of the
question pool** (stable ids, filtered by level/type, spread across the pool so
one stage doesn't cluster the same algorithm) using only index arithmetic.
The same 5 questions per stage forever is a feature (replayable, shareable,
progress-checkable), not a bug.

### 3.3 Scoring, pass, stars

- Each correct answer = **10 points** (current QuizPanel scoring, kept).
- **Stage pass = ≥3/5 correct.**
- **Stars:** 3/5 → 1★, 4/5 → 2★, 5/5 → 3★ (no pass below 3).
- **Stage replay improves stars** (`max(bestScore, thisRun)`); cleared stays
  cleared. Best score + stars persist per stage (§6 schema).

### 3.4 Unlocks

| Rule | Effect |
| ---- | ------ |
| stage n cleared | stage n+1 of same level unlocks |
| all stages of a level cleared | next level unlocks |
| Easy stage 1 | always open (topic's entry point) |

Unlocks are derived from persisted `cleared` flags; nothing is stored twice.

### 3.5 Question-type mapping per level

Uses the existing `general | code | complexity` tags:

| Level  | Content mix |
| ------ | ----------- |
| Easy   | ≈ general/factual + code *pattern identification* |
| Medium | ≈ complexity (best/avg/worst/space) + code reading |
| Hard   | ≈ code output/prediction + hardest complexity |

The bank's tags already skew this way naturally (§4); the stage builder
prefers the mapped types and falls back to other types within the same level
when a pool is thin.

### 3.6 Generated fill-in vs hand-written content

Thin pools may be topped up by the existing generators, but only where that is
acceptable (§4.2–4.3 marks cells):

- `generateComplexityQuestions`-style data (best/avg/worst/space per
  algorithm from `src/data/algorithmData.js`) — **acceptable** for
  complexity gaps; rotate answer letters when lifting (they always mark `A`).
- `generateCodeQuestions`-style ("which algorithm is this code") —
  **acceptable only for Easy** recognition slots.
- `general` questions and all Medium/Hard `code` questions — **hand-written
  content required** (checklist in §4.8).

## 4. Question bank audit (all 97 reviewed)

### 4.1 Verified counts and deficits

Counts machine-verified from `FALLBACK_QUESTIONS`; matches the owner's
approximations. **Needed per topic × level = 10 / 10 / 5** (from §3.1).

| Topic     | Level  | general | code | complexity | have | needed | deficit | note |
| --------- | ------ | ------- | ---- | ---------- | ---- | ------ | ------- | ---- |
| sorting   | Easy   | 5       | 5    | 3          | 13   | 10     | **+3**  | 2 near-dups (§4.4) reduce effective to 11 |
| sorting   | Medium | 5       | 2    | 2          | 9    | 10     | **−1**  | hand-written |
| sorting   | Hard   | 5       | 1    | 1          | 7    | 5      | **+2**  | includes 2 broken items (§4.5) → effective ≈ +0 |
| searching | Easy   | 3       | 1    | 3          | 7    | 10     | **−3**  | 2 near-dups → effective −5; 1 gen-fillable cell |
| searching | Medium | 2       | 0    | 2          | 4    | 10     | **−6**  | code pool empty — hand-written only |
| searching | Hard   | 1       | 0    | 1          | 2    | 5      | **−3**  | code pool empty — hand-written only |
| trees     | Easy   | 5       | 2    | 2          | 9    | 10     | **−1**  | hand-written (heap property) |
| trees     | Medium | 5       | 2    | 2          | 9    | 10     | **−1**  | hand-written |
| trees     | Hard   | 5       | 1    | 2          | 8    | 5      | **+3**  | spare slots → heap/RB-tree content (§4.7) |
| graphs    | Easy   | 5       | 4    | 3          | 12   | 10     | **+2**  | 1 DFS duplicate (§4.4) → effective +1 |
| graphs    | Medium | 5       | 2    | 2          | 9    | 10     | **−1**  | hand-written (Dijkstra walkthrough) |
| graphs    | Hard   | 5       | 1    | 2          | 8    | 5      | **+3**  | spare slots → MST/SSSP code output |
| **Total** |        |         |      |            |      |        | **97**  | target 100 |

**Deficit verdict:** raw ≈ **−16 spread over searching (−12), trees (−2),
graphs (−1), sorting (−1 when broken items are excluded)**; after dedupe
(§4.4) and removing/fixing broken items (§4.5) the **net hand-written need is
≈ 20 questions**, dominated by **searching Medium/Hard code questions**
(6+3 = 9) and searching Easy (5).

### 4.2 Where generated fill-in is acceptable (per gap cell)

| Gap cell                | Fill with                     | Hand-written? |
| ----------------------- | ----------------------------- | ------------- |
| searching Easy (−3)     | gen complexity-easy ok for ≤2 | rest hand-written |
| searching Medium (−6)   | gen `code` NOT ok (bank lacks any) | hand-written (complexity can be gen for ≤2, rotate letters) |
| searching Hard (−3)     | gen not ok                    | hand-written |
| trees Easy/Medium (−1)  | gen not needed                | hand-written |
| sorting Medium (−1)     | gen complexity ok             | preferred hand-written |
| graphs Medium (−1)      | gen not ok (code/SSSP)        | hand-written |
| all Hard cells          | gen not ok                    | hand-written |

### 4.3 Answer-option distribution (correct-letter concentration)

Across all 97 questions the correct letter is heavily concentrated on **B**:

| Letter | sorting | searching | trees | graphs | total | share |
| ------ | ------- | --------- | ----- | ------ | ----- | ----- |
| A      | 3       | 1         | 3     | 3      | 10    | 10%   |
| B      | 18      | 10        | 16    | 17     | **61**| **63%** |
| C      | 6       | 2         | 6     | 8      | 22    | 23%   |
| D      | 2       | 0         | 1     | 1      | 4     | 4%    |

Additionally, the generated **complexity questions always put the correct
answer at `A`** (`generateComplexityQuestions`, `:378–447`) — trivially
gameable. **Action (Phase 1):** once the bank is exported to
`src/data/questionBank.js`, apply a deterministic letter rotation/per-stage
shuffle of options so answers distribute ~evenly across A–D while keeping
option text correct. General hard is worst (sorting general/hard correct = B
five times in a row; searching has zero `D`).

### 4.4 Duplicates & near-duplicates

1. sorting general/easy "Quick Sort avg O(n log n)" ↔ sorting complexity/easy "Quick Sort average case?"
2. sorting general/easy "Space complexity of Merge Sort? O(n)" ↔ complexity/easy "Merge Sort space?"
3. sorting general/medium "When is Insertion Sort best?" ↔ complexity/medium "Best sort for nearly sorted?"
4. searching general/easy "Binary search complexity? O(log n)" ↔ complexity/easy "Binary search time?"
5. searching general/easy "Linear search worst? O(n)" ↔ complexity/easy "Linear search time?"
6. graphs code/easy "What data structure does DFS use?" ↔ graphs general/easy "DFS uses?" (its BFS twin also duplicates trees code/medium "Level order uses? → Queue")

Cross-topic leak: sorting code/easy contains a **Binary Search** code-reading
question — belongs in `searching.code` (re-tag in Phase 1).

### 4.5 Broken / wrong items (must fix or rewrite)

1. **sorting/code/easy #5** — `min = arr[0]; for x in arr: if x < min; return min`
   marked answer **D "Both A and B"** with exp *"This finds both minimum and
   maximum in one pass"*. The code only finds the **minimum**; correct answer
   is B) Find Min, and the explanation contradicts the code.
2. **sorting/general/medium #5** — "Stable sort among these?" options
   A) Quick, B) Heap, C) Insertion, D) **"Both C"** — marked D, exp *"Both are
   stable"*. Only Insertion is stable (Quick/Heap are not); option text is
   malformed. Correct: C.
3. **sorting/code/hard #1** — unrelated fragment
   `if arr[left] <= arr[right]: return mid` asking "What does this measure?",
   marked *Stability*. Snippet uses undefined identifiers, is not a real
   pass of any listed algorithm — unanswerable as written; rewrite entirely.
4. **sorting/complexity/hard #1** — "Introsort combines?" marked
   **C) Quick+Heap+Intro** (not a real combination); correct per its own
   explanation is A) Quick+Heap+Insertion. Answer key wrong.

### 4.6 Ambiguous (minor — reword on lift)

- searching/general/medium "Interpolation search works on?" — marked B
  *Uniform*, but **sorted** is also required → ambiguous options, reword.
- searching/complexity/hard "Exponential search **range**?" — wording loose
  (asks range, answer given as complexity O(log i)); reword to complexity.
- trees/general/medium "Height of empty tree?" = −1 — convention-dependent;
  keep, but state the convention in the question text.

### 4.7 Coverage gaps vs the app (checked against `src/data/algorithmData.js`)

Algorithms taught in the app but nearly absent from the bank:

- **Heap Sort mechanics** — only 2 generic "Heap Sort time/is___?" items; no
  heapify/build-heap/extract-max questions.
- **Counting / Radix** — 1 question each, both hard; no `O(n+k)`/stability
  trade-off variants in medium.
- **AVL specifics** — only "4 rotations" count + insert time; no
  rotation-scenario or balance-factor questions.
- **Red-Black Tree** — taught (`src/algorithms/trees/RedBlackTree.js`) but
  only 2 items (root color rule, height bound); no insert recolor/rotate
  questions (exists in neither the bank nor `algorithmData` — extension).
- **Dijkstra / Prim / Kruskal details** — each has one general question and
  one "uses priority queue" item; no shortest-path/MST walkthrough or MST
  property questions.
- Bank-only stretch topics (Tim Sort, B-Tree/Trie/Segment tree, Bellman-Ford/
  Floyd-Warshall, A*, Kosaraju, interpolation/exponential search) — kept as
  Hard "stretch" content; note they have no app visualizer behind them.

### 4.8 What to add — checklist (≈20 new questions to reach 10/10/5)

**sorting (needs 2 after fixes/dedupe):** +2 Medium — recurrence Quick Sort
(T(n)=T(n/4)+O(n) variant) and merge-vs-quick auxiliary space trade-off
(complexity, hand-written).

**searching (needs ≈14):** +3 Easy general (jump search idea √n blocks,
binary-vs-linear application scenario, sorted-array requirement)
· +4 Medium complexity (interpolation worst-case O(n), jump vs binary when
n large, exponential search total cost, "which search when" matrix)
· +4 Medium code-reading (binary search `high = mid − 1` vs `high = mid`
difference, sorted insert position loop, jump search block-then-linear,
mid overflow `(lo+hi)/2` note) · +3 Hard code output (predict returned index
for a given array × binary / jump; count iterations for a given n).

**trees (needs 2, but replace 3 Hard surplus with better coverage):** +1 Easy
(min-heap property / which orderings are valid BSTs) · +1 Medium (simulate
one AVL RR rotation result; heap insert sift-up step) · re-tag spare Easy
slots onto **heap-tree** and **red-black** mechanics.

**graphs (needs 1, replace 3 Hard surplus):** +1 Medium (Dijkstra
distance-table walkthrough on a 3-node example) · re-tag spare Hard slots
onto MST code-output (Prim edge-pick order, Kruskal union-find skip reason)
and SSSP output (after 1 Bellman-Ford pass).

Also fix §4.5 (4 items) before any stage assembly; dedupe §4.4.

## 5. UI plan

Keep the app's look — no new design language.

**Screens.**

1. **Topic level map** — the Practice page's third card layer: topic →
  `levels-grid` of 3 level cards. Reuses `training-grid` / `training-card`
  look + `TOPIC_COLORS`. Locked level: dimmed (`opacity` +
  `pointer-events`), lucide `Lock` icon; stars on cleared levels via lucide
  `Star` (filled/empty, 0–3). Levels that ARE open show a `Play` affordance.
2. **Stage session** — reuses the offline `QuizPanel` quiz-* classes; the
   stage replaces the ad-hoc questionLimit; the existing-but-unused
   `.quiz-progress-bar` drives the "question 3/5" progress line. Options
   behave exactly as today (select → submit → feedback → next).
3. **Stage results** — stars row, score, `Next stage` (if unlocked) / `Retry`
   (to improve stars); `ScoreBoard` stays on the map screen.

**Style rules.**

- Extend `src/styles/Training.css` only, prefix `levels-*`; reuse CSS
  design-system tokens (`--surface*`, `--text*`, `--accent*`, `--border`) from
  `GlobalStyles.css`. **No hardcoded colors in JSX** (current QuizPanel has
  inline hexes for the code/complexity badges — tokenize while reworking).
- Dark + light themes must both work (tokens make this free); `ar` RTL
  chrome-only sanity via logical properties (pattern from `Sidebar.css`).
- **A11y:** feedback region keeps `aria-live="polite"`; star buttons are
  focusable with `aria-label` ("Stage 2, 3 of 3 stars"); locked cards
  `aria-disabled` + communicate unlock requirement in text.
- Phase 2 dedupes `TOPIC_COLORS` (QuizPanel.jsx:284 + PracticeMode.jsx:16)
  into one shared constant.

## 6. Architecture per layers (app conventions: AGENTS.md)

```
src/data/questionBank.js          pure data. Normalized bank: every question
                                  gets a stable id (sort-easy-001…), shape
                                  { id, topic, type, difficulty, q, options[4],
                                    answer, exp }; letter rotation applied here
src/application/quiz/
  BuildLevelSetUseCase.js         topic+level+stage → ordered 5-question set
                                  (deterministic index math, no Math.random()-
                                  typeof Date.now() gating); resolves the level
                                  config; consumes useProgress difficulty
                                  ladder as tie-breaker only
src/components/practice/          LevelMap / StageSession / StageResults
                                  (chrome only; no algorithm logic)
src/hooks/useProgress.js          schema v2 addition:
                                  levels: { [topic]: { unlocked,
                                    stages: { [n]: { bestScore, stars, cleared } } } }
                                  versioned read → default migration (missing
                                  version ⇒ merge defaults, keep legacy fields)
src/i18n/locales/{en,ar,ja,zh}/practice.json
                                  new practice.levels.* keys (map/stage/results
                                  chrome); quiz.levels.{easy,medium,hard} reused
                                  — i18n:check enforces parity across locales
```

- `QuizPanel` keeps single-offline-duty: it renders one stage's questions with
  source `built-in` only (AI branch removed in Phase 0).
- Pages only orchestrate; selection logic lives in `application/`; content
  stays in `data/`; persistence behind `useProgress` with the existing
  `fcai_visualizer_` + try/catch conventions.

## 7. Roadmap & commits

| Phase | Commit(s) | Files touched | Acceptance criteria |
| ----- | --------- | ------------- | ------------------- |
| **0 — remove AI path** (in progress, next) | `refactor(quiz): remove AI question generation` · `chore(apikeys): remove API key management` | deletes `src/services/aiService.js`, `src/application/quiz/GenerateQuestionUseCase.js`, QuizPanel's AI branch (loading/error/retry states), `/api-keys` page + `ApiKeyManager`/`ApiKeyStore`/`ApiKey` entity + `ApiKeyTable` + route/nav/Header labels | app builds; practice quiz works fully offline; no fetch to AI providers anywhere; `npm run i18n:check`, lint green (unused `quiz.errors.*`/`quiz.loading.ai` keys pruned); user keys storage + /api-keys history gone from nav |
| **1 — extract bank + fix difficulty** | `refactor(quiz): extract offline question bank` · `fix(quiz): respect requested difficulty` | `src/data/questionBank.js` (new, with ids + letter rotation), `src/application/quiz/BuildLevelSetUseCase.js` (selection core), QuizPanel imports decomposed bank; difficulty param threaded through selection; re-tag binary-search question into searching; fix §4.5 items | no behavior change for existing play flows; medium request never returns easy when medium pool non-empty; lint + i18n:check green; dev-server quiz plays identically |
| **2 — level map + stages UI** | `feat(practice): level map and stages` | `src/components/practice/*` (new), `src/pages/PracticeMode.jsx`, `src/styles/Training.css` (`levels-*` + `.quiz-progress-bar` usage), TOPIC_COLORS dedupe, BankConfig stages 2/2/1 | topic map → session → results flow works in-memory; locked/unlocked states correct for fresh users; dark+light + ar chrome sane; lint + i18n:check green |
| **2b — persist level progress** | `feat(practice): persist level progress` | `src/hooks/useProgress.js` (schema v2 `levels`, migration), StageResults wiring | **i18n:check green; playing a full stage persists stars and survives reload**; cleared stages persist; migration of old `fcai_visualizer_training_progress` data loses nothing |
| **3 — deferred, one line each** | — | — | Arabic/localized question content (future phase, owner decision) · Hard gets more stages as content grows (§3.1 config already supports) · hand-written authoring checklist from §4.8 (≈20 questions)|
