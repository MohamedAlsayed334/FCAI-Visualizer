import { ArrowLeft, Clock3, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../../hooks/useT';
import '../../../styles/Compression.css';

export default function LossyCompression() {
  const t = useT();

  return (
    <div className="compression-page page animate-in">
      <Link className="back-link" to="/courses/information-theory-compression">
        <ArrowLeft size={15} className="rtl-flip" />
        {t('catalog:compression.backToCourse')}
      </Link>
      <section className="compression-coming-soon">
        <span className="compression-coming-soon-icon"><Image size={26} /></span>
        <span className="compression-eyebrow">{t('catalog:compression.lossy.eyebrow')}</span>
        <h1>{t('catalog:topic.lossy-compression.title')}</h1>
        <p>{t('catalog:compression.lossy.description')}</p>
        <span className="compression-status"><Clock3 size={14} /> {t('catalog:compression.comingSoon')}</span>
      </section>
    </div>
  );
}
