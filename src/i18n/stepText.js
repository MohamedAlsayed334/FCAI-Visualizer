// ── Step / event narration translation ───────────────────────────────────────
// Binds the algorithm Step contract (msgKey/msgParams alongside legacy msg)
// to i18next. Framework-free: pages render stepText(step); imperative
// visualizers call it inside their draw loop with t() keyed inline.
import i18n from './i18n';

/**
 * Human narration for a Step ({@link src/domain/algorithms/Step.js}).
 * Prefers the data-only `msgKey`/`msgParams` pair, falls back to `msg`.
 */
export function stepText(step) {
  if (!step) return '';
  if (step.msgKey) return i18n.t(step.msgKey, step.msgParams ?? {});
  return step.msg || '';
}

/**
 * Explanation text for a tree-engine event object (`explanationKey` preferred
 * over the literal `explanation` field).
 */
export function eventExplanation(event) {
  if (!event) return '';
  if (event.explanationKey) {
    return i18n.t(event.explanationKey, event.explanationParams ?? {});
  }
  return event.explanation || '';
}

/** Operation label for tree-engine events (`operationKey` preferred). */
export function eventOperation(event) {
  if (!event) return '';
  if (event.operationKey) {
    return i18n.t(event.operationKey, event.operationParams ?? {});
  }
  return event.operation || '';
}
