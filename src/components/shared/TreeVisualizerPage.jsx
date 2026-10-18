import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { initTreeVisualizer } from '../../algorithms/trees/treeVisualizer';
import '../../styles/TreeVisualizer.css';

export default function TreeVisualizerPage({ fixedType }) {
  const containerRef = useRef(null);
  const visualizerRef = useRef(null);
  const { type = 'bst' } = useParams();
  const treeType = fixedType || type;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    visualizerRef.current?.destroy();
    visualizerRef.current = initTreeVisualizer(containerRef.current, treeType);

    return () => {
      visualizerRef.current?.destroy();
      visualizerRef.current = null;
    };
  }, [treeType]);

  return <div ref={containerRef} className="tree-page tree-page--course" />;
}
