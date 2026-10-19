import { useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { initGraphVisualizer } from '../algorithms/graphs/graphVisualizer';
import { initDFSVisualizer } from '../algorithms/graphs/dfsVisualizer';
import { initDijkstraVisualizer } from '../algorithms/graphs/dijkstraVisualizer';
import '../styles/TreeVisualizer.css';

const VIZ_MAP = {
  bfs: initGraphVisualizer,
  dfs: initDFSVisualizer,
  dijkstra: initDijkstraVisualizer,
};

const GRAPH_TABS = [
  { id: 'bfs', label: 'Breadth-First Search (BFS)' },
  { id: 'dfs', label: 'Depth-First Search (DFS)' },
  { id: 'dijkstra', label: "Dijkstra's Algorithm" },
];

export default function Graphs() {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const { algo = 'bfs' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const currentAlgo = VIZ_MAP[algo] ? algo : 'bfs';

  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (vizRef.current) {
      vizRef.current.destroy();
      vizRef.current = null;
    }
    const init = VIZ_MAP[currentAlgo];
    if (init) vizRef.current = init(containerRef.current);

    return () => {
      if (vizRef.current) {
        vizRef.current.destroy();
        vizRef.current = null;
      }
    };
  }, [currentAlgo]);

  const handleTabChange = (targetAlgo) => {
    const isCourseRoute = location.pathname.startsWith('/courses/data-structure/graphs');
    const targetPath = isCourseRoute
      ? `/courses/data-structure/graphs/${targetAlgo}`
      : `/graphs/${targetAlgo}`;
    navigate(targetPath);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      <nav className="graph-algo-nav" role="tablist" aria-label="Graph algorithm tabs">
        {GRAPH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={currentAlgo === tab.id}
            className={`graph-algo-tab${currentAlgo === tab.id ? ' active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div ref={containerRef} className="tree-page" style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
