import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Binary,
  FileArchive,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useT } from '../../../hooks/useT';
import { compressLZ78, compressLZW, decompressLZ78, decompressLZW } from '../../../algorithms/compression/dictionary';
import { compressHuffman, compressModifiedHuffman, compressAdaptiveHuffman, decompressHuffman, decompressAdaptiveHuffman } from '../../../algorithms/compression/huffman';
import { compressArithmetic, decompressArithmetic } from '../../../algorithms/compression/arithmetic';

const PLAYBACK_DELAYS = { slow: 900, normal: 450, fast: 160 };
const SPEEDS = ['slow', 'normal', 'fast'];
const DICTIONARY_DESCRIPTIONS = { lz78: 'lz78Description', lzw: 'lzwDescription' };
const MAX_INPUT_LENGTH = 256;

function serializePayload(algorithm, result) {
  if (algorithm === 'lz78') return result.tokens;
  if (algorithm === 'lzw') return { codes: result.codes };
  if (algorithm === 'huffman' || algorithm === 'modifiedHuffman') return { bits: result.bits, codebook: result.codebook };
  if (algorithm === 'adaptiveHuffman') return { alphabet: result.alphabet, bits: result.bits, events: result.events };
  return result.payload;
}

function decodePayload(algorithm, payload) {
  if (algorithm === 'lz78') return decompressLZ78(payload);
  if (algorithm === 'lzw') {
    if (!payload || !Array.isArray(payload.codes)) {
      throw new TypeError('LZW data must contain an array of codes.');
    }
    return decompressLZW(payload.codes);
  }
  if (algorithm === 'huffman' || algorithm === 'modifiedHuffman') {
    if (!payload || typeof payload.bits !== 'string') throw new TypeError('Huffman data must contain a bit string and codebook.');
    return decompressHuffman(payload.bits, payload.codebook);
  }
  if (algorithm === 'adaptiveHuffman') return decompressAdaptiveHuffman(payload);
  return decompressArithmetic(payload);
}

function stepMessage(step, t) {
  return t(step.msgKey, step);
}

function algorithmTitle(algorithm, t) {
  if (algorithm === 'lz78' || algorithm === 'lzw') return t(`catalog:compression.dictionary.${algorithm}`);
  if (algorithm === 'adaptiveHuffman') return t('catalog:compression.lossless.adaptiveHuffmanTitle');
  if (algorithm === 'modifiedHuffman') return t('catalog:compression.lossless.modifiedHuffmanTitle');
  return t(`catalog:compression.lossless.${algorithm === 'huffman' ? 'huffmanTitle' : 'arithmeticTitle'}`);
}

function algorithmDescription(algorithm, t) {
  if (algorithm === 'lz78' || algorithm === 'lzw') return t(`catalog:compression.dictionary.${DICTIONARY_DESCRIPTIONS[algorithm]}`);
  if (algorithm === 'modifiedHuffman') return t('catalog:compression.lossless.modifiedHuffmanDescription');
  return t(`catalog:compression.lossless.${algorithm === 'adaptiveHuffman' ? 'adaptiveHuffmanDescription' : `${algorithm}Description`}`);
}

export default function LosslessAlgorithmVisualizer({ algorithm }) {
  const t = useT();
  const [mode, setMode] = useState('compress');
  const [text, setText] = useState(() => ({
    lz78: 'ABAABABAABABBBBBBBBBBA',
    lzw: 'ABAABABBAABAABAAAABABBBBBBBB',
    huffman: 'abaacaadaa',
    modifiedHuffman: 'abcazdafcqdadcuabapd',
    adaptiveHuffman: 'ABCCCAAAA',
    arithmetic: 'ACBA',
  })[algorithm] ?? 'ABABABA');
  const [encodedInput, setEncodedInput] = useState('');
  const [arithmeticFrequencies, setArithmeticFrequencies] = useState('{"A":80,"B":2,"C":18}');
  const [minimumProbability, setMinimumProbability] = useState(0.05);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [encodedOutput, setEncodedOutput] = useState('');
  const [operation, setOperation] = useState(null);
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);

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
    setEncodedOutput('');
    setOperation(null);
    setError('');
  }

  function runCompression() {
    try {
      if (Array.from(text).length > MAX_INPUT_LENGTH) {
        throw new RangeError(`Input text must contain at most ${MAX_INPUT_LENGTH} characters.`);
      }
      const compression = algorithm === 'lz78'
        ? compressLZ78(text)
        : algorithm === 'lzw'
          ? compressLZW(text)
          : algorithm === 'huffman'
            ? compressHuffman(text)
            : algorithm === 'modifiedHuffman'
              ? compressModifiedHuffman(text, Number(minimumProbability))
            : algorithm === 'adaptiveHuffman'
              ? compressAdaptiveHuffman(text)
              : compressArithmetic(text, JSON.parse(arithmeticFrequencies));
      const payload = serializePayload(algorithm, compression);
      const encoded = JSON.stringify(payload, null, 2);
      setEncodedOutput(encoded);
      setEncodedInput(encoded);
      setSteps(compression.steps);
      setStepIndex(0);
      setOperation('compress');
      setIsPlaying(compression.steps.length > 1);
      setError('');
    } catch (runError) {
      setError(runError.message);
      setIsPlaying(false);
    }
  }

  function runDecompression() {
    try {
      if (encodedInput.length > 100000) {
        throw new RangeError('Encoded input cannot exceed 100,000 characters.');
      }
      const payload = JSON.parse(encodedInput);
      const result = decodePayload(algorithm, payload);
      setEncodedOutput(encodedInput);
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

  const activeStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const historyStart = Math.max(0, stepIndex - 4);
  const decodedText = operation === 'decompress' ? activeStep?.output ?? '' : '';

  function nextStep() {
    const next = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(next);
    if (next === steps.length - 1) setIsPlaying(false);
  }

  function play() {
    if (steps.length === 0) return;
    if (stepIndex >= steps.length - 1) setStepIndex(0);
    setIsPlaying(true);
  }

  return (
    <section className="lz77-visualizer compression-algorithm-visualizer" aria-labelledby={`${algorithm}-title`}>
      <header className="lz77-heading">
        <div className="lz77-title-mark"><FileArchive size={20} /></div>
        <div>
          <span className="compression-eyebrow">{algorithmTitle(algorithm, t)}</span>
          <h2 id={`${algorithm}-title`}>{t('catalog:compression.visualizer.algorithmTitle', {
            algorithm: algorithmTitle(algorithm, t),
          })}</h2>
          <p>{algorithmDescription(algorithm, t)}</p>
        </div>
      </header>

      {mode === 'compress' ? (
        <>
          <label className="lz77-input-field">
            <span>{t('catalog:compression.visualizer.inputLabel')}</span>
            <textarea
              value={text}
              maxLength={MAX_INPUT_LENGTH}
              placeholder={t('catalog:compression.visualizer.inputPlaceholder')}
              onChange={(event) => {
                setText(event.target.value);
                clearRun();
              }}
              rows={2}
            />
            <small>{t('catalog:compression.visualizer.inputHelp', { count: Array.from(text).length, limit: MAX_INPUT_LENGTH })}</small>
          </label>
          {algorithm === 'arithmetic' && (
            <label className="lz77-input-field">
              <span>{t('catalog:compression.visualizer.arithmeticModelLabel')}</span>
              <textarea
                value={arithmeticFrequencies}
                onChange={(event) => {
                  setArithmeticFrequencies(event.target.value);
                  clearRun();
                }}
                rows={2}
                spellCheck="false"
              />
              <small>{t('catalog:compression.visualizer.arithmeticModelHelp')}</small>
            </label>
          )}
          {algorithm === 'modifiedHuffman' && (
            <label className="lz77-input-field">
              <span>{t('catalog:compression.visualizer.thresholdLabel')}</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={minimumProbability}
                onChange={(event) => {
                  setMinimumProbability(event.target.value);
                  clearRun();
                }}
              />
              <small>{t('catalog:compression.visualizer.thresholdHelp')}</small>
            </label>
          )}
        </>
      ) : (
        <label className="lz77-input-field">
          <span>{t('catalog:compression.visualizer.encodedInputLabel')}</span>
          <textarea
            value={encodedInput}
            placeholder={t(`catalog:compression.visualizer.${algorithm}PayloadPlaceholder`)}
            onChange={(event) => {
              setEncodedInput(event.target.value);
              clearRun();
            }}
            rows={5}
            spellCheck="false"
            aria-invalid={Boolean(error)}
          />
          <small>{t('catalog:compression.visualizer.encodedInputHelp')}</small>
        </label>
      )}

      <div className="lz77-actions">
        {mode === 'compress' ? (
          <button type="button" className="compression-primary-button" onClick={runCompression}>
            <ArrowUpFromLine size={16} /> {t('catalog:compression.visualizer.compress')}
          </button>
        ) : (
          <button type="button" className="compression-primary-button" onClick={runDecompression}>
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

      <div className="compression-algorithm-output-grid">
        <section className="compression-panel" aria-labelledby={`${algorithm}-encoded-title`}>
          <div className="compression-panel-heading">
            <div>
              <span className="compression-eyebrow">{algorithmTitle(algorithm, t)}</span>
              <h3 id={`${algorithm}-encoded-title`}>{t('catalog:compression.visualizer.encodedDataTitle')}</h3>
            </div>
            <Binary size={17} />
          </div>
          {encodedOutput ? (
            <pre className="compression-code-output" aria-live="polite"><code>{encodedOutput}</code></pre>
          ) : (
            <p className="lz77-empty-state">{t('catalog:compression.visualizer.emptyEncoded')}</p>
          )}
        </section>
        <section className="compression-panel lz77-decoded-panel" aria-labelledby={`${algorithm}-decoded-title`}>
          <div className="compression-panel-heading">
            <div>
              <span className="compression-eyebrow">{t('catalog:compression.visualizer.decompress')}</span>
              <h3 id={`${algorithm}-decoded-title`}>{t('catalog:compression.visualizer.decodedTitle')}</h3>
            </div>
          </div>
          <p className="lz77-decoded-output" aria-live="polite">
            {decodedText || t('catalog:compression.visualizer.emptyDecoded')}
          </p>
        </section>
      </div>

      <section className="compression-panel lz77-playback-panel" aria-labelledby={`${algorithm}-steps-title`}>
        <div className="compression-panel-heading">
          <div>
            <span className="compression-eyebrow">{t('catalog:compression.visualizer.status')}</span>
            <h3 id={`${algorithm}-steps-title`}>{t('catalog:compression.visualizer.stepsTitle')}</h3>
          </div>
          {activeStep && (
            <span className="lz77-count-badge">
              {t('catalog:compression.visualizer.stepCount', { current: stepIndex + 1, total: steps.length })}
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
          <button type="button" onClick={() => { setIsPlaying(false); setStepIndex(0); }} disabled={steps.length === 0} aria-label={t('catalog:compression.visualizer.restart')} title={t('catalog:compression.visualizer.restart')}>
            <RotateCcw size={16} />
          </button>
          <button type="button" onClick={() => { setIsPlaying(false); setStepIndex((current) => Math.max(0, current - 1)); }} disabled={stepIndex <= 0} aria-label={t('catalog:compression.visualizer.previous')} title={t('catalog:compression.visualizer.previous')}>
            <SkipBack size={16} />
          </button>
          {isPlaying ? (
            <button type="button" className="is-primary" onClick={() => setIsPlaying(false)} aria-label={t('catalog:compression.visualizer.pause')} title={t('catalog:compression.visualizer.pause')}>
              <Pause size={17} />
            </button>
          ) : (
            <button type="button" className="is-primary" onClick={play} disabled={steps.length === 0} aria-label={t('catalog:compression.visualizer.play')} title={t('catalog:compression.visualizer.play')}>
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
          {activeStep ? stepMessage(activeStep, t) : t('catalog:compression.visualizer.noSteps')}
        </div>
        {activeStep?.model && (
          <div className="adaptive-tree-state" aria-label={t('catalog:compression.visualizer.adaptiveTreeTitle')}>
            <strong>{t('catalog:compression.visualizer.adaptiveTreeTitle')}</strong>
            <ul>
              {activeStep.model.map((node) => (
                <li key={`${node.order}-${node.symbol}`}>
                  <code>{node.code}</code>
                  <span>{node.symbol === 'NYT' ? t('catalog:compression.visualizer.nytNode') : node.symbol}</span>
                  <small>{t('catalog:compression.visualizer.nodeNumber', { count: node.order })}</small>
                  <small>{t('catalog:compression.visualizer.nodeWeight', { count: node.weight })}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        {stepIndex >= 0 && (
          <ol className="lz77-step-history" aria-label={t('catalog:compression.visualizer.stepsTitle')}>
            {steps.slice(historyStart, stepIndex).map((step, index) => (
              <li key={`${historyStart + index}-${step.type}`}>{stepMessage(step, t)}</li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
