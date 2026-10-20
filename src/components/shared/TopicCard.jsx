import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../hooks/useT';

export default function TopicCard({ topic, index = 0 }) {
  const t = useT();
  const Icon = topic.icon;
  const StatusIcon = topic.comingSoon ? Clock3 : CheckCircle2;

  return (
    <Link
      to={topic.route}
      className="topic-card group rounded-2xl border bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ '--topic-delay': `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="topic-card-heading">
        <span className="topic-card-icon"><Icon size={21} strokeWidth={1.9} /></span>
        <span className={`topic-card-status${topic.comingSoon ? ' is-coming-soon' : ''}`}>
          <StatusIcon size={13} />
          {topic.comingSoon ? t('catalog:compression.comingSoon') : t('catalog:card.status')}
        </span>
      </div>
      <h3>{t(`catalog:topic.${topic.id}.title`)}</h3>
      <p>{t(`catalog:topic.${topic.id}.description`)}</p>
      <div className="topic-card-tags">
        {t(`catalog:topic.${topic.id}.tags`, { returnObjects: true }).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <span className="topic-card-link">{t('catalog:card.openTopic')} <ArrowUpRight size={15} /></span>
    </Link>
  );
}
