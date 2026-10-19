import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAlgorithmsByCategory, getAlgorithm } from '../application/AlgorithmRegistry';
import { CanvasRenderer } from '../infrastructure/canvas/CanvasRenderer';
import { GraphRenderer } from '../infrastructure/canvas/GraphRenderer';
import { DataStructureCanvasRenderer } from '../infrastructure/canvas/DataStructureCanvasRenderer';
import { TreeCanvasRenderer } from '../infrastructure/canvas/TreeCanvasRenderer';
import CodePanel from '../components/shared/CodePanel';
import '../styles/Compare.css';

const groups = {
  sorting: { label: 'Sorting', category: 'sorting', defaults: ['bubble', 'quick'] },
  searching: { label: 'Searching', category: 'searching', defaults: ['linear-search', 'binary-search'] },
  'graph-traversal': {
    label: 'Graph traversal', category: 'graphs', ids: ['bfs', 'dfs'],
    defaults: ['bfs', 'dfs'], input: 'graph',
  },
  'graph-mst': {
    label: 'Minimum spanning tree', category: 'graphs', ids: ['prim', 'kruskal'],
    defaults: ['prim', 'kruskal'], input: 'graph',
  },
  'data-structures': {
    label: 'Stack vs queue', category: 'data-structures', ids: ['stack-ds', 'queue-ds'],
    defaults: ['stack-ds', 'queue-ds'], input: 'operations',
  },
  trees: {
    label: 'BST vs AVL tree', category: 'trees', ids: ['bst', 'avl'],
    defaults: ['bst', 'avl'], input: 'tree',
  },
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
  if (!items.length) throw new Error('Add at least one edge, for example A-B:4.');
  const nodes = new Set();
  const edges = [];
  const seen = new Set();
  for (const item of items) {
    const match = item.match(graphItem);
    if (!match) throw new Error(`Could not read "${item}". Use A-B for an unweighted edge or A-B:4 for a weighted edge.`);
    const [, from, to, rawWeight] = match;
    if (from === to) throw new Error(`Edge ${from}-${to} is a self-loop. Use two different node names.`);
    const weight = rawWeight === undefined ? 1 : Number(rawWeight);
    if (weight <= 0 || weight > 999) throw new Error('Edge weights must be greater than 0 and no more than 999.');
    const key = [from, to].sort().join('-');
    if (seen.has(key)) throw new Error(`Edge ${from}-${to} is listed more than once.`);
    seen.add(key);
    nodes.add(from);
    nodes.add(to);
    edges.push([from, to, weight]);
  }
  if (nodes.size > 12) throw new Error('Use no more than 12 graph nodes so both visualizations stay readable.');
  if (edges.length > 24) throw new Error('Use no more than 24 edges so both visualizations stay readable.');
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
  if (!items.length) throw new Error('Add at least one operation, for example "insert 10, delete".');
  const operations = [];
  for (const item of items) {
    const match = item.match(operationItem);
    if (!match) throw new Error(`Could not read "${item}". Use "insert 10" or "delete".`);
    const action = match[1].toLowerCase();
    const rawValue = match[2].trim();
    if (['insert', 'push', 'enqueue'].includes(action)) {
      if (!/^-?\d+$/.test(rawValue)) throw new Error(`Operation "${item}" needs a whole-number value.`);
      const value = Number(rawValue);
      if (value < -999 || value > 999) throw new Error('Operation values must be between -999 and 999.');
      operations.push({ op: 'insert', value });
    } else {
      if (rawValue) throw new Error(`Operation "${item}" should not include a value.`);
      operations.push({ op: 'delete' });
    }
  }
  if (operations.length > 24) throw new Error('Use no more than 24 operations.');
  if (!operations.some(operation => operation.op === 'insert')) {
    throw new Error('Add at least one insert operation.');
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
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const index = Math.min(tick - 1, run.steps.length - 1);
  const step = run.steps[index];
  const message = step?.msg || step?.label;
  const done = tick >= run.steps.length;
  const category = run.algorithm.category;
  const isGraph = category === 'graphs';
  const isDataStructure = category === 'data-structures';
  const isTrees = category === 'trees';

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
        ? [{ tree: null, msg: 'Press Play to insert values in order.' }]
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
  }, [run, index, isDataStructure, isTrees]);

  const complexity = run.algorithm.complexity;
  const snippet = run.algorithm.codeSnippets?.js;
  const graph = step?.graph;
  const result = category === 'searching'
    ? step?.found === true
      ? `${run.target} found at index ${step.foundIdx} (zero-based).`
      : `${run.target} was not found.`
    : isGraph
      ? graph?.mstEdges?.length
        ? `MST edges: ${graph.mstEdges.map(edge => `${edge.from}—${edge.to} (${edge.weight})`).join(', ')}`
        : graph?.order?.length
          ? `Visit order: ${graph.order.join(' → ')}`
          : step?.msg
      : isDataStructure
        ? `Remaining values: [${step?.data?.values?.join(', ') ?? ''}]`
        : isTrees
          ? `Final height: ${step?.height} · ${step?.nodeCount} node${step?.nodeCount === 1 ? '' : 's'} · In-order: ${step?.inOrder?.join(' → ')}`
          : (step?.outputArr ?? step?.arr)?.join(', ') || 'See final visualization above.';
  const metrics = isGraph
    ? [
        { label: 'Time', value: complexity?.access || complexity?.avg || '—' },
        { label: 'Space', value: complexity?.space || '—' },
      ]
    : isDataStructure
      ? [
          { label: 'Insert', value: complexity?.insert || '—' },
          { label: 'Delete', value: complexity?.delete || '—' },
          { label: 'Space', value: complexity?.space || '—' },
        ]
      : isTrees
        ? [
            { label: 'Insert', value: complexity?.insert || '—' },
            { label: 'Search', value: complexity?.search || '—' },
            { label: 'Space', value: complexity?.space || '—' },
          ]
        : [
        { label: 'Average time', value: complexity?.avg || '—' },
        { label: 'Worst time', value: complexity?.worst || '—' },
        { label: 'Extra space', value: complexity?.space || '—' },
      ];

  return (
    <section className="cmp-panel" aria-label={`Algorithm ${side}: ${run.algorithm.name}`}>
      <header className="cmp-panel-heading">
        <div><span className="cmp-eyebrow">Algorithm {side}</span><h2>{run.algorithm.name}</h2></div>
        <span className={`cmp-badge${done ? ' cmp-done' : ''}`}>{done ? 'Finished' : tick === 0 ? 'Ready' : 'In progress'}</span>
      </header>
      <div className="cmp-canvas-wrap">
        <canvas ref={canvasRef} role="img" aria-label={`${run.algorithm.name} visualization: ${message || 'Original input'}`} />
      </div>
      <div className="cmp-panel-body">
        <div className="cmp-progress-label"><span>Recorded steps</span><strong>{Math.min(tick, run.steps.length)} / {run.steps.length}</strong></div>
        <progress max={run.steps.length} value={Math.min(tick, run.steps.length)} aria-label={`${run.algorithm.name} progress`} />
        <p className="cmp-narration" aria-live="polite">{message || 'Same starting input. Press Play or Next to begin.'}</p>
        {done && <p className="cmp-result">Result: {result}</p>}
        <dl className="cmp-complexity">
          {metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>
        <p className="cmp-note">{complexity?.note}</p>
        {snippet && <details><summary>View existing implementation (JavaScript)</summary>
          <CodePanel codeSnippet={Array.isArray(snippet) ? snippet.join('\n') : snippet} activeLine={step?.codeLines?.js ?? step?.codeLine ?? -1} />
        </details>}
      </div>
    </section>
  );
}

export default function Compare() {
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
      if (algoA === algoB) throw new Error('Choose two different algorithms to compare.');
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
          if (!steps.length) throw new Error(`${algorithm.name} did not generate any steps.`);
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
          if (!steps.length) throw new Error(`${algorithm.name} did not generate any steps.`);
          return { algorithm, steps, input: sharedOperations.map(operation => ({ ...operation })), target: null };
        });
        setSession(runs);
        return;
      }

      if (isTrees) {
        const parts = input.split(',').map(value => value.trim());
        if (parts.some(value => !/^\d+$/.test(value)) || parts.length === 0 || parts.length > 10) {
          throw new Error('Enter 1–10 comma-separated whole numbers from 0 to 99. Insertion order matters.');
        }
        const values = parts.map(Number);
        if (values.some(value => value > 99)) throw new Error('Use values from 0 to 99 so both trees share the same keys.');
        const runs = [algoA, algoB].map(id => {
          const algorithm = getAlgorithm(id);
          const steps = algorithm.generateSteps([...values]);
          if (!steps.length) throw new Error(`${algorithm.name} did not generate any steps.`);
          return { algorithm, steps, input: [...values], target: null };
        });
        setSession(runs);
        return;
      }

      const parts = input.split(',').map(value => value.trim());
      if (parts.some(value => !/^\d+$/.test(value)) || parts.length > 32) {
        throw new Error('Enter 1–32 comma-separated whole numbers from 0 to 99. Empty entries are not allowed.');
      }
      const values = parts.map(Number);
      if (values.some(value => value > 99)) throw new Error('Use values from 0 to 99 so both visualizations can share this input.');
      if (isSearching && (!/^\d+$/.test(target.trim()) || Number(target) > 99)) {
        throw new Error('Enter a whole-number search target from 0 to 99. It does not need to be present in the array.');
      }
      const sharedInput = isSearching ? [...values].sort((a, b) => a - b) : values;
      const runs = [algoA, algoB].map(id => {
        const algorithm = getAlgorithm(id);
        const steps = algorithm.generateSteps(isSearching
          ? { arr: [...sharedInput], target: Number(target) } : [...sharedInput]);
        if (!steps.length) throw new Error(`${algorithm.name} did not generate any steps.`);
        return { algorithm, steps, input: [...sharedInput], target: isSearching ? Number(target) : null };
      });
      setSession(runs);
    } catch (problem) {
      setError(problem.message || 'Unable to prepare this comparison. Check your input.');
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
        <span className="cmp-eyebrow">Algorithm comparison lab</span>
        <h1>One input. Two approaches.</h1>
        <p className="page__subtitle">Compare existing algorithm visualizations side by side, one recorded step at a time.</p>
      </header>

      <form className="cmp-setup" onSubmit={prepare}>
        <label className="cmp-group">Compare algorithms for
          <select value={groupKey} onChange={event => changeGroup(event.target.value)}>
            {Object.entries(groups).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </label>
        <div className="cmp-selectors">
          {[['A', algoA, setAlgoA], ['B', algoB, setAlgoB]].map(([side, value, setter]) => (
            <label key={side}>Algorithm {side}
              <select value={value} onChange={event => { invalidate(); setter(event.target.value); }}>
                {algorithms.map(algorithm => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}
              </select>
            </label>
          ))}
        </div>

        {isGraph ? (
          <>
            <label htmlFor="cmp-graph-input">Shared weighted graph</label>
            <div className="cmp-input-row">
              <input id="cmp-graph-input" value={graphInput} onChange={event => { invalidate(); setGraphInput(event.target.value); }} aria-describedby="cmp-graph-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">Prepare comparison</button>
            </div>
            <div className="cmp-graph-settings">
              <label htmlFor="cmp-graph-start">Start node
                <select id="cmp-graph-start" value={graphStart} onChange={event => { invalidate(); setGraphStart(event.target.value); }}>
                  {availableNodes.length === 0 && <option value="">Add edges first</option>}
                  {availableNodes.map(node => <option key={node} value={node}>{node}</option>)}
                </select>
              </label>
              <p id="cmp-graph-help" className="cmp-note">Write undirected edges as <code>A-B</code> or weighted edges as <code>A-B:4</code>. Separate edges with commas. Traversal compares visit order; MST compares the selected edges and total weight.</p>
            </div>
          </>
        ) : isOperations ? (
          <>
            <label htmlFor="cmp-operations">Shared operations</label>
            <div className="cmp-input-row">
              <input id="cmp-operations" value={operations} onChange={event => { invalidate(); setOperations(event.target.value); }} aria-describedby="cmp-operations-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">Prepare comparison</button>
            </div>
            <p id="cmp-operations-help" className="cmp-note">Use <code>insert 10</code> and <code>delete</code>, separated by commas. Both structures receive the same sequence. A stack removes the newest value (LIFO); a queue removes the oldest (FIFO). Ignored removes on an empty structure are skipped in its trace.</p>
          </>
        ) : (
          <>
            <label htmlFor="cmp-input">{isTrees ? 'Shared insertion order' : 'Shared input'}</label>
            <div className="cmp-input-row">
              <input id="cmp-input" value={input} onChange={event => { invalidate(); setInput(event.target.value); }} aria-describedby="cmp-input-help" aria-invalid={!!error} />
              <button className="cmp-primary" type="submit">Prepare comparison</button>
            </div>
            <p id="cmp-input-help" className="cmp-note">{isTrees
              ? '1–10 whole numbers, 0–99. Values are inserted in the written order; duplicates are ignored — a duplicate insert still appears as a step so both traces stay aligned.'
              : '1–32 whole numbers, 0–99. Each algorithm receives its own copy of the same array.'}</p>
            {isSearching && <div className="cmp-search-settings">
              <label htmlFor="cmp-target">Search target
                <input id="cmp-target" inputMode="numeric" value={target} onChange={event => { invalidate(); setTarget(event.target.value); }} aria-describedby="cmp-search-help" />
              </label>
              <p id="cmp-search-help" className="cmp-note">Binary and jump search require ascending order. Prepare sorts one shared copy for both sides, including linear search. Sorting is preprocessing and is not counted in the search trace. With duplicates, algorithms may find different matching indices.</p>
            </div>}
          </>
        )}

        <div className="cmp-presets"><span>Try an input:</span>{presets.map(kind => <button key={kind} type="button" onClick={() => preset(kind)}>{kind}</button>)}</div>
        {error && <p className="cmp-error" role="alert">{error}</p>}
      </form>

      <section className="cmp-playback" aria-label="Shared playback controls">
        <div className="cmp-toolbar">
          <button disabled={!session || tick === 0} onClick={() => seek(0)}><RotateCcw size={16} /> Reset</button>
          <button disabled={!session || tick === 0} onClick={() => seek(tick - 1)}><ChevronLeft size={16} /> Back</button>
          <button className="cmp-primary" disabled={!session} onClick={() => {
            if (tick === total) setTick(0);
            setPlaying(!isPlaying);
          }}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? 'Pause' : session && tick === total ? 'Replay' : 'Play'}</button>
          <button disabled={!session || tick === total} onClick={() => seek(tick + 1)}>Next <ChevronRight size={16} /></button>
          <label className="cmp-speed">Speed
            <select value={speed} onChange={event => setSpeed(Number(event.target.value))}>
              {[1, 2, 3, 5, 10].map(value => <option key={value} value={value}>{value} steps/s</option>)}
            </select>
          </label>
        </div>
        <label className="cmp-timeline">Timeline <span>{tick} / {total}</span>
          <input type="range" min="0" max={total || 1} value={tick} disabled={!session} onChange={event => seek(Number(event.target.value))} />
        </label>
        <p className="cmp-note">One recorded step per side per tick. Finished panels hold their result. Step counts describe the teaching trace, not execution time or equal computational work.</p>
      </section>

      {session && isSearching && <div className="cmp-shared-input" role="status"><strong>Searching for {session[0].target}</strong><p>Shared sorted array (indices start at 0): [{session[0].input.join(', ')}]</p></div>}
      {session && isGraph && <div className="cmp-shared-input" role="status"><strong>Shared graph</strong><p>{graphSummary(session[0].input)}</p><p>Edges: {session[0].input.edges.map(([from, to, weight]) => `${from}—${to} (${weight})`).join(', ')}</p></div>}
      {session && isOperations && <div className="cmp-shared-input" role="status"><strong>Shared operation sequence</strong><p>{operationSummary(session[0].input)}</p></div>}
      {session && isTrees && <div className="cmp-shared-input" role="status"><strong>Shared insertion order</strong><p>{session[0].input.join(' → ')}</p></div>}
      {session ? <div className="cmp-panels">{session.map((run, index) => <ComparisonPanel key={`${groupKey}-${index}`} run={run} tick={tick} side={index === 0 ? 'A' : 'B'} />)}</div>
        : <div className="cmp-empty"><h2>Explore how two algorithms solve the same problem</h2><p>Choose algorithms and a shared input, then prepare your comparison. Try different presets to see how their behavior changes.</p></div>}
    </div>
  );
}
