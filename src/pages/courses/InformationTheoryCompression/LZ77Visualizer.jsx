import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileArchive,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Zap,
} from 'lucide-react';
import { useT } from '../../../hooks/useT';
import {
  compressLZ77,
  decompressLZ77,
  LZ77_LIMITS,
  parseLZ77Tokens,
} from '../../../algorithms/compression/lz77';

const LECTURE_EXAMPLE = 'ABAABABAABBBBBBBBBBBBA';
const PLAYBACK_DELAYS = { slow: 900, normal: 450, fast: 160 };
const SPEEDS = ['slow', 'normal', 'fast'];

function printableSymbol(symbol) {
  if (symbol === ' ') return '␠';
  if (symbol === '\n') return '↵';
  if (symbol === '\t') return '⇥';
  return symbol;
}

function formatToken(token) {
  const next = token.nextChar === null ? '∅' : printableSymbol(token.nextChar);
  return `<${token.offset}, ${token.length}, ${next}>`;
}

export default function LZ77Visualizer() {
  const t = useT();
  const [input, setInput] = useState(LECTURE_EXAMPLE);
  const [tokenInput, setTokenInput] = useState('<0, 0, A>\n<1, 1, B>');
  const [searchBufferSize, setSearchBufferSize] = useState(5);
  const [lookaheadBufferSize, setLookaheadBufferSize] = useState(5);
  const [mode, setMode] = useState('compress');
  const [tokens, setTokens] = useState([]);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [operation, setOperation] = useState(null);
  const [speed, setSpeed] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const decodedTokens = useMemo(() => {
    if (mode !== 'decompress') return { tokens: [], error: '' };
    try {
      return { tokens: parseLZ77Tokens(tokenInput), error: '' };
    } catch (parseError) {
      return { tokens: [], error: parseError.message };
    }
  }, [mode, tokenInput]);

  const inputSymbols = useMemo(() => Array.from(input), [input]);
  const activeStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const isCompressionComplete = operation === 'compress' && activeStep?.type === 'complete';
  const shownTokens = operation === 'decompress'
    ? tokens
    : tokens.slice(0, activeStep?.tokenCount ?? 0);
  const cursor = activeStep?.cursor ?? 0;
  const searchStart = activeStep?.searchStart ?? Math.max(0, cursor - searchBufferSize);
  const expectedIndex = activeStep?.candidateStart === undefined
    ? -1
    : searchStart + activeStep.candidateStart
      + (activeStep.matchIndex % Math.max(1, activeStep.searchBuffer.length - activeStep.candidateStart));
  const inputCount = inputSymbols.length;
  const bitEstimate = useMemo(() => {
    if (!inputSymbols.every((symbol) => symbol.codePointAt(0) <= 255)) return null;
    const positionBits = Math.max(1, Math.ceil(Math.log2(searchBufferSize + 1)));
    const maximumMatch = Math.min(searchBufferSize, lookaheadBufferSize);
    const lengthBits = Math.max(1, Math.ceil(Math.log2(maximumMatch + 1)));
    const originalBits = inputCount * 8;
    const compressedBits = tokens.length * (positionBits + lengthBits + 8);
    return {
      positionBits,
      lengthBits,
      originalBits,
      compressedBits,
      savedBits: originalBits - compressedBits,
    };
  }, [inputCount, inputSymbols, lookaheadBufferSize, searchBufferSize, tokens.length]);

  useEffect(() => {
    if (!isPlaying || stepIndex < 0 || stepIndex >= steps.length - 1) return undefined;
    const timer = window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      if (stepIndex + 1 >= steps.length - 1) setIsPlaying(false);
    }, PLAYBACK_DELAYS[speed]);
    return () => window.clearTimeout(timer);
  }, [isPlaying, speed, stepIndex, steps.length]);

  function clearRun() {
    setIsPlaying(false);
    setSteps([]);
    setStepIndex(-1);
    setTokens([]);
    setOperation(null);
    setError('');
  }

  function updateInput(value) {
    setInput(value);
    clearRun();
  }

  function updateTokenInput(value) {
    setTokenInput(value);
    clearRun();
  }

  function updateWindow(setSize, value) {
    setSize(Number(value));
    clearRun();
  }

  function loadLectureExample() {
    setInput(LECTURE_EXAMPLE);
    setSearchBufferSize(5);
    setLookaheadBufferSize(5);
    clearRun();
  }

  function startCompression() {
    try {
      const result = compressLZ77(input, { searchBufferSize, lookaheadBufferSize });
      setTokens(result.tokens);
      setSteps(result.steps);
      setStepIndex(0);
      setOperation('compress');
      setIsPlaying(result.steps.length > 1);
      setError('');
    } catch (runError) {
      setError(runError.message);
      setIsPlaying(false);
    }
  }

  function startDecompression() {
    try {
      const sourceTokens = mode === 'decompress' ? decodedTokens.tokens : tokens;
      const result = decompressLZ77(sourceTokens);
      setTokens(sourceTokens);
      setSteps(result.steps);
      setStepIndex(0);
      setOperation('decompress');
      setIsPlaying(result.steps.length > 1);
      setError('');
    } catch (runError) {
      setError(runError.message);
      setIsPlaying(false);
    }
  }

  function nextStep() {
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(nextIndex);
    if (nextIndex === steps.length - 1) setIsPlaying(false);
  }

  function previousStep() {
    setIsPlaying(false);
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function restart() {
    if (steps.length === 0) return;
    setIsPlaying(false);
    setStepIndex(0);
  }

  function play() {
    if (steps.length === 0) return;
    if (stepIndex >= steps.length - 1) setStepIndex(0);
    setIsPlaying(true);
  }

  const historyStart = Math.max(0, stepIndex - 5);
  const stepHistory = steps.slice(historyStart, Math.max(historyStart, stepIndex + 1));
  const decodedText = operation === 'decompress' ? activeStep?.output ?? '' : '';

  return (
    <section className="lz77-visualizer" aria-labelledby="lz77-title">
      <header className="lz77-heading">
        <div className="lz77-title-mark"><FileArchive size={20} /></div>
        <div>
          <span className="compression-eyebrow">LZ77</span>
          <h2 id="lz77-title">{t('catalog:compression.visualizer.title')}</h2>
          <p>{t('catalog:compression.dictionary.lz77Description')}</p>
        </div>
      </header>

      {mode === 'compress' ? (
        <div className="lz77-input-grid">
          <label className="lz77-input-field">
            <span>{t('catalog:compression.visualizer.inputLabel')}</span>
            <textarea
              value={input}
              maxLength={LZ77_LIMITS.maxInputLength}
              placeholder={t('catalog:compression.visualizer.inputPlaceholder')}
              onChange={(event) => updateInput(event.target.value)}
              rows={2}
            />
            <small>{t('catalog:compression.visualizer.inputHelp', {
              count: inputCount,
              limit: LZ77_LIMITS.maxInputLength,
            })}</small>
          </label>
          <div className="lz77-window-inputs">
            <label>
              <span>{t('catalog:compression.visualizer.searchSize')}</span>
              <input
                type="number"
                min="1"
                max={LZ77_LIMITS.maxWindowSize}
                value={searchBufferSize}
                onChange={(event) => updateWindow(setSearchBufferSize, event.target.value)}
              />
            </label>
            <label>
              <span>{t('catalog:compression.visualizer.lookaheadSize')}</span>
              <input
                type="number"
                min="1"
                max={LZ77_LIMITS.maxWindowSize}
                value={lookaheadBufferSize}
                onChange={(event) => updateWindow(setLookaheadBufferSize, event.target.value)}
              />
            </label>
            <small>{t('catalog:compression.visualizer.windowHelp')}</small>
          </div>
        </div>
      ) : (
        <label className="lz77-input-field lz77-token-input">
          <span>{t('catalog:compression.visualizer.tokenInputLabel')}</span>
          <textarea
            value={tokenInput}
            placeholder={t('catalog:compression.visualizer.tokenInputPlaceholder')}
            onChange={(event) => updateTokenInput(event.target.value)}
            rows={4}
            spellCheck="false"
            aria-invalid={Boolean(decodedTokens.error)}
          />
          <small>
            {t('catalog:compression.visualizer.tokenInputHelp')}
            {decodedTokens.error && <span className="lz77-inline-error"> {decodedTokens.error}</span>}
          </small>
        </label>
      )}

      <div className="lz77-actions">
        {mode === 'compress' ? (
          <>
            <button type="button" className="compression-primary-button" onClick={startCompression}>
              <ArrowUpFromLine size={16} /> {t('catalog:compression.visualizer.compress')}
            </button>
            <button
              type="button"
              className="compression-secondary-button"
              onClick={startDecompression}
              disabled={!isCompressionComplete || tokens.length === 0 || isPlaying}
              title={t('catalog:compression.visualizer.decompressHelp')}
            >
              <ArrowDownToLine size={16} /> {t('catalog:compression.visualizer.decompress')}
            </button>
            <button type="button" className="compression-quiet-button" onClick={loadLectureExample}>
              <Zap size={15} /> {t('catalog:compression.lossless.slideExample')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="compression-primary-button"
            onClick={startDecompression}
            disabled={decodedTokens.tokens.length === 0 || isPlaying}
          >
            <ArrowDownToLine size={16} /> {t('catalog:compression.visualizer.decompress')}
          </button>
        )}
      </div>

      <div className="lz77-mode-tabs" role="tablist" aria-label={t('catalog:compression.visualizer.mode')}>
        {['compress', 'decompress'].map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            role="tab"
            aria-selected={mode === nextMode}
            className={`lz77-mode-tab${mode === nextMode ? ' is-active' : ''}`}
            onClick={() => {
              setMode(nextMode);
              clearRun();
            }}
          >
            {nextMode === 'compress'
              ? t('catalog:compression.visualizer.compress')
              : t('catalog:compression.visualizer.decompress')}
          </button>
        ))}
      </div>

      {error && (
        <div className="lz77-error" role="alert">
          <strong>{t('catalog:compression.visualizer.error')}:</strong> {error}
        </div>
      )}

      <div className="lz77-workbench">
        <div className="lz77-workbench-main">
          <section className="compression-panel" aria-labelledby="lz77-buffers-title">
            <div className="compression-panel-heading">
              <div>
                <span className="compression-eyebrow">{t('catalog:compression.visualizer.buffersTitle')}</span>
                <h3 id="lz77-buffers-title">{t('catalog:compression.visualizer.inputLabel')}</h3>
              </div>
              <span className="lz77-cursor-badge">
                {t('catalog:compression.visualizer.cursor')}: {Math.min(cursor, inputCount)}
              </span>
            </div>
            <div className="lz77-symbol-track" aria-label={input}>
              {inputSymbols.length === 0 ? (
                <span className="lz77-empty-track">∅</span>
              ) : inputSymbols.map((symbol, index) => {
                const inSearch = operation === 'compress' && index >= searchStart && index < cursor;
                const inLookahead = operation === 'compress'
                  && index >= cursor
                  && index < cursor + lookaheadBufferSize;
                const isExpected = operation === 'compress' && index === expectedIndex;
                const isActual = operation === 'compress'
                  && activeStep?.matchIndex !== undefined
                  && index === cursor + activeStep.matchIndex;
                const classNames = [
                  'lz77-symbol',
                  inSearch ? 'is-search' : '',
                  inLookahead ? 'is-lookahead' : '',
                  activeStep?.candidateStart !== undefined && index === searchStart + activeStep.candidateStart
                    ? 'is-candidate'
                    : '',
                  isExpected ? 'is-expected' : '',
                  isActual ? 'is-actual' : '',
                ].filter(Boolean).join(' ');
                return (
                  <span
                    key={`${index}-${symbol}`}
                    className={classNames}
                    aria-label={`${symbol === ' ' ? 'space' : symbol}, ${index}`}
                  >
                    {printableSymbol(symbol)}
                  </span>
                );
              })}
            </div>
            <div className="lz77-window-legend">
              <span><i className="is-search" /> {t('catalog:compression.visualizer.searchBuffer')}</span>
              <span><i className="is-lookahead" /> {t('catalog:compression.visualizer.lookaheadBuffer')}</span>
              <span><i className="is-remaining" /> {t('catalog:compression.visualizer.remaining')}</span>
            </div>
            <div className="lz77-buffer-readout">
              <div>
                <span>{t('catalog:compression.visualizer.searchBuffer')}</span>
                <code>{activeStep?.searchBuffer ? printableSymbolString(activeStep.searchBuffer) : '∅'}</code>
              </div>
              <div>
                <span>{t('catalog:compression.visualizer.lookaheadBuffer')}</span>
                <code>{activeStep?.lookaheadBuffer ? printableSymbolString(activeStep.lookaheadBuffer) : '∅'}</code>
              </div>
            </div>
          </section>

          <section className="compression-panel" aria-labelledby="lz77-tokens-title">
            <div className="compression-panel-heading">
              <div>
                <span className="compression-eyebrow">LZ77</span>
                <h3 id="lz77-tokens-title">{t('catalog:compression.visualizer.tokensTitle')}</h3>
              </div>
              <span className="lz77-count-badge">{shownTokens.length} / {tokens.length}</span>
            </div>
            <p className="lz77-format-note">{t('catalog:compression.visualizer.tokenFormat')}</p>
            {shownTokens.length === 0 ? (
              <p className="lz77-empty-state">{t('catalog:compression.visualizer.emptyTokens')}</p>
            ) : (
              <ol className="lz77-token-list" aria-label={t('catalog:compression.visualizer.tokensTitle')}>
                {shownTokens.map((token, index) => (
                  <li
                    key={`${index}-${token.offset}-${token.length}`}
                    className={operation === 'decompress' && activeStep?.tokenIndex === index
                      ? 'is-current'
                      : ''}
                    aria-current={operation === 'decompress' && activeStep?.tokenIndex === index ? 'step' : undefined}
                  >
                    <span>{index + 1}</span>
                    <code>{formatToken(token)}</code>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="compression-panel lz77-decoded-panel" aria-labelledby="lz77-decoded-title">
            <div className="compression-panel-heading">
              <div>
                <span className="compression-eyebrow">{t('catalog:compression.visualizer.decompress')}</span>
                <h3 id="lz77-decoded-title">{t('catalog:compression.visualizer.decodedTitle')}</h3>
              </div>
              {operation === 'decompress' && <span className="lz77-count-badge">{Array.from(decodedText).length}</span>}
            </div>
            <p className="lz77-decoded-output" aria-live="polite">
              {decodedText ? printableSymbolString(decodedText) : t('catalog:compression.visualizer.emptyDecoded')}
            </p>
          </section>

          <BitCountPanel
            t={t}
            estimate={bitEstimate}
            complete={isCompressionComplete}
            tokenCount={tokens.length}
          />
        </div>

        <aside className="lz77-playback-column">
          <section className="compression-panel lz77-playback-panel" aria-labelledby="lz77-steps-title">
            <div className="compression-panel-heading">
              <div>
                <span className="compression-eyebrow">{t('catalog:compression.visualizer.status')}</span>
                <h3 id="lz77-steps-title">{t('catalog:compression.visualizer.stepsTitle')}</h3>
              </div>
              {activeStep && (
                <span className="lz77-count-badge">
                  {t('catalog:compression.visualizer.stepCount', {
                    current: stepIndex + 1,
                    total: steps.length,
                  })}
                </span>
              )}
            </div>

            <div className="lz77-speed-picker" role="group" aria-label={t('catalog:compression.visualizer.speed')}>
              <span>{t('catalog:compression.visualizer.speed')}</span>
              <div>
                {SPEEDS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={speed === option ? 'is-active' : ''}
                    aria-pressed={speed === option}
                    onClick={() => setSpeed(option)}
                  >
                    {t(`catalog:compression.visualizer.${option}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="lz77-playback-controls">
              <button type="button" onClick={restart} disabled={steps.length === 0} aria-label={t('catalog:compression.visualizer.restart')} title={t('catalog:compression.visualizer.restart')}>
                <RotateCcw size={16} />
              </button>
              <button type="button" onClick={previousStep} disabled={stepIndex <= 0} aria-label={t('catalog:compression.visualizer.previous')} title={t('catalog:compression.visualizer.previous')}>
                <SkipBack size={16} />
              </button>
              {isPlaying ? (
                <button type="button" className="is-primary" onClick={() => setIsPlaying(false)} aria-label={t('catalog:compression.visualizer.pause')} title={t('catalog:compression.visualizer.pause')}>
                  <Pause size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="is-primary"
                  onClick={play}
                  disabled={steps.length === 0}
                  aria-label={t('catalog:compression.visualizer.play')}
                  title={t('catalog:compression.visualizer.play')}
                >
                  <Play size={17} />
                </button>
              )}
              <button type="button" onClick={nextStep} disabled={stepIndex < 0 || stepIndex >= steps.length - 1} aria-label={t('catalog:compression.visualizer.next')} title={t('catalog:compression.visualizer.next')}>
                <SkipForward size={16} />
              </button>
            </div>

            <div className="lz77-step-progress" aria-hidden="true">
              <span style={{ width: `${steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0}%` }} />
            </div>

            <div className="lz77-current-explanation" aria-live="polite" aria-atomic="true">
              {activeStep
                ? t(activeStep.msgKey, activeStep.msgParams)
                : t('catalog:compression.visualizer.noSteps')}
            </div>

            {stepHistory.length > 1 && (
              <ol className="lz77-step-history" aria-label={t('catalog:compression.visualizer.stepsTitle')}>
                {stepHistory.slice(0, -1).map((step, index) => (
                  <li key={`${historyStart + index}-${step.type}`}>
                    {t(step.msgKey, step.msgParams)}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function BitCountPanel({ t, estimate, complete, tokenCount }) {
  return (
    <section className="compression-panel lz77-bit-panel" aria-labelledby="lz77-bit-title">
      <div className="compression-panel-heading">
        <div>
          <span className="compression-eyebrow">LZ77</span>
          <h3 id="lz77-bit-title">{t('catalog:compression.visualizer.statisticsTitle')}</h3>
        </div>
      </div>
      {estimate ? (
        <>
          <div className="lz77-bit-stats">
            <div><span>{t('catalog:compression.visualizer.originalBits')}</span><strong>{complete ? t('catalog:compression.visualizer.bitsValue', { count: estimate.originalBits }) : '—'}</strong></div>
            <div><span>{t('catalog:compression.visualizer.compressedBits')}</span><strong>{complete ? t('catalog:compression.visualizer.bitsValue', { count: estimate.compressedBits }) : '—'}</strong></div>
            <div><span>{t('catalog:compression.visualizer.savedBits')}</span><strong>{complete ? t('catalog:compression.visualizer.bitsValue', { count: estimate.savedBits }) : '—'}</strong></div>
          </div>
          <small>
            {t('catalog:compression.visualizer.compressionNote', {
              positionBits: estimate.positionBits,
              lengthBits: estimate.lengthBits,
            })}
            {complete && ` ${tokenCount} × (${estimate.positionBits} + ${estimate.lengthBits} + 8).`}
          </small>
        </>
      ) : (
        <small>{t('catalog:compression.visualizer.asciiOnly')}</small>
      )}
    </section>
  );
}

function printableSymbolString(value) {
  return Array.from(value, printableSymbol).join('');
}
