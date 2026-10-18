import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found-page page">
      <span>404 · PAGE NOT FOUND</span>
      <h1>This page is off the map.</h1>
      <p>The link may have changed, but your learning path is still here.</p>
      <Link to="/"><Home size={16} /> Back to FCAI-CU</Link>
    </div>
  );
}
