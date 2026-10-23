import { describe, expect, it } from 'vitest';
import {
  QUESTIONS_PER_STAGE,
  PASSING_SCORE,
  applyStageResult,
  getStageProgress,
  getStageResult,
  getTopicQuestions,
  getTopicStages,
} from './trainingLevels';

describe('training level selection', () => {
  it('assigns stable unique ids to bank questions', () => {
    const first = getTopicQuestions('sorting');
    const second = getTopicQuestions('sorting');
    expect(first.length).toBeGreaterThanOrEqual(10);
    expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id));
    expect(new Set(first.map((question) => question.id)).size).toBe(first.length);
  });

  it('builds only complete five-question stages and withholds leftovers', () => {
    for (const topic of ['sorting', 'searching', 'trees', 'graphs']) {
      const questions = getTopicQuestions(topic);
      const stages = getTopicStages(topic);
      expect(stages.every((stage) => stage.questions.length === QUESTIONS_PER_STAGE)).toBe(true);
      expect(stages.length).toBe(Math.floor(questions.length / QUESTIONS_PER_STAGE));
      expect(stages.flatMap((stage) => stage.questions)).toEqual(
        questions.slice(0, stages.length * QUESTIONS_PER_STAGE),
      );
    }
  });

  it('requires three correct answers and awards up to three stars', () => {
    expect(getStageResult(PASSING_SCORE)).toMatchObject({ passed: true, stars: 1 });
    expect(getStageResult(4)).toMatchObject({ passed: true, stars: 2 });
    expect(getStageResult(5)).toMatchObject({ passed: true, stars: 3 });
    expect(getStageResult(2)).toMatchObject({ passed: false, stars: 0 });
  });

  it('unlocks the next stage only after a pass and never lowers saved achievements', () => {
    const stages = getTopicStages('sorting');
    const first = stages[0];
    const second = stages[1];
    let levels = {};

    levels = applyStageResult(levels, 'sorting', first, 2);
    expect(levels.sorting.unlockedStage).toBe(1);
    expect(getStageProgress('sorting', { levels })[0].completed).toBe(false);

    levels = applyStageResult(levels, 'sorting', first, 5);
    expect(levels.sorting.unlockedStage).toBe(2);
    levels = applyStageResult(levels, 'sorting', first, 3);
    expect(levels.sorting.completedStages[first.id]).toMatchObject({
      cleared: true,
      bestScore: 5,
      stars: 3,
    });

    levels = applyStageResult(levels, 'sorting', second, 4);
    expect(levels.sorting.unlockedStage).toBe(3);
  });
});
