import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TopicCard({ topic, index = 0 }) {
  const Icon = topic.icon;

  return (
    <Link
      to={topic.route}
      className="topic-card group rounded-2xl border bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ '--topic-delay': `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="topic-card-heading">
        <span className="topic-card-icon"><Icon size={21} strokeWidth={1.9} /></span>
        <span className="topic-card-status"><CheckCircle2 size={13} /> Interactive</span>
      </div>
      <h3>{topic.title}</h3>
      <p>{topic.description}</p>
      <div className="topic-card-tags">
        {topic.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <span className="topic-card-link">Open topic <ArrowUpRight size={15} /></span>
    </Link>
  );
}
