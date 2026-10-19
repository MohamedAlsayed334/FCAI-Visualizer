import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../hooks/useT';

export default function CourseCard({ course, to }) {
  const t = useT();
  const Icon = course.icon;

  return (
    <Link to={to} className={`course-card group relative block overflow-hidden rounded-2xl border bg-[var(--surface)] p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl course-card--${course.color}`}>
      <div className="course-card-topline">
        <span className="course-card-icon"><Icon size={25} strokeWidth={1.8} /></span>
        <span className="course-card-cta" aria-hidden="true"><ArrowUpRight size={19} /></span>
      </div>
      <span className="course-card-eyebrow">{t(`catalog:course.${course.id}.eyebrow`)}</span>
      <h2>{t(`catalog:course.${course.id}.title`)}</h2>
      <p>{t(`catalog:course.${course.id}.description`)}</p>
      <div className="course-card-footer">
        <span>
          <b>{course.lessonCount}</b> {t('catalog:card.learningTopics', { count: course.lessonCount })}
        </span>
        <span>{t('catalog:card.exploreCourse')} <ArrowUpRight size={15} /></span>
      </div>
      <span className="course-card-decoration" aria-hidden="true" />
    </Link>
  );
}
