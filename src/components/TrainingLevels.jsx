import { useMemo, useState } from 'react';
import { useT } from '../hooks/useT';
import {
  getStageProgress,
  getStageResult,
  getTopicStages,
} from '../data/trainingLevels';

const TOPIC_ICONS = {
  sorting: '⊞',
  searching: '⌕',
  trees: '⬡',
  graphs: '◇',
};

export default function TrainingLevels({ topic, levels, onStageComplete }) {
  const t = useT('practice');
  const [activeStageId, setActiveStageId] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const stages = useMemo(() => getStageProgress(topic, { levels }), [topic, levels]);
  const activeStage = stages.find((stage) => stage.id === activeStageId);
  const question = activeStage?.questions[questionIndex];

  const beginStage = (stage) => {
    if (!stage.unlocked) return;
    setActiveStageId(stage.id);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setSubmitted(false);
    setCorrectCount(0);
    setFinished(false);
    setFinalResult(null);
  };

  const submitAnswer = () => {
    if (!selectedAnswer || submitted || !question) return;
    setSubmitted(true);
    if (selectedAnswer === question.correctAnswer) {
      setCorrectCount((count) => count + 1);
    }
  };

  const nextQuestion = () => {
    if (!submitted || !activeStage) return;
    if (questionIndex < activeStage.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      return;
    }

    const result = getStageResult(correctCount);
    setFinalResult(result);
    setFinished(true);
    onStageComplete(topic, activeStage, correctCount);
  };

  if (!activeStage) {
    const allStages = getTopicStages(topic);
    const totalStars = stages.reduce((sum, stage) => sum + stage.stars, 0);
    const maxStars = allStages.length * 3;

    return (
      <section className="training-levels">
        <div className="training-levels-summary">
          <span className="training-levels-topic-icon" aria-hidden="true">{TOPIC_ICONS[topic]}</span>
          <div>
            <h2>{t(`topics.${topic}`, { defaultValue: topic })} {t('levels.title', { defaultValue: 'Training levels' })}</h2>
            <p>{t('levels.summary', { defaultValue: 'Complete each five-question stage to unlock the next one.' })}</p>
          </div>
          <strong>{totalStars}/{maxStars} ★</strong>
        </div>

        <div className="training-levels-grid">
          {stages.map((stage) => (
            <button
              type="button"
              key={stage.id}
              className={`training-level-card ${stage.unlocked ? 'unlocked' : 'locked'} ${stage.completed ? 'completed' : ''}`}
              disabled={!stage.unlocked}
              onClick={() => beginStage(stage)}
            >
              <span className="training-level-number">
                {stage.unlocked ? stage.number : '🔒'}
              </span>
              <strong>{t('levels.stage', { defaultValue: 'Stage' })} {stage.number}</strong>
              <span>{stage.completed ? '★'.repeat(stage.stars) + '☆'.repeat(3 - stage.stars) : t('levels.questionCount', { defaultValue: '5 questions' })}</span>
              {stage.completed && <small>{t('levels.bestScore', { defaultValue: 'Best' })}: {stage.bestScore}/5</small>}
            </button>
          ))}
        </div>
        {allStages.length === 0 && (
          <p>{t('levels.noStages', { defaultValue: 'There are not enough reviewed questions to create a complete stage yet.' })}</p>
        )}
      </section>
    );
  }

  if (finished) {
    return (
      <section className="quiz-container training-stage-result">
        <h2>{t('levels.resultTitle', { defaultValue: 'Stage complete' })}</h2>
        <div className="training-stage-result-score">{correctCount}/5</div>
        <p>{finalResult?.passed
          ? t('levels.passed', { defaultValue: 'Stage passed — the next stage is unlocked.' })
          : t('levels.failed', { defaultValue: 'You need at least 3 correct answers to pass. Try this stage again.' })}</p>
        <p className="training-stage-stars">{'★'.repeat(finalResult?.stars ?? 0)}{'☆'.repeat(3 - (finalResult?.stars ?? 0))}</p>
        <button type="button" className="btn btn-primary" onClick={() => setActiveStageId(null)}>
          {t('levels.backToStages', { defaultValue: 'Back to stages' })}
        </button>
      </section>
    );
  }

  if (!question) return null;

  return (
    <section className="quiz-container training-stage-quiz">
      <div className="quiz-header">
        <button type="button" className="btn btn-outline" onClick={() => setActiveStageId(null)}>
          ← {t('levels.backToStages', { defaultValue: 'Back to stages' })}
        </button>
        <div className="quiz-progress">
          {t('levels.stage', { defaultValue: 'Stage' })} {activeStage.number} · {questionIndex + 1}/5
        </div>
        <div className="quiz-stat">
          <div className="quiz-stat-value">{correctCount}</div>
          <div className="quiz-stat-label">{t('quiz.results.score', { defaultValue: 'Correct' })}</div>
        </div>
      </div>

      <div className="quiz-question">
        <span className={`quiz-difficulty ${question.difficulty}`}>{question.difficulty}</span>
        <h3 className="quiz-question-text">{question.question}</h3>
      </div>

      <div className="quiz-options">
        {question.options.map((option) => {
          const letter = option.charAt(0);
          let className = 'quiz-option';
          if (submitted && letter === question.correctAnswer) className += ' correct';
          else if (submitted && letter === selectedAnswer) className += ' incorrect';
          else if (!submitted && letter === selectedAnswer) className += ' selected';
          return (
            <button
              type="button"
              key={option}
              className={className}
              disabled={submitted}
              onClick={() => setSelectedAnswer(letter)}
            >
              <span className="quiz-option-letter">{letter}</span>
              <span>{option.substring(3)}</span>
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className={`quiz-feedback ${selectedAnswer === question.correctAnswer ? 'correct' : 'incorrect'}`}>
          <div className="quiz-feedback-title">
            {selectedAnswer === question.correctAnswer
              ? t('quiz.feedback.correct', { defaultValue: 'Correct!' })
              : t('quiz.feedback.incorrect', { defaultValue: 'Not quite' })}
          </div>
          <div className="quiz-feedback-text">{question.explanation}</div>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button type="button" className="btn btn-primary" disabled={!selectedAnswer} onClick={submitAnswer}>
            {t('quiz.actions.submit', { defaultValue: 'Submit answer' })}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={nextQuestion}>
            {questionIndex === 4
              ? t('levels.finishStage', { defaultValue: 'Finish stage' })
              : t('quiz.actions.next', { defaultValue: 'Next question' })}
          </button>
        )}
      </div>
    </section>
  );
}
