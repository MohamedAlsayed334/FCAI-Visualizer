import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getAlgorithm, getAlgorithmsByCategory } from '../application/AlgorithmRegistry';
import { SearchingVisualizer } from '../algorithms/searching/searchingVisualizer';
import { useLang } from '../hooks/useLang';
import { useT } from '../hooks/useT';
import { useLocale } from '../hooks/useLocale';
import { stepText } from '../i18n/stepText';
import { hasTranslation } from '../i18n/exists';
import { formatNumber } from '../i18n/format';

import ControlPanel   from '../components/sorting/ControlPanel';
import CodePanel      from '../components/sorting/CodePanel';
import ComplexityPanel from '../components/sorting/ComplexityPanel';

import '../styles/Searching.css';

// ── Only the searching subset ──────────────────────────────────────────────
const SEARCH_KEYS = ['linear-search', 'binary-search', 'jump-search'];
const searchAlgorithms = Object.fromEntries(
  getAlgorithmsByCategory('searching')
    .filter(a => SEARCH_KEYS.includes(a.id))
    .map(a => [a.id, a])
);

// Searching requires a sorted array for binary/jump
const NEEDS_SORTED = ['binary-search', 'jump-search'];

// ── Helpers ────────────────────────────────────────────────────────────────
function randomArray(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
}

function sortedCopy(arr) {
  return [...arr].sort((a, b) => a - b);
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Searching() {
  const { algo: urlAlgo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);

  const initialAlgo = urlAlgo && searchAlgorithms[urlAlgo] ? urlAlgo : 'linear-search';

  const [algo,      setAlgo]      = useState(initialAlgo);
  const [arraySize, setArraySize] = useState(16);
  const [speed,     setSpeed]     = useState(5);
  const [array,     setArray]     = useState([]);
  const [steps,     setSteps]     = useState([]);
  const [stepIdx,   setStepIdx]   = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Target value to search for
  const [target, setTarget] = useState('');

  // Custom input
  const [customInput, setCustomInput] = useState('');

  // Language persistence
  const [lang, setLang] = useLang('js');
  const t = useT();
  const { locale } = useLocale();

  // ── Canvas init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (canvasRef.current) {
      SearchingVisualizer.init(canvasRef.current);
    }
    return () => SearchingVisualizer.stopAnimation();
  }, []);

  // ── Array generation ──────────────────────────────────────────────────────
  const generateArray = (size, currentAlgo) => {
    const raw = randomArray(size);
    const arr = NEEDS_SORTED.includes(currentAlgo) ? sortedCopy(raw) : raw;
    setArray(arr);
    setCustomInput('');
    // Pick a random target that EXISTS in the array (50% chance)
    const pickExisting = Math.random() > 0.5;
    const newTarget = pickExisting
      ? arr[Math.floor(Math.random() * arr.length)]
      : Math.floor(Math.random() * 90) + 10;
    setTarget(String(newTarget));
    return { arr, newTarget };
  };

  const applyCustomInput = (nums) => {
    const arr = NEEDS_SORTED.includes(algo) ? sortedCopy(nums) : nums;
    setArray(arr);
    resetPlayback();
  };

  /* eslint-disable react-hooks/set-state-in-effect -- playback engine pushes derived state into React by design */
  // When algo changes, re-sort or unsort the current array
  useEffect(() => {
    if (array.length === 0) return;
    const arr = NEEDS_SORTED.includes(algo) ? sortedCopy(array) : array;
    setArray(arr);
  }, [algo]);

  // Initial generate
  useEffect(() => { generateArray(arraySize, algo); }, [arraySize]);

  // ── Step generation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (array.length === 0) return;
    const t = parseInt(target, 10);
    const instance = getAlgorithm(algo);

    const newSteps = isNaN(t)
      ? instance.generateSteps({ arr: array, target: array[0] })
      : instance.generateSteps({ arr: array, target: t });

    setSteps(newSteps);
    setStepIdx(-1);
    SearchingVisualizer.setState({ arr: array, steps: newSteps, algo, speed, target: isNaN(t) ? array[0] : t });
    SearchingVisualizer.drawStep(-1);
  }, [array, algo, target, speed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Controls ──────────────────────────────────────────────────────────────
  const resetPlayback = () => {
    setIsPlaying(false);
    SearchingVisualizer.stopAnimation();
    setStepIdx(-1);
    SearchingVisualizer.drawStep(-1);
  };

  /* eslint-disable react-hooks/set-state-in-effect -- URL-driven playback state sync */
  // ── Deep-link sync (after the helpers above are declared) ─────────────
  useEffect(() => {
    if (urlAlgo && searchAlgorithms[urlAlgo] && urlAlgo !== algo) {
      setAlgo(urlAlgo);
      resetPlayback();
    }
  }, [urlAlgo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stepForward = () => {
    if (stepIdx < steps.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      SearchingVisualizer.animateStep(next, null);
    }
  };

  const stepBack = () => {
    if (stepIdx >= 0) {
      const prev = stepIdx - 1;
      setStepIdx(prev);
      SearchingVisualizer.drawStep(prev);
    }
  };

  // ── Play loop ─────────────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect -- player loop ends itself when the trace is exhausted */
  useEffect(() => {
    if (isPlaying) {
      if (stepIdx < steps.length - 1) {
        SearchingVisualizer.animateStep(stepIdx + 1, () => {
          setStepIdx(prev => prev + 1);
        });
      } else {
        setIsPlaying(false);
      }
    }
    return () => SearchingVisualizer.stopAnimation();
  }, [isPlaying, stepIdx]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeStep      = stepIdx >= 0 && steps[stepIdx] ? steps[stepIdx] : null;
  const activeLine      = activeStep
    ? (activeStep.codeLines?.[lang] ?? activeStep.codeLine ?? -1)
    : -1;
  const currentAlgoData = searchAlgorithms[algo] ?? {};
  const Smetadata = currentAlgoData;
  const ScodeByLang = Smetadata?.codeSnippets
    ? Object.fromEntries(Object.entries(Smetadata.codeSnippets).map(([lang, lines]) => [lang, lines.join('\n')]))
    : null;

  // Result badge derived from the last reached step
  const resultFound    = activeStep?.found;
  const resultIdx      = activeStep?.foundIdx ?? -1;

  // ── Target-value control (injected into ControlPanel extraControls) ──────
  const targetControl = (
    <div className="search-target-group">
      <span className="search-target-label">{t('searching:target')}</span>
      <input
        id="search-target"
        type="number"
        className="search-target-input"
        value={target}
        onChange={(e) => { setTarget(e.target.value); resetPlayback(); }}
        placeholder="?"
        min="1"
        max="99"
      />
      {resultFound === true && (
        <span className="search-result-badge found">✅ {formatNumber(resultIdx, locale)}</span>
      )}
      {resultFound === false && (
        <span className="search-result-badge not-found">{t('searching:result.notFound')}</span>
      )}
    </div>
  );

  // ── Colour legend entries ─────────────────────────────────────────────────
  const LEGEND = [
    { color: '#2a2a42', labelKey: 'searching:legend.unseen' },
    { color: '#44445a', labelKey: 'searching:legend.scanned' },
    { color: '#f7c59f', labelKey: 'searching:legend.current' },
    { color: '#43d9ad', labelKey: 'searching:legend.found' },
    { color: '#ff6584', labelKey: 'searching:legend.notFound' },
  ];
  const POINTER_LEGEND =
    algo === 'binary-search'
      ? [
          { color: '#6c63ff', label: 'lo'  },
          { color: '#ff6584', label: 'hi'  },
          { color: '#f7c59f', label: 'mid' },
        ]
      : algo === 'jump-search'
      ? [
          { color: '#6c63ff', label: 'block start' },
          { color: '#ff6584', label: 'block end'   },
          { color: '#ffd166', label: 'scan ptr'    },
        ]
      : [];

  return (
    <div className="searching-page">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="searching-header">
        <h2>{t(`algorithms:${algo}.name`, { defaultValue: Smetadata?.name || t('searching:title') })}</h2>
        {activeStep && (
          <div className="step-msg">{stepText(activeStep)}</div>
        )}
        <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          {activeStep ? stepText(activeStep) : ''}
        </div>
      </div>

      {/* ── Control Panel ──────────────────────────────────────────────── */}
      <ControlPanel
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onReset={resetPlayback}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onGenerateRandom={() => generateArray(arraySize, algo)}
        algorithm={algo}
        setAlgorithm={(a) => {
          setAlgo(a);
          // Keep the algorithm switch inside the current (course or legacy) route.
          const base = location.pathname.startsWith('/courses/data-structure/searching')
            ? '/courses/data-structure/searching'
            : '/searching';
          navigate(`${base}/${a}`);
          resetPlayback();
        }}
        arraySize={arraySize}
        setArraySize={setArraySize}
        speed={speed}
        setSpeed={setSpeed}
        algorithms={searchAlgorithms}
        customInput={customInput}
        setCustomInput={setCustomInput}
        onApplyCustom={applyCustomInput}
        extraControls={targetControl}
      />

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="searching-main">

        {/* Canvas + legend */}
        <div className="searching-viz-container">
          <div className="searching-canvas-wrapper">
            <canvas ref={canvasRef} role="img" aria-label={t('searching:canvasAria')} />
          </div>

          {/* Colour legend */}
          <div className="pointer-legend">
            {LEGEND.map(({ color, labelKey }) => (
              <div key={color} className="pointer-legend-item">
                <div className="legend-dot" style={{ background: color }} />
                <span>{t(labelKey)}</span>
              </div>
            ))}
            {POINTER_LEGEND.map(({ color, label }) => (
              <div key={label} className="pointer-legend-item">
                <div className="legend-dot" style={{ background: color, borderRadius: '50%' }} />
                <span>▲ {label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="searching-side-panel">
          <ComplexityPanel complexity={Smetadata?.complexity} algoId={algo} />

          <div className="panel-card">
            <h3>{t('panel.description')}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {((hasTranslation(`algorithms:${algo}.explanation.intro`)
                ? t(`algorithms:${algo}.explanation.intro`)
                : '')
              )
                || (Smetadata?.explanation?.body?.replace(/<[^>]*>/g, '').substring(0, 200) || '')
                || t('searching:descriptionFallback', { name: t(`algorithms:${algo}.name`, { defaultValue: algo }) })}
            </p>
          </div>

          <CodePanel
            codeByLang={ScodeByLang}
            codeSnippet={ScodeByLang?.[lang] || ''}
            activeLine={activeLine}
            lang={lang}
            setLang={setLang}
          />
        </div>
      </div>
    </div>
  );
}
