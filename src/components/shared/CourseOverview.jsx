import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import TopicCard from './TopicCard';
import { useT } from '../../hooks/useT';
import '../../styles/CourseCatalog.css';

export default function CourseOverview({ course, backTo = '/', backLabelKey = 'catalog:back' }) {
  const t = useT();
  const Icon = course.icon;

  return (
    <div className={`course-overview page course-overview--${course.color} animate-in`}>
      <Link className="back-link" to={backTo}><ArrowLeft size={15} className="rtl-flip" /> {t(backLabelKey)}</Link>
      <section className="course-overview-hero">
        <div className="course-overview-copy">
          <span className="course-overview-eyebrow">
            <BookOpen size={14} /> {t(`catalog:course.${course.id}.eyebrow`)} · FCAI-CU
          </span>
          <h1>{t(`catalog:course.${course.id}.title`)}</h1>
          <p>{t(`catalog:course.${course.id}.description`)}</p>
          <div className="course-overview-meta">
            <span>
              <Icon size={16} /> {t('catalog:overview.metaTopics', { count: course.lessonCount })}
            </span>
            <span><Sparkles size={15} /> {t('catalog:overview.interactiveLessons')}</span>
          </div>
        </div>
        <div className="course-overview-art" aria-hidden="true">
          <div className="course-art-ring course-art-ring--outer" />
          <div className="course-art-ring course-art-ring--inner" />
          <div className="course-art-core"><Icon size={56} strokeWidth={1.4} /></div>
          <span className="course-art-dot course-art-dot--one" />
          <span className="course-art-dot course-art-dot--two" />
        </div>
      </section>

      <div className="course-section-heading">
        <div>
          <span>{t('catalog:overview.contentEyebrow')}</span>
          <h2>{t('catalog:overview.contentTitle')}</h2>
        </div>
        <p>{t('catalog:overview.contentSubtitle')}</p>
      </div>

      <div className="topic-grid">
        {course.topics.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} />)}
      </div>
    </div>
  );
}
