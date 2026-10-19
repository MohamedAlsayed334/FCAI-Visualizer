import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAlgorithmsByCategory, getAlgorithm } from '../application/AlgorithmRegistry';
import { CanvasRenderer } from '../infrastructure/canvas/CanvasRenderer';
import { GraphRenderer } from '../infrastructure/canvas/GraphRenderer';
import { DataStructureCanvasRenderer } from '../infrastructure/canvas/DataStructureCanvasRenderer';
import { TreeCanvasRenderer } from '../infrastructure/canvas/TreeCanvasRenderer';
import CodePanel from '../components/shared/CodePanel';
import { useT } from '../hooks/useT';
import { useLocale } from '../hooks/useLocale';
import { stepText } from '../i18n/stepText';
import { formatNumber } from '../i18n/format';
import '../styles/Compare.css';

const groups = {
  sorting: { category: 'sorting', defaults: ['bubble', 'quick'] },
  searching: { category: 'searching', defaults: ['linear-search', 'binary-search'] },
  'graph-traversal': {
    category: 'graphs', ids: ['bfs', 'dfs'],
    defaults: ['bfs', 'dfs'], input: 'graph',
  },
  'graph-mst': {
    category: 'graphs', ids: ['prim', 'kruskal'],
    defaults: ['prim', 'kruskal'], input: 'graph',
  },
  'data-structures': {
    category: 'data-structures', ids: ['stack-ds', 'queue-ds'],
    defaults: ['stack-ds', 'queue-ds'], input: 'operations',
  },
  trees: {
    category: 'trees', ids: ['bst', 'avl'],
    defaults: ['bst', 'avl'], input: 'tree',
  },
};

// Preset row names resolve through the compare namespace at render time.
const PRESET_LABEL_KEYS = {
  Random: 'presets.random',
  Sorted: 'presets.sorted',
  Reversed: 'presets.reversed',
  Duplicates: 'presets.duplicates',
  Zigzag: 'presets.zigzag',
  Interleaved: 'presets.interleaved',
  'Remove all': 'presets.removeAll',
  'LIFO vs FIFO': 'presets.lifoFifo',
  Weighted: 'presets.weighted',
  Cycle: 'presets.cycle',
  Grid: 'presets.grid',
};

const initialInput = '30, 20, 40, 10, 25, 35, 50';
const initialGraph = 'A-B:4, A-C:2, B-D:5, C-D:8, C-E:10, D-E:2';
const initialOperations = 'insert 10, insert 20, insert 30, delete, insert 40, delete, insert 50';
const initialTree = '10, 20, 30, 40, 50, 60, 70';
const treePresets = {
  Sorted: initialTree,
  Zigzag: '50, 10, 60, 20, 70, 30, 80',
  Duplicates: '30, 30, 20, 20, 40, 40, 10',
};
const operationPresets = {
  'LIFO vs FIFO': initialOperations,
  'Remove all': 'insert 5, insert 10, insert 15, delete, delete, delete',
  Interleaved: 'insert 1, insert 2, delete, insert 3, delete, insert 4, delete',
};
const graphPresets = {
  Weighted: initialGraph,
  Cycle: 'A-B:1, B-C:2, C-D:3, D-A:4, A-C:5',
  Grid: 'A-B:2, A-C:3, B-D:1, C-D:4, C-E:6, D-E:2, D-F:5, E-F:1',
};

// Parse/validation errors carry translation keys; the catch site resolves them
// so messages follow the active locale.
function i18nError(key, params = null) {
  const error = new Error(key);
  error.i18nKey = key;
  error.i18nParams = params;
  return error;
}

const graphItem = /^([A-Za-z0-9]+)\s*-\s*([A-Za-z0-9]+)(?:\s*:\s*(\d+(?:\.\d+)?))?$/;

function graphNodes(text) {
  const nodes = new Set();
  for (const item of text.split(/[,\n]+/).map(value => value.trim()).filter(Boolean)) {
    const match = item.match(graphItem);
    if (match) { nodes.add(match[1]); nodes.add(match[2]); }
  }
  return [...nodes];
}

function parseGraph(text, start) {
  const items = text.split(/[,\n]+/).map(value => value.trim()).filter(Boolean);
  if (!items.length) throw i18nError('errors.graphEmpty');
  const nodes = new Set();
  const edges = [];
  const seen = new Set();
  for (const item of items) {
    const match = item.match(graphItem);
    if (!match) throw i18nError('errors.graphItem', { item });
    const [, from, to, rawWeight] = match;
    if (from === to) throw i18nError('errors.selfLoop', { edge: `${from}-${to}` });
    const weight = rawWeight === undefined ? 1 : Number(rawWeight);
    if (weight <= 0 || weight > 999) throw i18nError('errors.weightRange');
    const key = [from, to].sort().join('-');
    if (seen.has(key)) throw i18nError('errors.duplicateEdge', { edge: `${from}-${to}` });
    seen.add(key);
    nodes.add(from);
    nodes.add(to);
    edges.push([from, to, weight]);
  }
  if (nodes.size > 12) throw i18nError('errors.tooManyNodes');
  if (edges.length > 24) throw i18nError('errors.tooManyEdges');
  const nodeList = [...nodes];
  return {
    nodes: nodeList,
    edges,
    start: nodeList.includes(start) ? start : nodeList[0],
  };
}

function graphSummary(graph) {
  return `${graph.nodes.length} nodes · ${graph.edges.length} edges · start ${graph.start}`;
}

const operationItem = /^(insert|push|enqueue|delete|pop|dequeue)\b\s*(.*)$/i;

function parseOperations(text) {
  const items = text.split(/[,\n;]+/).map(value => value.trim()).filter(Boolean);
  if (!items.length) throw i18nError('errors.opEmpty');
  const operations = [];
  for (const item of items) {
    const match = item.match(operationItem);
    if (!match) throw i18nError('errors.opItem', { item });
    const action = match[1].toLowerCase();
    const rawValue = match[2].trim();
    if (['insert', 'push', 'enqueue'].includes(action)) {
      if (!/^-?\d+$/.test(rawValue)) throw i18nError('errors.opValue', { item });
      const value = Number(rawValue);
      if (value < -999 || value > 999) throw i18nError('errors.opRange');
      operations.push({ op: 'insert', value });
    } else {
      if (rawValue) throw i18nError('errors.opNoValue', { item });
      operations.push({ op: 'delete' });
    }
  }
  if (operations.length > 24) throw i18nError('errors.tooManyOps');
  if (!operations.some(operation => operation.op === 'insert')) {
    throw i18nError('errors.needsInsert');
  }
  return operations;
}

function operationSummary(operations) {
  return operations.map(operation => operation.value === undefined
    ? operation.op : `${operation.op} ${operation.value}`).join(' → ');
}

function randomDistinctValues(count) {
  const values = [];
  while (values.length < count) {
    const value = Math.floor(Math.random() * 90) + 10;
    if (!values.includes(value)) values.push(value);
  }
  return values.join(', ');
}

function ComparisonPanel({ run, tick, side }) {
  const t = useT('compare');
  const { locale } = useLocale();
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const index = Math.min(tick - 1, run.steps.length - 1);
  const step = run.steps[index];
  const message = step ? (step.msgKey ? stepText(step) : (step.msg || step.label)) : undefined;
  const done = tick >= run.steps.length;
  const category = run.algorithm.category;
  const isGraph = category === 'graphs';
  const isDataStructure = category === 'data-structures';
  const isTrees = category === 'trees';
  const algorithmName = t(`algorithms:${run.algorithm.id}.name`, { defaultValue: run.algorithm.name });

  useEffect(() => {
    const renderer = isGraph
      ? new GraphRenderer(canvasRef.current)
      : isDataStructure
        ? new DataStructureCanvasRenderer(canvasRef.current)
        : isTrees
          ? new TreeCanvasRenderer(canvasRef.current)
          : new CanvasRenderer(canvasRef.current, category);
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [category, isGraph, isDataStructure, isTrees]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    const draw = () => {
      renderer.resize?.();
      const preview = isTrees
        ? [{ tree: null, msg: t('panel.previewPlay') }]
        : isDataStructure
          ? [run.steps[0]]
          : Array.isArray(run.input) ? [{ arr: run.input }] : [{ graph: run.input }];
      renderer.draw(index < 0 ? preview : run.steps, index < 0 ? 0 : index,
        index < 0 ? 'custom' : run.algorithm.id, run.input, run.target);
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(canvas.parentElement);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { resize.disconnect(); theme.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preserve legacy redraw triggers
  }, [run, index, isDataStructure, isTrees]);

  const complexity = run.algorithm.complexity;
  const snippet = run.algorithm.codeSnippets?.js;
  const graph = step?.graph;
  const result = category === 'searching'
    ? step?.found === true
      ? t('result.searchFound', {
          value: formatNumber(run.target, locale),
          index: formatNumber(step.foundIdx, locale),
        })
      : t('result.searchNotFound', { value: formatNumber(run.target, locale) })
    : isGraph
      ? graph?.mstEdges?.length
        ? t('result.mstEdges', {
            edges: graph.mstEdges
              .map(edge => `${edge.from}—${edge.to} (${formatNumber(edge.weight, locale)})`)
              .join(', '),
          })
        : graph?.order?.length
          ? t('result.visitOrder', { order: graph.order.join(' → ') })
          : (step?.msgKey ? stepText(step) : (step?.msg || ''))
      : isDataStructure
        ? t('result.remainingValues', { values: step?.data?.values?.join(', ') ?? '' })
        : isTrees
          ? t('result.treeSummary', {
              height: step?.height ?? '—',
              count: step?.nodeCount ?? 0,
              nodeWord: t('result.treeNodes', { count: step?.nodeCount ?? 0 }),
              order: step?.inOrder?.join(' → ') || '',
            })
          : (step?.outputArr ?? step?.arr)?.join(', ') || t('result.finalOutput');
  const metrics = isGraph
    ? [
        { labelKey: 'panel.metrics.time', value: complexity?.access || complexity?.avg || '—' },
        { labelKey: 'panel.metrics.space', value: complexity?.space || '—' },
      ]
    : isDataStructure
      ? [
          { labelKey: 'panel.metrics.insert', value: complexity?.insert || '—' },
          { labelKey: 'panel.metrics.delete', value: complexity?.delete || '—' },
          { labelKey: 'panel.metrics.space', value: complexity?.space || '—' },
        ]
      : isTrees
        ? [
            { labelKey: 'panel.metrics.insert', value: complexity?.insert || '—' },
            { labelKey: 'panel.metrics.search', value: complexity?.search || '—' },
            { labelKey: 'panel.metrics.space', value: complexity?.space || '—' },
          ]
        : [
        { labelKey: 'panel.metrics.avgTime', value: complexity?.avg || '—' },
        { labelKey: 'panel.metrics.worstTime', value: complexity?.worst || '—' },
        { labelKey: 'panel.metrics.extraSpace', value: complexity?.space || '—' },
      ];

  return (
    <section className="cmp-panel" aria-label={t('panel.aria.panel', { side, name: algorithmName })}>
      <header className="cmp-panel-heading">
        <div><span className="cmp-eyebrow">{t('setup.algorithmSide', { side })}</span><h2>{algorithmName}</h2></div>
        <span className={`cmp-badge${done ? ' cmp-done' : ''}`}>
          {done ? t('panel.badge.finished') : tick === 0 ? t('panel.badge.ready') : t('panel.badge.inProgress')}
        </span>
      </header>
      <div className="cmp-canvas-wrap">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('panel.aria.canvas', { name: algorithmName, message: message || t('panel.aria.original') })}
        />
      </div>
      <div className="cmp-panel-body">
        <div className="cmp-progress-label">
          <span>{t('panel.recordedSteps')}</span>
          <strong>{formatNumber(Math.min(tick, run.steps.length), locale)} / {formatNumber(run.steps.length, locale)}</strong>
        </div>
        <progress max={run.steps.length} value={Math.min(tick, run.steps.length)} aria-label={t('panel.aria.progress', { name: algorithmName })} />
        <p className="cmp-narration" aria-live="polite">{message || t('panel.narrationStart')}</p>
        {done && <p className="cmp-result">{t('panel.resultLabel')}{result}</p>}
        <dl className="cmp-complexity">
          {metrics.map(metric => <div key={metric.labelKey}><dt>{t(metric.labelKey)}</dt><dd>{metric.value}</dd></div>)}
        </dl>
        <p className="cmp-note">
          {complexity?.note
            ? t(`algorithms:${run.algorithm.id}.complexityNote`, { defaultValue: complexity.note })
            : ''}
        </p>
        {snippet && <details><summary>{t('panel.viewCode')}</summary>
          <CodePanel codeSnippet={Array.isArray(snippet) ? snippet.join('\n') : snippet} activeLine={step?.codeLines?.js ?? step?.codeLine ?? -1} />
        </details>}
      </div>
    </section>
  );
}

export default function Compare() {
  const t = useT('compare');
  const { locale } = useLocale();
  const [groupKey, setGroupKey] = useState('sorting');
  const group = groups[groupKey];
  const [algoA, setAlgoA] = useState(group.defaults[0]);
  const [algoB, setAlgoB] = useState(group.defaults[1]);
  const [input, setInput] = useState(initialInput);
  const [target, setTarget] = useState('35');
  const [graphInput, setGraphInput] = useState(initialGraph);
  const [graphStart, setGraphStart] = useState('A');
  const [operations, setOperations] = useState(initialOperations);
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [error, setError] = useState('');
  const total = session ? Math.max(...session.map(run => run.steps.length)) : 0;
  const isPlaying = playing && tick < total;
  const algorithms = getAlgorithmsByCategory(group.category)
    .filter(algorithm => !group.ids || group.ids.includes(algorithm.id));
  const isSearching = group.category === 'searching';
  const isGraph = group.input === 'graph';
  const isOperations = group.input === 'operations';
  const isTrees = group.input === 'tree';
  const availableNodes = isGraph ? graphNodes(graphInput) : [];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setTick(current => Math.min(current + 1, total)), 1000 / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, tick, total, speed]);

  function invalidate() {
    setPlaying(false);
    setSession(null);
    setTick(0);
    setError('');
  }

  function changeGroup(next) {
    invalidate();
    setGroupKey(next);
    setAlgoA(groups[next].defaults[0]);
    setAlgoB(groups[next].defaults[1]);
    if (groups[next].input === 'graph') {
      setGraphInput(initialGraph);
      setGraphStart('A');
    } else if (groups[next].input === 'operations') {
      setOperations(initialOperations);
    } else if (groups[next].input === 'tree') {
      setInput(initialTree);
    } else if (next === 'searching') {
      setInput(initialInput);
      setTarget('35');
    } else {
      setInput(initialInput);
    }
  }

  function prepare(event) {
    event.preventDefault();
    invalidate();
    try {
      if (algoA === algoB) throw i18nError('errors.sameAlgo');
      if (isGraph) {
        const graph = parseGraph(graphInput, graphStart);
        const runs = [algoA, algoB].map(id => {
          const algorithm = getAlgorithm(id);
          const inputCopy = {
            nodes: [...graph.nodes],
            edges: graph.edges.map(edge => [...edge]),
            start: graph.start,
          };
          const steps = algorithm.generateSteps(inputCopy);
          if (!steps.length) throw i18nError('errors.noSteps', { name: algorithm.name });
          return { algorithm, steps, input: inputCopy, target: null };
        });
        setSession(runs);
        return;
      }
      if (isOperations) {
        const sharedOperations = parseOperations(operations);
        const runs = [algoA, algoB].map(id => {
          const algorithm = getAlgorithm(id);
          const steps = algorithm.generateSteps(sharedOperations.map(operation => ({ ...operation })));
          if (!steps.length) throw i18nError('errors.noSteps', { name: algorithm.name });
          return { algorithm, steps, input: sharedOperations.map(operation => ({ ...operation })), target: null };
        });
        setSession(runs);
        return;
      }

      if (isTrees) {
        const parts = input.split(',').map(value => value.trim());
        if (parts.some(value => !/^\d+$/.test(value)) || parts.length === 0 || parts.length > 10) {
          throw i18nError('errors.treeRange');
        }
        const values = parts.map(Number);
        if (values.some(value => value > 99)) throw i18nError('errors.treeValues');
        const runs = [algoA, algoB].map(id => {
          const algorithm = getAlgorithm(id);
          const steps = algorithm.generateSteps([...values]);
          if (!steps.length) throw i18nError('errors.noSteps', { name: algorithm.name });
          return { algorithm, steps, input: [...values], target: null };
        });
        setSession(runs);
        return;
      }

      const parts = input.split(',').map(value => value.trim());
      if (parts.some(value => !/^\d+$/.test(value)) || parts.length > 32) {
        throw i18nError('errors.arrayRange');
      }
      const values = parts.map(Number);
      if (values.some(value => value > 99)) throw i18nError('errors.arrayValues');
      if (isSearching && (!/^\d+$/.test(target.trim()) || Number(target) > 99)) {
        throw i18nError('errors.target');
      }
      const sharedInput = isSearching ? [...values].sort((a, b) => a - b) : values;
      const runs = [algoA, algoB].map(id => {
        const algorithm = getAlgorithm(id);
        const steps = algorithm.generateSteps(isSearching
          ? { arr: [...sharedInput], target: Number(target) } : [...sharedInput]);
        if (!steps.length) throw i18nError('errors.noSteps', { name: algorithm.name });
        return { algorithm, steps, input: [...sharedInput], target: isSearching ? Number(target) : null };
      });
      setSession(runs);
    } catch (problem) {
      setError(problem.i18nKey
        ? t(problem.i18nKey, problem.i18nParams ?? {})
        : (problem.message || t('errors.fallback')));
    }
  }

  function preset(kind) {
    invalidate();
    if (isGraph) {
      setGraphInput(graphPresets[kind]);
      return;
    }
    if (isOperations) {
      setOperations(operationPresets[kind]);
      return;
    }
    if (isTrees) {
      if (kind === 'Random') {
        setInput(randomDistinctValues(7));
      } else {
        setInput(treePresets[kind]);
      }
      return;
    }
    const values = kind === 'Duplicates'
      ? [30, 10, 30, 20, 10, 20, 30, 10]
      : kind === 'Random'
        ? Array.from({ length: 10 }, () => Math.floor(Math.random() * 90) + 10)
        : Array.from({ length: 10 }, (_, i) => (kind === 'Reversed' ? 10 - i : i + 1) * 8);
    setInput(values.join(', '));
  }

  function seek(next) {
    setPlaying(false);
    setTick(Math.max(0, Math.min(total, next)));
  }

  const presets = isGraph
    ? Object.keys(graphPresets)
    : isOperations ? Object.keys(operationPresets)
      : isTrees ? [...Object.keys(treePresets), 'Random']
        : ['Random', 'Sorted', 'Reversed', 'Duplicates'];

  return (
    <div className="page cmp-page">
      <header className="page__header">
        <span className="cmp-eyebrow">{t('page.eyebrow')}</span>
        <h1>{t('page.title')}</h1>
        <p className="page__subtitle">{t('page.subtitle')}</p>
      </header>

      <form className="cmp-setup" onSubmit={prepare}>
        <label className="cmp-group">{t('setup.forLabel')}
          <select value={groupKey} onChange={event => changeGroup(event.target.value)}>
            {Object.entries(groups).map(([key, value]) => <option key={key} value={key}>{t(`groups.${key}`, { defaultValue: value.label || key })}</option>)}
          </select>
        </label>
        <div className="cmp-selectors">
          {[['A', algoA, setAlgoA], ['B', algoB, setAlgoB]].map(([side, value, setter]) => (
            <label key={side}>{t('setup.algorithmSide', { side })}
              <select value={value} onChange={event => { invalidate(); setter(event.target.value); }}>
                {algorithms.map(algorithm => <option key={algorithm.id} value={algorithm.id}>{t(`algorithms:${algorithm.id}.name`, { defaultValue: algorithm.name })}</option>)}
              </select>
            </label>
          ))}
        </div>

        {isGraph ? (
          <>
            <label htmlFor="cmp-graph-input">{t('setup.graphLabel')}</label>
            <div className="cmp-input-row">
              <input id="cmp-graph-input" value={graphInput} onChange={event => { invalidate(); setGraphInput(event.target.value); }} aria-describedby="cmp-graph-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">{t('setup.prepare')}</button>
            </div>
            <div className="cmp-graph-settings">
              <label htmlFor="cmp-graph-start">{t('setup.startNode')}
                <select id="cmp-graph-start" value={graphStart} onChange={event => { invalidate(); setGraphStart(event.target.value); }}>
                  {availableNodes.length === 0 && <option value="">{t('setup.addEdgesFirst')}</option>}
                  {availableNodes.map(node => <option key={node} value={node}>{node}</option>)}
                </select>
              </label>
              <p id="cmp-graph-help" className="cmp-note">{t('setup.graphHelp')}</p>
            </div>
          </>
        ) : isOperations ? (
          <>
            <label htmlFor="cmp-operations">{t('setup.operationsLabel')}</label>
            <div className="cmp-input-row">
              <input id="cmp-operations" value={operations} onChange={event => { invalidate(); setOperations(event.target.value); }} aria-describedby="cmp-operations-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">{t('setup.prepare')}</button>
            </div>
            <p id="cmp-operations-help" className="cmp-note">{t('setup.operationsHelp')}</p>
          </>
        ) : (
          <>
            <label htmlFor="cmp-input">{isTrees ? t('setup.treeLabel') : t('setup.arrayLabel')}</label>
            <div className="cmp-input-row">
              <input id="cmp-input" value={input} onChange={event => { invalidate(); setInput(event.target.value); }} aria-describedby="cmp-input-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">{t('setup.prepare')}</button>
            </div>
            <p id="cmp-input-help" className="cmp-note">
              {isTrees ? t('setup.treeHelp') : t('setup.arrayHelp')}
            </p>
            {isSearching && <div className="cmp-search-settings">
              <label htmlFor="cmp-target">{t('setup.targetLabel')}
                <input id="cmp-target" inputMode="numeric" value={target} onChange={event => { invalidate(); setTarget(event.target.value); }} aria-describedby="cmp-search-help" />
              </label>
              <p id="cmp-search-help" className="cmp-note">{t('setup.targetHelp')}</p>
            </div>}
          </>
        )}

        <div className="cmp-presets">
          <span>{t('setup.tryInput')}</span>
          {presets.map(kind => (
            <button key={kind} type="button" onClick={() => preset(kind)}>
              {t(PRESET_LABEL_KEYS[kind] ?? kind, { defaultValue: kind })}
            </button>
          ))}
        </div>
        {error && <p className="cmp-error" role="alert">{error}</p>}
      </form>

      <section className="cmp-playback" aria-label={t('playback.aria')}>
        <div className="cmp-toolbar">
          <button disabled={!session || tick === 0} onClick={() => seek(0)}><RotateCcw size={16} /> {t('common:actions.reset')}</button>
          <button disabled={!session || tick === 0} onClick={() => seek(tick - 1)}><ChevronLeft size={16} /> {t('playback.back')}</button>
          <button className="cmp-primary" disabled={!session} onClick={() => {
            if (tick === total) setTick(0);
            setPlaying(!isPlaying);
          }}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? t('common:actions.pause') : session && tick === total ? t('playback.replay') : t('common:actions.play')}</button>
          <button disabled={!session || tick === total} onClick={() => seek(tick + 1)}>{t('playback.next')} <ChevronRight size={16} /></button>
          <label className="cmp-speed">{t('playback.speed')}
            <select value={speed} onChange={event => setSpeed(Number(event.target.value))}>
              {[1, 2, 3, 5, 10].map(value => <option key={value} value={value}>{t('playback.stepsPerSecond', { value: formatNumber(value, locale) })}</option>)}
            </select>
          </label>
        </div>
        <label className="cmp-timeline">{t('playback.timeline')} <span>{formatNumber(tick, locale)} / {formatNumber(total, locale)}</span>
          <input type="range" min="0" max={total || 1} value={tick} disabled={!session} onChange={event => seek(Number(event.target.value))} />
        </label>
        <p className="cmp-note">{t('playback.disclaimer')}</p>
      </section>

      {session && isSearching && <div className="cmp-shared-input" role="status"><strong>{t('status.searchingFor', { target: formatNumber(session[0].target, locale) })}</strong><p>{t('status.sortedArray', { values: session[0].input.join(', ') })}</p></div>}
      {session && isGraph && <div className="cmp-shared-input" role="status"><strong>{t('status.graph')}</strong><p>{graphSummary(session[0].input)}</p><p>{t('status.edges', { edges: session[0].input.edges.map(([from, to, weight]) => `${from}—${to} (${formatNumber(weight, locale)})`).join(', ') })}</p></div>}
      {session && isOperations && <div className="cmp-shared-input" role="status"><strong>{t('status.operations')}</strong><p>{operationSummary(session[0].input)}</p></div>}
      {session && isTrees && <div className="cmp-shared-input" role="status"><strong>{t('status.insertionOrder')}</strong><p>{session[0].input.join(' → ')}</p></div>}
      {session ? <div className="cmp-panels">{session.map((run, index) => <ComparisonPanel key={`${groupKey}-${index}`} run={run} tick={tick} side={index === 0 ? 'A' : 'B'} />)}</div>
        : <div className="cmp-empty"><h2>{t('empty.title')}</h2><p>{t('empty.body')}</p></div>}
    </div>
  );
}
