import { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { initDSVisualizer } from '../algorithms/dataStructures/dsVisualizer';
import '../styles/DataStructures.css';

export default function DataStructures({ fixedType }) {
  const { type: routeType = 'array' } = useParams();
  const type = fixedType || routeType;
  const containerRef = useRef(null);
  const vizRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    vizRef.current?.destroy();
    vizRef.current = initDSVisualizer(containerRef.current, type);

    return () => {
      vizRef.current?.destroy();
      vizRef.current = null;
    };
  }, [type]);

  return (
    <div ref={containerRef} className="ds-page" style={{ width: '100%', height: '100%' }} />
  );
}
