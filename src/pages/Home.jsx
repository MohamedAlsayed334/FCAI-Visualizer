import { ArrowRight, Brain, GitCompareArrows, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/shared/CourseCard';
import { advancedDataStructureCourse, dataStructureCourse } from '../data/courses';
import '../styles/CourseCatalog.css';

const TOOLS = [
  {
    title: 'Practice Mode',
    description: 'Turn what you have learned into confidence with quick questions.',
    route: '/practice',
    icon: Brain,
    color: 'violet',
    action: 'Start practicing',
  },
  {
    title: 'Compare Algorithms',
    description: 'See two algorithms side by side and compare how they behave.',
    route: '/compare',
    icon: GitCompareArrows,
    color: 'green',
    action: 'Open comparison',
  },
];

function LearningToolCard({ tool }) {
  const Icon = tool.icon;

  return (
    <Link to={tool.route} className={`learning-tool-card learning-tool-card--${tool.color}`}>
      <span className="learning-tool-icon"><Icon size={21} /></span>
      <span className="learning-tool-copy">
        <strong>{tool.title}</strong>
        <span>{tool.description}</span>
      </span>
      <span className="learning-tool-action">{tool.action} <ArrowRight size={14} /></span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="home-page page animate-in">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker"><Sparkles size={14} /> FCAI-CU · Learn by seeing</span>
          <h1>Make algorithms<br /><span>make sense.</span></h1>
          <p>
            Explore data structures and algorithms through clear, interactive
            visualizations built for computer science students.
          </p>
          <Link className="home-primary-link" to="/courses/data-structure">
            Explore the courses <ArrowRight size={17} />
          </Link>
          <div className="home-proof-points">
            <span><i /> Interactive visualizations</span>
            <span><i /> Step-by-step learning</span>
          </div>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-grid-mark" />
          <div className="hero-node hero-node--root">DS</div>
          <div className="hero-node hero-node--left">A</div>
          <div className="hero-node hero-node--right">AI</div>
          <div className="hero-node hero-node--bottom">FCAI</div>
          <span className="hero-connection hero-connection--left" />
          <span className="hero-connection hero-connection--right" />
          <span className="hero-connection hero-connection--bottom" />
          <span className="hero-orbit hero-orbit--one" />
          <span className="hero-orbit hero-orbit--two" />
          <span className="hero-visual-label">VISUALIZE · EXPLORE · LEARN</span>
        </div>
      </section>

      <section className="home-courses" aria-labelledby="home-courses-title">
        <div className="home-section-heading">
          <div>
            <span className="section-eyebrow">YOUR LEARNING PATH</span>
            <h2 id="home-courses-title">Choose a course</h2>
          </div>
          <p>Start with the fundamentals, then move into advanced structures.</p>
        </div>
        <div className="course-card-grid">
          <CourseCard course={dataStructureCourse} to="/courses/data-structure" />
          <CourseCard course={advancedDataStructureCourse} to="/courses/advanced-data-structure" />
        </div>
      </section>

      <section className="home-tools" aria-labelledby="home-tools-title">
        <div className="home-section-heading home-section-heading--compact">
          <div>
            <span className="section-eyebrow">KEEP GOING</span>
            <h2 id="home-tools-title">Learn by doing</h2>
          </div>
          <Link to="/api-keys" className="home-text-link">AI learning settings <ArrowRight size={14} /></Link>
        </div>
        <div className="learning-tools-grid">
          {TOOLS.map((tool) => <LearningToolCard key={tool.title} tool={tool} />)}
        </div>
      </section>

      <footer className="home-footer">
        <span>FCAI-CU</span>
        <span>Faculty of Computers &amp; Artificial Intelligence · Cairo University</span>
      </footer>
    </div>
  );
}
