import { questionBank } from '../../data/questionBank';

export const QUESTIONS_PER_STAGE = 5;
export const STAGES_PER_LEVEL = 2;
export const QUESTIONS_PER_LEVEL = QUESTIONS_PER_STAGE * STAGES_PER_LEVEL;

/**
 * Derive a topic's ladder from stable pool prefixes.
 * Incomplete ten-question tails are intentionally withheld rather than borrowed.
 */
export function buildLevelSet(topic, pools = questionBank) {
  const pool = pools[topic] ?? [];
  const levelCount = Math.floor(pool.length / QUESTIONS_PER_LEVEL);

  const levels = Array.from({ length: levelCount }, (_, levelIndex) => {
    const number = levelIndex + 1;
    const levelStart = levelIndex * QUESTIONS_PER_LEVEL;
    const stages = Array.from({ length: STAGES_PER_LEVEL }, (_, stageIndex) => {
      const stageNumber = stageIndex + 1;
      const start = levelStart + stageIndex * QUESTIONS_PER_STAGE;
      return {
        id: `level-${number}-stage-${stageNumber}`,
        number: stageNumber,
        questions: pool.slice(start, start + QUESTIONS_PER_STAGE),
      };
    });

    return { id: `level-${number}`, number, stages };
  });

  return {
    topic,
    levels,
    totalQuestions: pool.length,
    playableQuestions: levelCount * QUESTIONS_PER_LEVEL,
    withheldQuestions: pool.length - levelCount * QUESTIONS_PER_LEVEL,
    hasMoreContent: levelCount === 0 || pool.length % QUESTIONS_PER_LEVEL !== 0,
  };
}

export function getStageQuestions(topic, levelNumber, stageNumber, pools = questionBank) {
  if (!Number.isInteger(levelNumber) || levelNumber < 1) return [];
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > STAGES_PER_LEVEL) return [];

  const level = buildLevelSet(topic, pools).levels[levelNumber - 1];
  return level?.stages[stageNumber - 1]?.questions ?? [];
}
