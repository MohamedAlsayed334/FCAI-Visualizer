import { TRAINING_QUESTION_BANK } from './trainingQuestionBank';

export const QUESTIONS_PER_STAGE = 5;
export const PASSING_SCORE = 3;
export const TOPIC_IDS = ['sorting', 'searching', 'trees', 'graphs'];

const QUESTION_TYPES = ['general', 'code', 'complexity'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export function getTopicQuestions(topic) {
  const topicBank = TRAINING_QUESTION_BANK[topic];
  if (!topicBank) return [];

  return QUESTION_TYPES.flatMap((type) =>
    DIFFICULTIES.flatMap((difficulty) =>
      (topicBank[type]?.[difficulty] ?? []).map((question, index) => ({
        id: `${topic}:${type}:${difficulty}:${index}`,
        topic,
        questionType: type,
        difficulty,
        question: question.q,
        options: question.options,
        correctAnswer: question.answer,
        explanation: question.exp,
      })),
    ),
  );
}

export function getTopicStages(topic) {
  const questions = getTopicQuestions(topic);
  const stageCount = Math.floor(questions.length / QUESTIONS_PER_STAGE);

  return Array.from({ length: stageCount }, (_, index) => {
    const stageNumber = index + 1;
    const start = index * QUESTIONS_PER_STAGE;
    return {
      id: `${topic}:stage:${stageNumber}`,
      topic,
      number: stageNumber,
      questions: questions.slice(start, start + QUESTIONS_PER_STAGE),
    };
  });
}

export function getStageResult(correctCount) {
  const passed = correctCount >= PASSING_SCORE;
  return {
    passed,
    stars: passed ? (correctCount === 5 ? 3 : correctCount === 4 ? 2 : 1) : 0,
    correctCount,
    totalQuestions: QUESTIONS_PER_STAGE,
  };
}

export function getStageProgress(topic, progress) {
  const stages = getTopicStages(topic);
  const saved = progress?.levels?.[topic] ?? {};
  const completedStages = saved.completedStages ?? {};
  const unlockedStage = Math.min(
    stages.length,
    Math.max(1, saved.unlockedStage ?? 1),
  );

  return stages.map((stage) => ({
    ...stage,
    unlocked: stage.number <= unlockedStage,
    completed: Boolean(completedStages[stage.id]?.cleared),
    bestScore: completedStages[stage.id]?.bestScore ?? 0,
    stars: completedStages[stage.id]?.stars ?? 0,
  }));
}

export function applyStageResult(levels, topic, stage, correctCount) {
  const result = getStageResult(correctCount);
  const topicProgress = levels?.[topic] ?? { unlockedStage: 1, completedStages: {} };
  const previous = topicProgress.completedStages?.[stage.id] ?? {
    cleared: false,
    bestScore: 0,
    stars: 0,
  };

  const bestScore = Math.max(previous.bestScore, correctCount);
  const stars = Math.max(previous.stars, result.stars);
  const completedStages = {
    ...topicProgress.completedStages,
    [stage.id]: {
      cleared: previous.cleared || result.passed,
      bestScore,
      stars,
    },
  };
  const nextStage = stage.number + 1;
  const unlockedStage = result.passed
    ? Math.max(topicProgress.unlockedStage ?? 1, nextStage)
    : (topicProgress.unlockedStage ?? 1);

  return {
    ...levels,
    [topic]: { unlockedStage, completedStages },
  };
}
