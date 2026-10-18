import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import TopicCard from './TopicCard';
import '../../styles/CourseCatalog.css';

export default function CourseOverview({ course, backTo = '/', backLabel = 'All courses' }) {
  const Icon = course.icon;

  return (
    <div className={`course-overview page course-overview--${course.color} animate-in`}>
      <Link className="back-link" to={backTo}><ArrowLeft size={15} /> {backLabel}</Link>
      <section className="course-overview-hero">
        <div className="course-overview-copy">
          <span className="course-overview-eyebrow"><BookOpen size={14} /> {course.eyebrow} · FCAI-CU</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-overview-meta">
            <span><Icon size={16} /> {course.lessonCount} topics</span>
            <span><Sparkles size={15} /> Interactive lessons</span>
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
          <span>COURSE CONTENT</span>
          <h2>Choose a topic to explore</h2>
        </div>
        <p>Learn the idea, then see it in action.</p>
      </div>

      <div className="topic-grid">
        {course.topics.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} />)}
      </div>
    </div>
  );
}
