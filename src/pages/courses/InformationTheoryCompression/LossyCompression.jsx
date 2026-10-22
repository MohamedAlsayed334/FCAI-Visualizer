import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Check,
  Grid2X2,
  Image,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../../hooks/useT';
import {
  compressDPCM,
  compressLinearPrediction,
  compressDCT,
  LOSSY_LIMITS,
} from '../../../algorithms/compression/lossy.js';
import '../../../styles/Compression.css';

const METHODS = [
  { id: 'dpcm', titleKey: 'dpcmTitle', icon: Activity },
  { id: 'linear', titleKey: 'linearTitle', icon: Activity },
  { id: 'dct', titleKey: 'dctTitle', icon: Grid2X2 },
];
const SPEEDS = ['slow', 'normal', 'fast'];
const PLAYBACK_DELAYS = { slow: 900, normal: 450, fast: 160 };
const SIGNAL_PRESET = '10, 12, 13, 11, 17, 20, 18, 22, 21, 26, 24, 25';
const BLOCK_PRESET = [
  '52 55 61 66 70 61 64 73',
  '63 59 55 90 109 85 69 72',
  '62 59 68 113 144 104 66 73',
  '63 58 71 122 154 106 70 69',
  '67 61 68 104 126 88 68 70',
  '79 65 60 70 77 68 58 75',
  '85 71 64 59 55 61 65 83',
  '87 79 69 68 65 76 78 94',
].join('\n');

function handleMethodNavigation(event, currentIndex, selectMethod) {
  let nextIndex;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % METHODS.length;
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + METHODS.length) % METHODS.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = METHODS.length - 1;
  else return;

  event.preventDefault();
  const nextMethod = METHODS[nextIndex].id;
  selectMethod(nextMethod);
  document.getElementById(`lossy-method-tab-${nextMethod}`)?.focus();
}

function parseSignal(value) {
  const parts = value.trim().split(/[\\s,;]+/).filter(Boolean);
  if (!parts.length) throw new TypeError('empty signal');
  const samples = parts.map(Number);
  if (!samples.every(Number.isFinite)) throw new TypeError('invalid signal');
  return samples;
}

function parseBlock(value) {
  const rows = value.trim().split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const block = rows.map((row) => row.split(/[\\s,;]+/).filter(Boolean).map(Number));
  if (block.length !== LOSSY_LIMITS.dctSize
    || block.some((row) => row.length !== LOSSY_LIMITS.dctSize || !row.every(Number.isFinite))) {
    throw new TypeError('invalid 8 by 8 block');
  }
  return block;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '—';
  return Number(value.toFixed(digits)).toString();
}

function SignalReadout({ title, values, activeIndex, tone }) {
  if (!values?.length) return null;
  return (
    <section className="lossy-readout">
      <h4>{title}</h4>
      <div className={`lossy-signal-values lossy-signal-values--${tone || 'plain'}`}>
        {values.map((value, index) => (
          <span key={index} className={index === activeIndex ? 'is-active' : ''} title={`Sample ${index + 1}: ${formatNumber(value)}`}>
            <small>{index + 1}</small>
            <strong>{formatNumber(value)}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function MatrixReadout({ title, matrix, activeRow = -1, activeCol = -1, kind = 'pixels' }) {
  if (!matrix) return null;
  return (
    <section className="lossy-readout lossy-matrix-readout">
      <h4>{title}</h4>
      <div className={`lossy-matrix lossy-matrix--${kind}`} role="img" aria-label={title}>
        {matrix.map((row, rowIndex) => row.map((value, colIndex) => {
          const isActive = rowIndex === activeRow && colIndex === activeCol;
          const intensity = kind === 'pixels' ? Math.max(0, Math.min(255, value)) / 255 : 0;
          return (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={isActive ? 'is-active' : ''}
              style={kind === 'pixels' ? {
                backgroundColor: `rgb(${Math.round(intensity * 255)}, ${Math.round(intensity * 255)}, ${Math.round(intensity * 255)})`,
                color: intensity > 0.56 ? '#17202b' : intensity < 0.25 ? '#fff' : '#fff',
              } : undefined}
              title={`[${rowIndex}, ${colIndex}] ${formatNumber(value)}`}
            >
              {kind === 'pixels' ? Math.round(value) : formatNumber(value, 1)}
            </span>
          );
        }))}
      </div>
    </section>
  );
}

export default function LossyCompression() {
  const t = useT();
  const [method, setMethod] = useState('dpcm');
  const [signalText, setSignalText] = useState(SIGNAL_PRESET);
  const [blockText, setBlockText] = useState(BLOCK_PRESET);
  const [stepSize, setStepSize] = useState('2');
  const [coefficientsText, setCoefficientsText] = useState('0.75, -0.25');
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || stepIndex < 0 || stepIndex >= steps.length - 1) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
      setStepIndex(nextIndex);
      if (nextIndex >= steps.length - 1) setIsPlaying(false);
    }, PLAYBACK_DELAYS[speed]);
    return () => window.clearTimeout(timer);
  }, [isPlaying, speed, stepIndex, steps.length]);

  function clearRun() {
    setIsPlaying(false);
    setSteps([]);
    setStepIndex(-1);
    setResult(null);
    setError('');
  }

  function chooseMethod(id) {
    setMethod(id);
    setStepSize(id === 'dct' ? '8' : '2');
    clearRun();
  }

  function runCompression() {
    try {
      const size = Number(stepSize);
      let nextResult;
      if (method === 'dct') {
        nextResult = compressDCT(parseBlock(blockText), size);
      } else {
        const samples = parseSignal(signalText);
        nextResult = method === 'linear'
          ? compressLinearPrediction(samples, {
            stepSize: size,
            coefficients: parseSignal(coefficientsText),
          })
          : compressDPCM(samples, size);
      }
      setResult(nextResult);
      setSteps(nextResult.steps);
      setStepIndex(0);
      setIsPlaying(nextResult.steps.length > 1);
      setError('');
    } catch {
      setError(t('catalog:compression.lossy.runError'));
      setIsPlaying(false);
    }
  }

  function moveTo(index) {
    if (!steps.length) return;
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setStepIndex(nextIndex);
    setIsPlaying(false);
  }

  function togglePlay() {
    if (!steps.length) return;
    if (stepIndex >= steps.length - 1) setStepIndex(0);
    setIsPlaying((playing) => !playing || stepIndex >= steps.length - 1);
  }

  const activeStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const isSignalMethod = method !== 'dct';
  const currentReconstruction = activeStep?.reconstruction ?? [];
  const displayedCoefficients = activeStep?.coefficients ?? null;
  const displayedQuantized = activeStep?.quantizedCoefficients ?? null;
  const metricsVisible = activeStep?.type === 'complete';

  return (
    <div className="compression-page page animate-in lossy-page">
      <Link className="back-link" to="/courses/information-theory-compression">
        <ArrowLeft size={15} className="rtl-flip" />
        {t('catalog:compression.backToCourse')}
      </Link>

      <header className="compression-course-hero compression-course-hero--lossy">
        <span className="compression-hero-icon"><Image size={24} /></span>
        <span className="compression-eyebrow">{t('catalog:compression.lossy.eyebrow')}</span>
        <h1>{t('catalog:topic.lossy-compression.title')}</h1>
        <p>{t('catalog:compression.lossy.description')}</p>
      </header>

      <section className="compression-parts" aria-labelledby="lossy-methods-title">
        <div className="compression-section-heading">
          <div>
            <span className="compression-eyebrow">{t('catalog:compression.lossy.eyebrow')}</span>
            <h2 id="lossy-methods-title">{t('catalog:compression.lossy.partsTitle')}</h2>
          </div>
          <p>{t('catalog:compression.lossy.partsDescription')}</p>
        </div>

        <div className="compression-part-tabs lossy-method-tabs" role="tablist" aria-label={t('catalog:compression.lossy.partsTitle')}>
          {METHODS.map(({ id, titleKey, icon: Icon }) => (
            <button
              key={id}
              id={`lossy-method-tab-${id}`}
              type="button"
              role="tab"
              tabIndex={method === id ? 0 : -1}
              aria-selected={method === id}
              aria-controls="lossy-method-panel"
              className={`compression-part-tab${method === id ? ' is-active' : ''}`}
              onClick={() => chooseMethod(id)}
              onKeyDown={(event) => handleMethodNavigation(event, METHODS.findIndex((item) => item.id === id), chooseMethod)}
            >
              <Icon size={18} />
              <span>{t(`catalog:compression.lossy.${titleKey}`)}</span>
            </button>
          ))}
        </div>

        <section className="compression-part-content lossy-workspace" id="lossy-method-panel" role="tabpanel" aria-labelledby={`lossy-method-tab-${method}`}>
          <header className="lz77-heading">
            <div className="lz77-title-mark"><Image size={20} /></div>
            <div>
              <span className="compression-eyebrow">{t(`catalog:compression.lossy.${METHODS.find((item) => item.id === method).titleKey}`)}</span>
              <h2>{t(`catalog:compression.lossy.${METHODS.find((item) => item.id === method).titleKey}`)}</h2>
              <p>{t(`catalog:compression.lossy.${method}Description`)}</p>
            </div>
          </header>

          <div className="lossy-input-layout">
            <label className="lz77-input-field">
              <span>{method === 'dct' ? t('catalog:compression.lossy.blockInput') : t('catalog:compression.lossy.signalInput')}</span>
              <textarea
                value={method === 'dct' ? blockText : signalText}
                onChange={(event) => {
                  if (method === 'dct') setBlockText(event.target.value);
                  else setSignalText(event.target.value);
                  clearRun();
                }}
                rows={method === 'dct' ? 8 : 3}
                spellCheck="false"
                aria-invalid={Boolean(error)}
              />
              <small>{t(method === 'dct' ? 'catalog:compression.lossy.blockHint' : 'catalog:compression.lossy.signalHint')}</small>
            </label>
            <div className="lossy-settings">
              <label className="lz77-input-field">
                <span>{t('catalog:compression.lossy.quantizationStep')}</span>
                <input
                  type="number"
                  min="0.01"
                  max="1024"
                  step="0.5"
                  value={stepSize}
                  onChange={(event) => { setStepSize(event.target.value); clearRun(); }}
                />
                <small>{t('catalog:compression.lossy.quantizationHint')}</small>
              </label>
              {method === 'linear' && (
                <label className="lz77-input-field">
                  <span>{t('catalog:compression.lossy.predictorCoefficients')}</span>
                  <input
                    value={coefficientsText}
                    onChange={(event) => { setCoefficientsText(event.target.value); clearRun(); }}
                    spellCheck="false"
                  />
                  <small>{t('catalog:compression.lossy.coefficientsHint')}</small>
                </label>
              )}
              <button type="button" className="compression-primary-button" onClick={runCompression}>
                <Check size={16} /> {t('catalog:compression.lossy.run')}
              </button>
              <button type="button" className="compression-quiet-button" onClick={() => {
                setSignalText(SIGNAL_PRESET);
                setBlockText(BLOCK_PRESET);
                setStepSize(method === 'dct' ? '8' : '2');
                setCoefficientsText('0.75, -0.25');
                clearRun();
              }}>
                <RotateCcw size={15} /> {t('catalog:compression.lossy.resetInput')}
              </button>
            </div>
          </div>

          {error && <div className="lz77-error" role="alert">{error}</div>}

          {result && (
            <>
              <div className="lossy-workbench">
                {isSignalMethod ? (
                  <>
                    <SignalReadout title={t('catalog:compression.lossy.originalSignal')} values={result.samples} activeIndex={activeStep?.index ?? -1} tone="original" />
                    <SignalReadout title={t('catalog:compression.lossy.reconstructedSignal')} values={currentReconstruction} activeIndex={activeStep?.index ?? -1} tone="reconstruction" />
                    <section className="lossy-readout">
                      <h4>{t('catalog:compression.lossy.sampleDetails')}</h4>
                      <div className="lossy-detail-grid">
                        <div><span>{t('catalog:compression.lossy.predicted')}</span><strong>{activeStep?.predicted === undefined ? '—' : formatNumber(activeStep.predicted)}</strong></div>
                        <div><span>{t('catalog:compression.lossy.residual')}</span><strong>{activeStep?.residual === undefined ? '—' : formatNumber(activeStep.residual)}</strong></div>
                        <div><span>{t('catalog:compression.lossy.quantizedResidual')}</span><strong>{activeStep?.quantizedResidual === undefined ? '—' : formatNumber(activeStep.quantizedResidual)}</strong></div>
                      </div>
                    </section>
                  </>
                ) : (
                  <>
                    <MatrixReadout title={t('catalog:compression.lossy.originalBlock')} matrix={result.original} kind="pixels" />
                    <MatrixReadout
                      title={t('catalog:compression.lossy.transformCoefficients')}
                      matrix={displayedCoefficients}
                      activeRow={activeStep?.u ?? -1}
                      activeCol={activeStep?.v ?? -1}
                      kind="coefficients"
                    />
                    <MatrixReadout
                      title={t('catalog:compression.lossy.quantizedCoefficients')}
                      matrix={displayedQuantized}
                      activeRow={activeStep?.u ?? -1}
                      activeCol={activeStep?.v ?? -1}
                      kind="coefficients"
                    />
                    <MatrixReadout title={t('catalog:compression.lossy.reconstructedBlock')} matrix={activeStep?.reconstruction ?? null} kind="pixels" />
                  </>
                )}
              </div>

              {metricsVisible && (
                <section className="lossy-metrics" aria-live="polite">
                  <h3>{t('catalog:compression.lossy.metrics')}</h3>
                  <div>
                    <article><span>{t('catalog:compression.lossy.mse')}</span><strong>{formatNumber(activeStep.mse, 3)}</strong></article>
                    <article><span>{t('catalog:compression.lossy.psnr')}</span><strong>{Number.isFinite(activeStep.psnr) ? `${formatNumber(activeStep.psnr, 2)} dB` : t('catalog:compression.lossy.perfect')}</strong></article>
                    {method === 'dct' && <article><span>{t('catalog:compression.lossy.retainedCoefficients')}</span><strong>{activeStep.retainedCoefficients} / 64</strong></article>}
                  </div>
                </section>
              )}
            </>
          )}

          <section className="compression-panel lossy-playback" aria-labelledby="lossy-steps-title">
            <div className="compression-panel-heading">
              <div>
                <span className="compression-eyebrow">{t('catalog:compression.lossy.walkthrough')}</span>
                <h3 id="lossy-steps-title">{t('catalog:compression.lossy.stepsTitle')}</h3>
              </div>
              {activeStep && <span className="lz77-count-badge">{t('catalog:compression.lossy.stepCount', { current: stepIndex + 1, total: steps.length })}</span>}
            </div>
            <div className="lz77-speed-picker" role="group" aria-label={t('catalog:compression.lossy.speed')}>
              <span>{t('catalog:compression.lossy.speed')}</span>
              <div>
                {SPEEDS.map((option) => (
                  <button key={option} type="button" className={speed === option ? 'is-active' : ''} aria-pressed={speed === option} onClick={() => setSpeed(option)}>
                    {t(`catalog:compression.lossy.${option}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="lz77-playback-controls">
              <button type="button" aria-label={t('catalog:compression.lossy.restart')} title={t('catalog:compression.lossy.restart')} onClick={() => moveTo(0)} disabled={!steps.length}><RotateCcw size={15} /></button>
              <button type="button" aria-label={t('catalog:compression.lossy.previous')} title={t('catalog:compression.lossy.previous')} onClick={() => moveTo(stepIndex - 1)} disabled={!steps.length || stepIndex <= 0}><SkipBack size={15} /></button>
              <button type="button" className="is-primary" aria-label={t(isPlaying ? 'catalog:compression.lossy.pause' : 'catalog:compression.lossy.play')} title={t(isPlaying ? 'catalog:compression.lossy.pause' : 'catalog:compression.lossy.play')} onClick={togglePlay} disabled={!steps.length}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" aria-label={t('catalog:compression.lossy.next')} title={t('catalog:compression.lossy.next')} onClick={() => moveTo(stepIndex + 1)} disabled={!steps.length || stepIndex >= steps.length - 1}><SkipForward size={15} /></button>
            </div>
            <div className="lz77-step-progress" role="progressbar" aria-label={t('catalog:compression.lossy.stepsTitle')} aria-valuemin={0} aria-valuemax={Math.max(steps.length, 1)} aria-valuenow={Math.max(stepIndex + 1, 0)}>
              <span style={{ width: steps.length ? `${((stepIndex + 1) / steps.length) * 100}%` : '0%' }} />
            </div>
            <div className="lz77-current-explanation" aria-live="polite">
              {activeStep ? t(activeStep.msgKey, activeStep) : t('catalog:compression.lossy.emptySteps')}
            </div>
          </section>
        </section>
      </section>
    </div>
  );
}
