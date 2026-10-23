import { useState, useCallback } from 'react';
import { useLang } from '../../hooks/useLang';
import { useT } from '../../hooks/useT';
import { complexity, algoNames, codeSnippets } from '../../data/algorithmData';
import { questionBankByTopic as TRAINING_QUESTION_BANK } from '../../data/questionBank';

const CODE_LANGUAGES = [
  { value: 'js', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

function CodeBlock({ question }) {
  const codeBlockMatch = question.match(/```[\s\S]*?```/);
  const codeBlock = codeBlockMatch ? codeBlockMatch[0].replace(/```\w*\n?/g, '').trim() : '';
  
  const inlineCodeMatch = question.match(/`(?:[^`\n]+)`/g);
  
  const textBeforeCode = codeBlockMatch 
    ? question.split(/```[\s\S]*?```/)[0].trim() 
    : question;
  
  const textAfterCode = codeBlockMatch
    ? question.split(/```[\s\S]*?```/).slice(1).join(' ').trim()
    : '';

  const hasSubstantialCode = codeBlock && codeBlock.length > 20;
  const hasInlineCode = inlineCodeMatch && inlineCodeMatch.length > 0;
  
  return (
    <div className="code-question-container">
      {hasSubstantialCode && (
        <pre style={{ 
          background: 'var(--surface2)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          border: '1px solid var(--border)',
          whiteSpace: 'pre-wrap',
          maxHeight: '300px'
        }}>
          <code>{codeBlock}</code>
        </pre>
      )}
      
      {textBeforeCode && textBeforeCode.length > 10 && (
        <h3 className="quiz-question-text">{textBeforeCode}</h3>
      )}
      
      {hasInlineCode && !hasSubstantialCode && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem',
          background: 'var(--surface2)',
          borderRadius: '6px',
          border: '1px solid var(--border)'
        }}>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            {inlineCodeMatch.join(' ').replace(/`/g, '')}
          </code>
        </div>
      )}
      
      {textAfterCode && textAfterCode.length > 5 && (
        <p style={{ color: 'var(--text)', marginTop: '0.5rem' }}>{textAfterCode}</p>
      )}
      
      {!hasSubstantialCode && !hasInlineCode && !textBeforeCode && (
        <h3 className="quiz-question-text">{question}</h3>
      )}
    </div>
  );
}

function getRandomQuestion(topic, questionType = 'general', lang = 'js', difficulty = 'easy') {
  const levels = ['easy', 'medium', 'hard'];
  const requestedDifficulty = levels.includes(difficulty) ? difficulty : 'easy';
  const typeKey = questionType === 'code' ? 'code' : questionType === 'complexity' ? 'complexity' : 'general';

  const topicAlgos = {
    sorting: ['bubble', 'selection', 'insertion', 'merge', 'quick', 'heap', 'counting', 'radix'],
    searching: ['linear-search', 'binary-search', 'jump-search'],
    trees: ['bst', 'avl', 'binary-tree', 'heap-tree'],
    graphs: ['bfs', 'dfs', 'dijkstra', 'prim', 'kruskal']
  };

  const algos = topicAlgos[topic] || topicAlgos.sorting;
  const randomAlgo = algos[Math.floor(Math.random() * algos.length)];

  if (questionType === 'complexity') {
    const comp = complexity[randomAlgo];
    if (comp) {
      const candidates = generateComplexityQuestions(randomAlgo, comp)
        .filter((item) => item.level === requestedDifficulty);
      if (candidates.length > 0) {
        const random = candidates[Math.floor(Math.random() * candidates.length)];
        return {
          question: random.q,
          options: random.options,
          correctAnswer: random.answer,
          explanation: random.exp,
          topic,
          source: 'built-in',
          level: random.level,
          questionType,
          algorithm: randomAlgo
        };
      }
    }
  }

  if (questionType === 'code') {
    const candidates = generateCodeQuestions(randomAlgo, topic, lang)
      .filter((item) => item.level === requestedDifficulty);
    if (candidates.length > 0) {
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        question: random.q,
        options: random.options,
        correctAnswer: random.answer,
        explanation: random.exp,
        topic,
        source: 'built-in',
        level: random.level,
        questionType,
        algorithm: randomAlgo,
        language: lang
      };
    }
  }

  const requestedQuestions = TRAINING_QUESTION_BANK[topic]?.[typeKey]?.[requestedDifficulty];
  if (requestedQuestions?.length) {
    const random = requestedQuestions[Math.floor(Math.random() * requestedQuestions.length)];
    return {
      question: random.q,
      options: random.options,
      correctAnswer: random.answer,
      explanation: random.exp,
      topic,
      source: 'built-in',
      level: requestedDifficulty,
      questionType,
      algorithm: inferAlgorithm(random, algos)
    };
  }

  // If this topic has no questions at the requested difficulty, choose the
  // nearest available tier instead of always falling back to easy.
  const fallbackLevel = levels.find((level) => TRAINING_QUESTION_BANK[topic]?.[typeKey]?.[level]?.length);
  const fallback = TRAINING_QUESTION_BANK[topic]?.[typeKey]?.[fallbackLevel]?.[0]
    ?? TRAINING_QUESTION_BANK.sorting.general.easy[0];

  return {
    question: fallback.q,
    options: fallback.options,
    correctAnswer: fallback.answer,
    explanation: fallback.exp,
    topic,
    source: 'built-in',
    level: fallbackLevel ?? 'easy',
    questionType,
    algorithm: randomAlgo
  };
}

function generateComplexityQuestions(algoKey, comp) {
  const questions = [];
  
  if (comp.best) {
    questions.push({
      q: `What is the best case time complexity of ${algoNames[algoKey] || algoKey}?`,
      options: [`A) ${comp.best}`, `B) ${comp.avg}`, `C) ${comp.worst}`, `D) O(1)`],
      answer: 'A',
      exp: `Best case: ${comp.best} - ${comp.note || 'optimal input conditions'}`,
      level: 'easy'
    });
  }
  
  if (comp.avg) {
    questions.push({
      q: `What is the average case time complexity of ${algoNames[algoKey] || algoKey}?`,
      options: [`A) ${comp.avg}`, `B) ${comp.best}`, `C) ${comp.worst}`, `D) O(1)`],
      answer: 'A',
      exp: `Average case: ${comp.avg} - typical input performance`,
      level: 'medium'
    });
  }
  
  if (comp.worst) {
    questions.push({
      q: `What is the worst case time complexity of ${algoNames[algoKey] || algoKey}?`,
      options: [`A) ${comp.worst}`, `B) ${comp.avg}`, `C) ${comp.best}`, `D) O(1)`],
      answer: 'A',
      exp: `Worst case: ${comp.worst} - ${comp.note || 'unfavorable input conditions'}`,
      level: 'medium'
    });
  }
  
  if (comp.space) {
    questions.push({
      q: `What is the space complexity of ${algoNames[algoKey] || algoKey}?`,
      options: [`A) ${comp.space}`, `B) O(n)`, `C) O(1)`, `D) O(log n)`],
      answer: 'A',
      exp: `Space complexity: ${comp.space}`,
      level: 'easy'
    });
  }

  if (comp.note) {
    const stabilityMatch = comp.note.match(/stable|unstable/i);
    if (stabilityMatch) {
      const isStable = stabilityMatch[0].toLowerCase() === 'stable';
      questions.push({
        q: `${algoNames[algoKey] || algoKey} is a ___ sort?`,
        options: ['A) Stable', 'B) Unstable', 'C) Adaptive', 'D) Distribution'],
        answer: isStable ? 'A' : 'B',
        exp: comp.note,
        level: 'easy'
      });
    }

    const inPlaceMatch = comp.note.match(/in-place/i);
    if (inPlaceMatch) {
      questions.push({
        q: `${algoNames[algoKey] || algoKey} is an in-place algorithm?`,
        options: ['A) Yes', 'B) No', 'C) Depends', 'D) Sometimes'],
        answer: 'A',
        exp: comp.note,
        level: 'easy'
      });
    }
  }

  return questions;
}

function generateCodeQuestions(algoKey, topic, lang = 'js') {
  const questions = [];
  const langMap = { js: 'JavaScript', python: 'Python', cpp: 'C++', java: 'Java' };
  const langName = langMap[lang] || 'JavaScript';
  const code = codeSnippets[algoKey]?.[lang];
  
  if (code && code.length > 0) {
    const codeText = code.join('\n');
    const algoName = algoNames[algoKey] || algoKey;
    const algoChoice = generateAlgoOptions(algoKey);

    questions.push({
      q: `What sorting algorithm does this ${langName} code implement?\n\`\`\`\n${codeText.slice(0, 400)}\n\`\`\``,
      options: algoChoice.options,
      answer: algoChoice.answer,
      exp: `This is the implementation of ${algoName}`,
      level: 'easy'
    });

    if (algoKey === 'bubble') {
      questions.push({
        q: `What does this ${langName} code do in each pass?\n\`\`\`\n${code.slice(0, 6).join('\n')}\n\`\`\``,
        options: ['A) Finds minimum', 'B) Finds maximum', 'C) Sorts completely', 'D) No change'],
        answer: 'B',
        exp: 'Bubble sort pushes largest element to end in each pass',
        level: 'medium'
      });
    }

    if (algoKey === 'selection') {
      questions.push({
        q: `What is the time complexity of this ${langName} selection sort?`,
        options: ['A) O(n)', 'B) O(n log n)', 'C) O(n²)', 'D) O(1)'],
        answer: 'C',
        exp: 'Selection sort always has O(n²) regardless of input',
        level: 'easy'
      });
    }

    if (algoKey === 'quick') {
      questions.push({
        q: `Which element is used as pivot in this ${langName} quick sort?`,
        options: ['A) First element', 'B) Last element', 'C) Middle element', 'D) Random'],
        answer: 'A',
        exp: 'This implementation uses the first element as pivot',
        level: 'medium'
      });
    }

    if (algoKey === 'merge') {
      questions.push({
        q: `What is the space complexity of this ${langName} merge sort?`,
        options: ['A) O(1)', 'B) O(n)', 'C) O(log n)', 'D) O(n log n)'],
        answer: 'B',
        exp: 'Merge sort requires O(n) auxiliary space for merging',
        level: 'medium'
      });
    }

    if (algoKey === 'binary-search') {
      questions.push({
        q: `What is the time complexity of this ${langName} binary search?`,
        options: ['A) O(n)', 'B) O(log n)', 'C) O(n²)', 'D) O(1)'],
        answer: 'B',
        exp: 'Binary search halves the search space each iteration',
        level: 'easy'
      });

      questions.push({
        q: `What prerequisite does this ${langName} binary search require?`,
        options: ['A) Unsorted array', 'B) Sorted array', 'C) Linked list', 'D) Binary tree'],
        answer: 'B',
        exp: 'Binary search only works on sorted arrays',
        level: 'easy'
      });
    }

    if (algoKey === 'bfs') {
      questions.push({
        q: `What data structure does this ${langName} BFS use?`,
        options: ['A) Stack', 'B) Queue', 'C) Heap', 'D) Tree'],
        answer: 'B',
        exp: 'BFS uses a queue for level-order traversal',
        level: 'easy'
      });

      questions.push({
        q: `What does this ${langName} BFS code guarantee?`,
        options: ['A) Longest path', 'B) Shortest path', 'C) Minimum spanning tree', 'D) Topological order'],
        answer: 'B',
        exp: 'BFS guarantees shortest path in unweighted graphs',
        level: 'medium'
      });
    }

    if (algoKey === 'dfs') {
      questions.push({
        q: `What data structure does this ${langName} DFS use?`,
        options: ['A) Queue', 'B) Stack', 'C) Heap', 'D) Array'],
        answer: 'B',
        exp: 'DFS uses a stack (or recursion) for depth-first traversal',
        level: 'easy'
      });
    }
  }

  return questions;
}

function generateAlgoOptions(correctAlgo) {
  const sortingAlgos = ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort'];
  const searchingAlgos = ['Linear Search', 'Binary Search', 'Jump Search'];
  const graphAlgos = ['BFS', 'DFS', 'Dijkstra', 'Prim', 'Kruskal'];

  let options;
  if (['bubble', 'selection', 'insertion', 'merge', 'quick', 'heap'].includes(correctAlgo)) {
    options = sortingAlgos;
  } else if (['linear-search', 'binary-search', 'jump-search'].includes(correctAlgo)) {
    options = searchingAlgos;
  } else {
    options = graphAlgos;
  }

  const correctIdx = options.findIndex(o => o.toLowerCase().replace(' ', '-') === correctAlgo);
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  // Track which shuffled position holds the correct option so the answer
  // letter stays valid after the shuffle (sorting lists have up to 6 items).
  const correctPos = shuffled.indexOf(options[correctIdx]);

  const letterMap = ['A', 'B', 'C', 'D', 'E', 'F'];
  return {
    options: shuffled.map((opt, i) => `${letterMap[i]}) ${opt}`),
    answer: letterMap[correctPos] ?? 'A',
  };
}

export default function QuizPanel({ topic, onComplete, difficulty = 'easy' }) {
  const t = useT('practice');
  const [started, setStarted] = useState(false);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [questionMode, setQuestionMode] = useState('general');
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState('built-in');
  const [completed, setCompleted] = useState(false);
  const [lang, setLang] = useLang('js');

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStart = async () => {
    console.log('Starting quiz - resetting state');
    setQuestionNumber(1);
    setScore(0);
    setCompleted(false);
    setStarted(true);
    setIsTransitioning(true);
    await loadQuestion();
    setIsTransitioning(false);
  };

  const getActualQuestionType = () => {
    return questionMode;
  };

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setSubmitted(false);
    setFeedback(null);
    setSource('loading');
    setLoadingMode(null);

    const actualType = getActualQuestionType();

    setLoadingMode('built-in');
    await new Promise(resolve => setTimeout(resolve, 300));
    const questionData = getRandomQuestion(topic, actualType, lang, difficulty);

    if (questionData) {
      questionData.questionType = actualType;
    }

    setQuestion(questionData);
    setSource('built-in');
    setLoading(false);
    setLoadingMode(null);
  }, [topic, questionMode, lang, difficulty]);

  const handleSubmit = () => {
    console.log('Submit clicked - submitted:', submitted, 'selectedAnswer:', selectedAnswer);
    if (!selectedAnswer || submitted) return;
    setSubmitted(true);
    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) setScore((s) => s + 10);
    setFeedback({ isCorrect });
    console.log('Feedback set:', isCorrect);
  };

  const handleNext = async () => {
    if (isTransitioning) return;
    console.log('Next clicked - submitted:', submitted, 'questionNumber:', questionNumber);
    
    if (onComplete && submitted) {
      await Promise.resolve(onComplete(topic, selectedAnswer === question.correctAnswer));
    }

    if (questionLimit !== 999 && questionNumber >= questionLimit) {
      setCompleted(true);
      return;
    }

    setIsTransitioning(true);
    setQuestionNumber((n) => n + 1);
    await loadQuestion();
    setIsTransitioning(false);
  };

  const getOptionClass = (option) => {
    const letter = option.charAt(0);
    let classes = 'quiz-option';
    if (submitted) {
      if (letter === question.correctAnswer) classes += ' correct';
      else if (letter === selectedAnswer) classes += ' incorrect';
    } else if (letter === selectedAnswer) {
      classes += ' selected';
    }
    return classes;
  };

  const topicColor = TOPIC_COLORS[topic] || TOPIC_COLORS.sorting;

  if (!started) {
    const topicColor = TOPIC_COLORS[topic] || TOPIC_COLORS.sorting;
    return (
      <div className="quiz-container" style={{ 
        borderLeftColor: topicColor.border, 
        borderLeftWidth: '4px', 
        borderLeftStyle: 'solid',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ 
            background: topicColor.bg, 
            color: topicColor.text, 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '700'
          }}>
            {topic === 'sorting' && '⊞'} 
            {topic === 'searching' && '⌕'} 
            {topic === 'trees' && '⬡'} 
            {topic === 'graphs' && '◇'}
            {' '}{t('quiz.title', { topic: t(`topics.${topic}`, { defaultValue: topic }) })}
          </span>
        </div>
        
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('quiz.settings.questions')}</span>
            <select 
              value={questionLimit}
              onChange={(e) => setQuestionLimit(Number(e.target.value))}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={999}>{t('quiz.settings.unlimited')}</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('quiz.settings.mode')}</span>
            <select
              value={questionMode}
              onChange={(e) => setQuestionMode(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value="general">{t('quiz.modes.general')}</option>
              <option value="code">{t('quiz.modes.code')}</option>
              <option value="complexity">{t('quiz.modes.complexity')}</option>
            </select>
          </div>

          {questionMode === 'code' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('quiz.settings.lang')}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {CODE_LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {t(`quiz.descriptions.${questionMode}`, { topic: t(`topics.${topic}`, { defaultValue: topic }) })}
        </p>
        <button className="btn btn-primary" onClick={handleStart} disabled={isTransitioning} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
          {t('quiz.actions.start')}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-container" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          {loadingMode === 'built-in' ? (
            <>{t('quiz.loading.builtIn')}</>
          ) : (
            <>{t('quiz.loading.generic')}</>
          )}
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="quiz-container" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{t('quiz.results.title')}</h2>
        <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>{score}</div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('quiz.results.points')}</p>
        <p style={{ marginBottom: '2rem' }}>
          {t('quiz.results.answered', { count: questionNumber })}
        </p>
        <button className="btn btn-primary" onClick={() => { setCompleted(false); setStarted(false); setQuestionNumber(1); setScore(0); }} style={{ fontSize: '1rem' }}>
          {t('quiz.actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="quiz-container">
        <button className="btn btn-primary" onClick={loadQuestion}>
          {t('quiz.actions.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-progress">
          <span>{t('quiz.progress.question', { count: questionNumber })}</span>
        </div>
        <div className="quiz-stats">
          <div className="quiz-stat">
            <div className="quiz-stat-value">{score}</div>
            <div className="quiz-stat-label">{t('quiz.results.score')}</div>
          </div>
        </div>
      </div>

      <div className="quiz-question" style={{ borderLeftColor: topicColor.border, borderLeftWidth: '4px', borderLeftStyle: 'solid' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {source === 'built-in' && <span style={{
            background: 'var(--surface3)',
            color: 'var(--text-muted)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>
            {/* The emoji lives in the locale string — do not prefix it here. */}
            {t('quiz.badges.builtIn')}
          </span>}
          {question.algorithm && <span style={{
            background: topicColor.bg,
            color: topicColor.text,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>{t(`algorithms:${question.algorithm}.name`, { defaultValue: algoNames[question.algorithm] || question.algorithm })}</span>}
          {question.questionType === 'code' && <span style={{
            background: '#3b82f6',
            color: '#fff',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span>💻</span>
            <span style={{ textTransform: 'uppercase' }}>{(question.language || lang).replace('js', 'JS').replace('python', 'PY').replace('cpp', 'C++').replace('java', 'Java')}</span>
          </span>}
          {question.questionType === 'complexity' && <span style={{ 
            background: '#f7c59f', 
            color: '#000', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>📊 {t('quiz.badges.complexity')}</span>}
          {question.level && <span style={{
            background: 'var(--surface2)',
            color: 'var(--text)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.65rem',
            textTransform: 'capitalize'
          }}>{t(`quiz.levels.${question.level}`, { defaultValue: question.level })}</span>}
        </span>
        
        {question.questionType === 'code' && (question.question.includes('```') || question.question.includes('`')) ? (
          <CodeBlock question={question.question} />
        ) : (
          <h3 className="quiz-question-text">{question.question}</h3>
        )}
      </div>

      <div className="quiz-options">
        {question.options?.map((option) => (
          <button
            key={option}
            className={getOptionClass(option)}
            onClick={() => !submitted && setSelectedAnswer(option.charAt(0))}
            disabled={submitted}
          >
            <span className="quiz-option-letter">{option.charAt(0)}</span>
            <span>{option.substring(3)}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`quiz-feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="quiz-feedback-title">
            {feedback.isCorrect ? t('quiz.feedback.correct') : t('quiz.feedback.incorrect')}
          </div>
          <div className="quiz-feedback-text">
            {question.explanation || (feedback.isCorrect ? '' : t('quiz.feedback.wrongAnswer', { answer: question.correctAnswer }))}
          </div>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedAnswer || isTransitioning}
          >
            {t('quiz.actions.submit')}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={isTransitioning}
          >
            {t('quiz.actions.next')}
          </button>
        )}
      </div>
    </div>
  );
}