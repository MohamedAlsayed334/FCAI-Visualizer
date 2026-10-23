import { describe, expect, it } from 'vitest';
import { questionBank } from '../../data/questionBank';
import { buildLevelSet, getStageQuestions, QUESTIONS_PER_LEVEL, QUESTIONS_PER_STAGE } from './BuildLevelSetUseCase';

describe('BuildLevelSetUseCase', () => {
  it('creates stable ids and distributes correct answers across A-D', () => {
    for (const [topic, pool] of Object.entries(questionBank)) {
      expect(pool.every((question, index) => question.id.startsWith({
        sorting: 'sort-', searching: 'search-', trees: 'tree-', graphs: 'graph-',
      }[topic]) && question.id.endsWith(String(index + 1).padStart(3, '0')))).toBe(true);
      expect(new Set(pool.map((question) => question.id)).size).toBe(pool.length);
      const counts = ['A', 'B', 'C', 'D'].map((letter) => pool.filter((question) => question.answer === letter).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      for (const question of pool) {
        expect(question.options[question.answer.charCodeAt(0) - 65].startsWith(`${question.answer}) `)).toBe(true);
      }
    }
  });

  it('uses two fixed five-question stages per complete ten-question level', () => {
    const pool = Array.from({ length: 29 }, (_, index) => ({ id: `q-${index}` }));
    const ladder = buildLevelSet('demo', { demo: pool });
    expect(ladder.levels).toHaveLength(2);
    expect(ladder.levels[0].stages.map((stage) => stage.questions.length)).toEqual([5, 5]);
    expect(ladder.playableQuestions).toBe(20);
    expect(ladder.withheldQuestions).toBe(9);
    expect(ladder.hasMoreContent).toBe(true);
    expect(getStageQuestions('demo', 2, 2, { demo: pool }).map((question) => question.id)).toEqual(
      ['q-15', 'q-16', 'q-17', 'q-18', 'q-19'],
    );
  });

  it('does not create partial levels or partial stages', () => {
    expect(buildLevelSet('small', { small: Array.from({ length: 9 }, (_, i) => i) }).levels).toHaveLength(0);
    expect(getStageQuestions('demo', 3, 1, { demo: Array(20).fill({}) })).toEqual([]);
    expect(getStageQuestions('demo', 1, 3, { demo: Array(20).fill({}) })).toEqual([]);
    expect(QUESTIONS_PER_LEVEL).toBe(10);
    expect(QUESTIONS_PER_STAGE).toBe(5);
  });
});
