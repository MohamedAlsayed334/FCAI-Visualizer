# Question Levels — offline practice plan

Game-like offline practice: **topics → a numbered level ladder → stages of 5
questions**, with stars, unlocks and progress persistence. All questions come
from the built-in bank — **no AI anywhere in this feature**. Mirrors the tone
of `docs/i18n.md`; references use `file:line`.

## 1. Goal & non-goals

**Goal.** A ladder-based quiz mode over the existing 97-question offline bank:
each topic has **one linear ladder of numbered levels** (`Level 1 … Level N` —
no Easy/Medium/Hard level names, no band gates), each level is split into
**two stages**, each stage is a fixed, deterministic set of 5 questions.
Level 1 is always open (the topic's entry point); level *n+1* unlocks when all
stages of level *n* are cleared. Passing stages earns stars. All chrome is
i18n; question content stays English this phase. **The feature ships for the
existing 4 topics only** (sorting, searching, trees, graphs).

**Non-goals.**

- **No AI question generation** — the whole AI path is removed in Phase 0
  (below). This feature is 100% offline.
- **No localized question content this phase.** UI chrome uses `practice`
  namespace in en/ar/ja/zh; question content (q/options/exp) is English-only
  by decision (mirrors course material, like canvas annotations — see
  `docs/i18n.md` rule 5). Arabic/localized content is a deferred future phase
  (§7, Phase 3) — details out of scope here.
- **No Easy/Medium/Hard level names.** The bank's existing difficulty tags
  survive as internal metadata only — they control pool ordering, and surface
  as the small per-question badge `QuizPanel` already renders
  (`QuizPanel.jsx:888–895`). A level is never a difficulty.
- **No cross-topic or other-parts training.** Deferred (§7, Phase 3). The
  derivation stays topic-agnostic and fully data-driven, so a future topic
  with pooled questions automatically gets its own ladder — zero redesign.

## 2. Current state inventory

What exists and is reusable:

- **Question bank** — module-private `FALLBACK_QUESTIONS` const,
  `src/components/ai/QuizPanel.jsx:78–278`. 97 questions (sorting 29,
  searching 13, trees 26, graphs 29), shape `{ q, options[4] ("A) …"
  prefixed), answer 'A'..'D', exp }`, organized
  `topic.type.difficulty` where type ∈ `general|code|complexity`. Question
  content is hardcoded English.
- **Offline quiz UI** — `QuizPanel.jsx` renders question/options/feedback with
  `quiz-*` classes from `src/styles/Training.css`; scoring is +10 per correct
  answer (`handleSubmit`, `:666–675`). The unused `.quiz-progress-bar` CSS
  (`Training.css:149`) is available for session progress. The per-question
  difficulty badge already renders via `quiz.levels.*` (`:888–895`).
- **Selection + generation helpers** — `getRandomQuestion` (`:312–399`) and
  `generateComplexityQuestions` / `generateCodeQuestions` /
  `generateAlgoOptions` (`:401–620`); the latter derive questions from
  `complexity`/`codeSnippets` in `src/data/algorithmData.js`. Under this plan
  they are not part of the ladder's selection path; they can inform new
  hand-written content (§4.7).
- **Progress hook** — `src/hooks/useProgress.js` persists per-topic scores +
  streaks under `fcai_visualizer_training_progress` (try/catch wrapped), and
  computes an easy→medium→hard ladder (`calculateNewDifficulty`, `:122–133`)
  that **nobody consumes** — `getDifficulty` is exported but never read by
  QuizPanel. Under this plan it is **retired, not consumed**: pacing comes
  from the pool ordering (§3.5). The hook will be extended with the level
  schema (§6).
- **Practice page chrome** — `src/pages/PracticeMode.jsx` with
  `training-grid` / `training-card` cards (`Training.css:31–74`), topic icons
  and `TOPIC_COLORS` (`PracticeMode.jsx:16–21` — duplicated from
  `QuizPanel.jsx:280–285`; dedupe in Phase 2). `ScoreBoard`
  (stats/accuracy/streak/clear) stays as-is.
- **Trace mode** — static "Coming Soon" `TracePanel`; untouched by this plan.
- **Lesson vocabulary** — `src/data/algorithmData.js` (`complexity`,
  `algoNames`, `explanations`, `codeSnippets`) can ground new hand-written
  questions (§4.7).

**Status (confirmed).** Nothing from this plan is implemented yet: no
`src/data/questionBank.js`, no `src/components/practice/` — the 97 questions
still live inline in `QuizPanel.jsx`.

**Known bug (confirmed).** `getRandomQuestion` takes no difficulty parameter;
its loop over `['easy','medium','hard']` (`:313`, first non-empty tier wins,
`:364–373`) returns from the first tier → the offline quiz is **effectively
always easy**. Fixed in Phase 1 (`fix(quiz): respect requested difficulty`).

## 3. Level system design (core spec)

### 3.1 Structure & derivation

```
topic (sorting | searching | trees | graphs)
 └─ Level 1 … Level N                      labels: practice.levels.* (translated;
                                           plain numbered naming — "Level 1" digit-
                                           suffixed in every locale, no ordinals)
     └─ stages[2] — each stage = fixed set of 5 questions
```

**Derivation — levels are prefix slices of the pool.**

- `N = floor(pool size ÷ 10)`; every level = 10 questions = two 5-question
  stages.
- Level *n* = `pool[n×10 … n×10+9]` — pure index arithmetic over the pool's
  fixed ordering (appendix A). No `Math.random()`, no `Date` anywhere in
  selection.
- **Remainder questions (< 10 leftover) are withheld.** They form no playable
  level until appends complete the next 10-batch — no partial levels. The
  stage builder never borrows across levels; that is what keeps the prefix
  slices stable forever (appendix A).
- A topic with fewer than 10 usable questions after the review gate (§4.8)
  ships with a visible **"more content coming"** state on the unfilled
  stage/level slot instead of a broken unlock. No partial 5-question stage is
  ever assembled.
- `N` is **data-driven**: `BuildLevelSetUseCase` derives it from whatever bank
  exists at read time. When content lands later, ladders only ever extend —
  no code changes (Phase 3).

### 3.2 Stage determinism

A stage is a **fixed, deterministic set of 5 questions** — no repeats within
a stage, identical across reloads and devices. Selection must not use
`Math.random()`/`Date`: the stage builder (§6) slices the level's 10-question
prefix (stage 1 = first 5, stage 2 = next 5) using only index arithmetic.
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
| Level 1 | always open (topic's entry point) |
| stage *n* cleared | stage *n+1* of same level unlocks |
| **all stages of a level cleared** | **next level in the ladder unlocks** |

There are no band gates between difficulty tiers — the ladder is linear.
Unlocks are derived from persisted `cleared` flags; nothing is stored twice.

### 3.5 The ramp lives in the pool ordering

The per-topic bank is kept **roughly sorted easy→hard** — authored and
maintained by content authors (§4.7). Because assignment is pure
prefix-slicing, the ramp emerges for free: Level 1 gets the pool's easiest
tens; each deeper level gets a harder prefix. The doc's old per-band content
mixes (Easy ≈ factual, Medium ≈ complexity …) are **replaced** by one authoring
rule: **when authoring, order new content within the pool so difficulty rises
along the chain of levels.**

- Appended questions only ever extend the pool tail → they land in the
  deepest level (or the withheld remainder), never backfilling an existing
  stage.
- Tag mismatch at the tail is accepted noise; the authoring checklist (§4.7)
  appends batches whose difficulty matches the tail so the badge never
  contradicts the ramp.
- The `general | code | complexity` tags stay descriptive metadata only —
  there are no per-question-type targets anymore.
- The per-question difficulty badge (`quiz.levels.*`,
  `QuizPanel.jsx:888–895`) is the only place difficulty is visible as a
  label.

## 4. Question bank audit (all 97 reviewed)

### 4.1 Pool sizes & ladder derivation today

Counts machine-verified from `FALLBACK_QUESTIONS`
(`src/components/ai/QuizPanel.jsx:78–278`). There are **no per-topic × band
targets** anymore — the only lever that matters is how many usable questions
each topic has, in the right order.

| Topic     | Pool (current) | Dedupe/fixes hit            | Usable (est. post-review) | Levels now = floor(usable ÷ 10) | Playable / withheld | After §4.7 appends | Levels then |
| --------- | -------------- | --------------------------- | ------------------------- | ------------------------------- | ------------------- | ------------------ | ----------- |
| sorting   | 29             | −3 dupes (§4.2), −4 broken (§4.3) | ≈22                 | **2**                           | 20 / 2              | +2 → ≈24           | **2**       |
| searching | 13             | −2 dupes (§4.2)             | ≈11                       | **1**                           | 10 / 1              | +14 → ≈25          | **2**       |
| trees     | 26             | — (1 shared pair §4.2)      | ≈25                       | **2**                           | 20 / 5              | +2 → ≈27           | **2**       |
| graphs    | 29             | −1 dupe (§4.2)              | ≈28                       | **2**                           | 20 / 8              | +1 → ≈29           | **2**       |

Reading notes:

- Numbers use the conservative assumption that one member of each duplicate
  pair (§4.2) is removed and the broken items (§4.3) are removed until their
  rewrites land. If the review gate instead fixes the 4 broken items in place
  (content corrected, pool position unchanged), sorting/graphs sit at ≈26/≈28
  usable — the ladder lengths are unchanged either way, only the withheld
  counts move. The gate (§4.8) owns the final numbers; the table drives the
  plan, `BuildLevelSetUseCase` derives from whatever pool actually ships.
- **The §4.7 checklist alone gives every topic a missing level only for
  searching.** Reaching a Level 3 for all four topics needs ≥ 30 usable each:
  approximately **+6 sorting, +5 searching, +3 trees, +1 graphs beyond the
  checklist** — a follow-up authoring batch, appended in tail-matching
  difficulty (§3.5).
- **searching is the thin spot:** ≈11 usable just clears the 10-question
  minimum for its single Level 1. One additional removal during review
  (e.g. an ambiguity resolved by deletion instead of rewording, §4.4) drops
  it under 10 → the topic ships its Level 1 with the "more content coming"
  state (§3.1) until the §4.7 batch lands.

### 4.2 Duplicates & near-duplicates

1. sorting general/easy "Quick Sort avg O(n log n)" ↔ sorting complexity/easy "Quick Sort average case?"
2. sorting general/easy "Space complexity of Merge Sort? O(n)" ↔ complexity/easy "Merge Sort space?"
3. sorting general/medium "When is Insertion Sort best?" ↔ complexity/medium "Best sort for nearly sorted?"
4. searching general/easy "Binary search complexity? O(log n)" ↔ complexity/easy "Binary search time?"
5. searching general/easy "Linear search worst? O(n)" ↔ complexity/easy "Linear search time?"
6. graphs code/easy "What data structure does DFS use?" ↔ graphs general/easy "DFS uses?" (its BFS twin also duplicates trees code/medium "Level order uses? → Queue")

Cross-topic leak: sorting code/easy contains a **Binary Search** code-reading
question — belongs in `searching` (re-tag in Phase 1). Any pre-shipping
removal/re-tag happens at the review gate (§4.8), before the ladder exists —
there are no shipped stages to disturb yet. After shipping, the pool is
append-only (appendix A).

### 4.3 Broken / wrong items (must fix or rewrite)

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

### 4.4 Ambiguous (minor — reword on lift)

- searching/general/medium "Interpolation search works on?" — marked B
  *Uniform*, but **sorted** is also required → ambiguous options, reword.
- searching/complexity/hard "Exponential search **range**?" — wording loose
  (asks range, answer given as complexity O(log i)); reword to complexity.
- trees/general/medium "Height of empty tree?" = −1 — convention-dependent;
  keep, but state the convention in the question text.

### 4.5 Coverage gaps vs the app (checked against `src/data/algorithmData.js`)

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
  late-ladder "stretch" content; note they have no app visualizer behind them.

### 4.6 Answer-option distribution (correct-letter concentration)

Across all 97 questions the correct letter is heavily concentrated on **B**:

| Letter | sorting | searching | trees | graphs | total | share |
| ------ | ------- | --------- | ----- | ------ | ----- | ----- |
| A      | 3       | 1         | 3     | 3      | 10    | 10%   |
| B      | 18      | 10        | 16    | 17     | **61**| **63%** |
| C      | 6       | 2         | 6     | 8      | 22    | 23%   |
| D      | 2       | 0         | 1     | 1      | 4     | 4%    |

Additionally, the generated **complexity questions always put the correct
answer at `A`** (`generateComplexityQuestions`, `QuizPanel.jsx:401–470`) —
trivially gameable. **Action (Phase 1):** once the bank is exported to
`src/data/questionBank.js`, apply a deterministic letter rotation so answers
distribute ~evenly across A–D while keeping option text correct. General
hard is worst (sorting general/hard correct = B five times in a row;
searching has zero `D`).

### 4.7 Authoring checklist — the content-growth stream (≈20 questions)

Under the ladder design the checklist's job is no longer "reach a band
target" — it is the **append batch** that extends each pool by matching its
tail's difficulty (§3.5). Everything below is **appended**, never inserted
into existing pool positions:

- **sorting (+2):** Quick Sort recurrence variant
  (T(n)=T(n/4)+O(n)) and merge-vs-quick auxiliary space trade-off.
- **searching (+14):** +3 entry-level general (jump search idea √n blocks,
  binary-vs-linear application scenario, sorted-array requirement) · +4
  complexity (interpolation worst-case O(n), jump vs binary when n large,
  exponential search total cost, "which search when" matrix) · +4 code-reading
  (binary search `high = mid − 1` vs `high = mid` difference, sorted insert
  position loop, jump search block-then-linear, mid overflow `(lo+hi)/2`
  note) · +3 code output (predict returned index for a given array × binary /
  jump; count iterations for a given n).
- **trees (+2):** min-heap property / which orderings are valid BSTs ·
  simulate one AVL RR rotation result; heap insert sift-up step · re-tag
  spare slots onto **heap-tree** and **red-black** mechanics (§4.5).
- **graphs (+1):** Dijkstra distance-table walkthrough on a 3-node example ·
  re-tag spare slots onto MST code-output (Prim edge-pick order, Kruskal
  union-find skip reason) and SSSP output (after 1 Bellman-Ford pass).

Also fix §4.3 (4 items) and dedupe §4.2 before the gate; the fixes happen in
place (same pool position), the checklist is appended. Generated fill-in
complexity questions may top up entry-level slots only if authoring falls
short — rotate answer letters when lifting (§4.6) and keep the pool's
difficulty ordering intact.

Lenient targets by design: a level keeps playing with a mixed batch; the
append-only contract (appendix A) means today's content needs no recoding
when this batch lands.

### 4.8 Bank review gate (pre-ship, owner sign-off)

Before the ladder ships, the owner reviews **every question in the bank** —
covering the full audit already in this section:

- duplicates & near-duplicates (§4.2) — remove or reword to differentiate;
- broken items (§4.3) — fix in place or remove;
- ambiguous wording (§4.4) — reword or remove;
- coverage gaps (§4.5) — decide whether the §4.7 batch (or more) is needed.

The review covers **both** the correctness of each answer/explanation **and**
its difficulty tag, then decides the **final pool per topic** — which
directly determines ladder lengths (§4.1). The gate is a prerequisite for
shipping: Phase 1b in §7. After sign-off the bank becomes append-only
(appendix A). `v1` of the ladder ships only after this gate plus the §4.7
batch, so **no topic ladder feels thin**.

## 5. UI plan

Keep the app's look — no new design language.

**Screens.**

1. **Topic level map** — the Practice page's third card layer: topic →
   `levels-grid` of **numbered level cards** ("Level 1", "Level 2", …).
   Reuses `training-grid` / `training-card` look + `TOPIC_COLORS`; the topic
   card gains a **`Level N of M` progress line**. The map reads the ladder
   length from `BuildLevelSetUseCase` — never a hardcoded 3. Locked level:
   dimmed (`opacity` + `pointer-events`), lucide `Lock` icon; stars on
   cleared levels via lucide `Star` (filled/empty, 0–3). Levels that ARE open
   show a `Play` affordance. Withheld remainder → a **"more content coming"**
   card (§3.1), focusable with `aria-disabled`.
2. **Stage session** — reuses the offline `QuizPanel` quiz-* classes; the
   stage replaces the ad-hoc questionLimit; the existing-but-unused
   `.quiz-progress-bar` (`Training.css:149`) drives the "question 3/5"
   progress line. Options behave exactly as today (select → submit →
   feedback → next). The small per-question difficulty badge stays
   (`QuizPanel.jsx:888–895` — `quiz.levels.*`).
3. **Stage results** — stars row, score, `Next stage` (if unlocked) /
   `Retry` (to improve stars); `ScoreBoard` stays on the map screen.

**Style rules.**

- Extend `src/styles/Training.css` only, prefix `levels-*`; reuse CSS
  design-system tokens (`--surface*`, `--text*`, `--accent*`, `--border`) from
  `GlobalStyles.css`. **No hardcoded colors in JSX** (current QuizPanel has
  inline hexes for the code/complexity badges — tokenize while reworking).
- Dark + light themes must both work (tokens make this free); `ar` RTL
  chrome-only sanity via logical properties (pattern from `Sidebar.css`).
- **A11y:** feedback region keeps `aria-live="polite"`; star buttons are
  focusable with `aria-label` ("Level 2, Stage 1, 3 of 3 stars"); locked
  cards `aria-disabled` + communicate unlock requirement in text.
- Phase 2 dedupes `TOPIC_COLORS` (`QuizPanel.jsx:280` +
  `PracticeMode.jsx:16`) into one shared constant.

## 6. Architecture per layers (app conventions: AGENTS.md)

```
src/data/questionBank.js          pure data. Exported bank: stable ids that
                                  serialize pool order (sort-001… = prefix
                                  position), shape { id, topic, type,
                                  difficulty, q, options[4], answer, exp };
                                  pool stored roughly easy→hard; letter
                                  rotation applied here; APPEND-ONLY after
                                  the review gate (appendix A)
src/application/quiz/
  BuildLevelSetUseCase.js         topic → ladder { levels, total, withheld
                                  remainder flag } and level+stage → ordered
                                  5-question set. Pure index arithmetic over
                                  the pool (floor(pool ÷ 10) derivation; two
                                  5-question prefix slices; no proposals to
                                  borrow across levels; no Math.random() and
                                  no Date anywhere)
src/components/practice/          LevelMap / StageSession / StageResults
                                  (chrome only; no algorithm logic)
src/hooks/useProgress.js          schema v2 addition — numeric per-topic
                                  level keys:
                                  levels: { [topic]: { levels: {
                                    'level-1': { stages: { [n]: {
                                      bestScore, stars, cleared } } } } } }
                                  versioned read → default migration (missing
                                  version ⇒ merge defaults, keep legacy fields)
src/i18n/locales/{en,ar,ja,zh}/practice.json
                                  new practice.levels.* keys — numbered level
                                  naming with plain digits in all locales
                                  ("Level 1" style; no ordinal-word machinery),
                                  "Level N of M" progress, "more content
                                  coming" state. quiz.levels.{easy,medium,hard}
                                  kept ONLY for the per-question badge
                                  (en bundle: `practice.json:75–79`) —
                                  i18n:check enforces parity across locales
```

- `QuizPanel` keeps single-offline-duty: it renders one stage's questions with
  source `built-in` only (AI branch removed in Phase 0).
- Pages only orchestrate; selection logic lives in `application/`; content
  stays in `data/`; persistence behind `useProgress` with the existing
  `fcai_visualizer_` + try/catch conventions.
- No level logic in React: the whole ladder is derived from the bank on read,
  which is what makes adding content (§3.1) and future topics (§1) zero-code.

## 7. Roadmap & commits

| Phase | Commit(s) | Files touched | Acceptance criteria |
| ----- | --------- | ------------- | ------------------- |
| **0 — remove AI path** (in progress, next) | `refactor(quiz): remove AI question generation` · `chore(apikeys): remove API key management` | deletes `src/services/aiService.js`, `src/application/quiz/GenerateQuestionUseCase.js`, QuizPanel's AI branch (loading/error/retry states), `/api-keys` page + `ApiKeyManager`/`ApiKeyStore`/`ApiKey` entity + `ApiKeyTable` + route/nav/Header labels | app builds; practice quiz works fully offline; no fetch to AI providers anywhere; `npm run i18n:check`, lint green (unused `quiz.errors.*`/`quiz.loading.ai` keys pruned); user keys storage + /api-keys history gone from nav |
| **1 — extract bank + fix difficulty** | `refactor(quiz): extract offline question bank` · `fix(quiz): respect requested difficulty` | `src/data/questionBank.js` (new, ids serialize prefix order + letter rotation), `src/application/quiz/BuildLevelSetUseCase.js` (selection core), QuizPanel imports decomposed bank; difficulty param threaded through selection; re-tag binary-search question into searching; fix §4.3 items | no behavior change for existing play flows; medium request never returns easy when medium pool non-empty; bank exported in fixed easy→hard pool order; lint + i18n:check green; dev-server quiz plays identically |
| **1b — bank review gate** (owner sign-off) | `chore(quiz): dedupe and fix offline bank` · `feat(quiz): append ladder authoring batch` | `src/data/questionBank.js` (dedupe §4.2, §4.3 fixes, §4.4 rewords), +≈20 hand-written questions appended per §4.7 in tail-matching difficulty | §4.8 gate signed off: every question reviewed for answer/explanation correctness **and** difficulty tag; final pool per topic ratified (determines ladder lengths §4.1); **ladder v1 does not ship before this gate**; every topic ends with ≥ 10 usable questions or an agreed "more content coming" plan |
| **2 — numbered level map + stages UI** | `feat(practice): numbered level ladder and stages` | `src/components/practice/*` (new), `src/pages/PracticeMode.jsx`, `src/styles/Training.css` (`levels-*` + `.quiz-progress-bar` usage), TOPIC_COLORS dedupe | topic card shows `Level N of M`; level map → session → results flow works in-memory; ladder derived (`floor(pool ÷ 10)`), no hardcoded level count; fresh-user unlock states correct (Level 1 open, rest locked); "more content coming" state renders where the remainder withholds a level; dark+light + `ar` chrome sane; lint + i18n:check green |
| **2b — persist level progress** | `feat(practice): persist level progress` | `src/hooks/useProgress.js` (schema v2 `levels` with numeric per-topic keys `level-1`, `level-2`…, migration), StageResults wiring | **i18n:check green; playing a full stage persists stars and survives reload**; cleared stages persist; unlocks derived from cleared flags survive reload; migration of old `fcai_visualizer_training_progress` data loses nothing |
| **3 — deferred, one line each** | — | — | Arabic/localized question content (future phase, owner decision) · content growth beyond the §4.7 batch — appends extend ladders automatically, zero code (§3.1, appendix A) · training on future topics/other parts — derivation is topic-agnostic and data-driven, so a new pooled topic gets its own ladder with zero redesign |

## Appendix A — Determinism: prefix slices + append-only pool

Why the ladder never changes under a user's feet:

1. **Pool order is the ramp.** Each topic's pool is stored once, in a fixed
   order kept roughly easy→hard by content authors (§3.5). Difficulty is a
   property of the pool's arrangement, not of the selection code.
2. **Selection is pure index arithmetic.** Level *n* =
   `pool[n×10 … n×10+9]`; inside a level, stage 1 = first 5, stage 2 = next
   5. There is no `Math.random()` and no `Date.now()` in the selection path —
   the same user sees the same 5 questions per stage on every reload and
   every device.
3. **Appends only extend the tail.** A new question is written after the last
   pool entry, so it can only (a) fill the withheld remainder of a currently
   incomplete 10-batch or (b) extend past the deepest shipped level's slice.
   New content can never appear inside an already-created stage → existing
   stages never change, and persisted progress/stars stay valid forever.
4. **Contributors must NOT reshuffle or reorder existing pool entries,**
   and must not remove entries from a shipped pool: any splice/reorder shifts
   every later index and would silently rewrite shipped stages and invalidate
   stored progress. Reordering/removal requests go to the reviewer; if ever
   necessary, it ships as an announced, versioned data change.
5. **The one-time exception is pre-ship.** The review gate (§4.8) happens
   before any ladder exists, so its dedupe/removal/re-tag edits are free.
   After sign-off the bank is append-only.
6. **The stage builder never borrows across levels.** When a remainder is too
   short to complete a level, it stays withheld ("more content coming",
   §3.1) — the builder never pulls questions from a neighboring level to fake
   a complete stage. This no-borrow rule is exactly what keeps every slice
   stable and replayable.
7. **Tail tag-mismatch is accepted noise.** A `medium`-tagged question
   sitting in a deeper slice (or a `hard` one in a shallow one) is cosmetic:
   the per-question badge may disagree with its ladder position. The §4.7
   checklist asks appends to match the tail's difficulty so the mismatch
   fades as content grows.
