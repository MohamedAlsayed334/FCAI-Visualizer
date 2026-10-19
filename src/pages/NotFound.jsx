import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../hooks/useT';

export default function NotFound() {
  const t = useT();

  return (
    <div className="not-found-page page">
      <span>{t('notFound.eyebrow')}</span>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/"><Home size={16} /> {t('notFound.backHome')}</Link>
    </div>
  );
}
