import { Link, NavLink } from 'react-router-dom';
import {
  Binary,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Home,
  KeyRound,
  Layers,
  ListOrdered,
  Network,
  Scale,
  Search,
  Sparkles,
  TreePine,
  Trophy,
  Workflow,
} from 'lucide-react';
import './Sidebar.css';
import logo from '../../../assets/ddc-logo-transparent.png';

const COURSE_LINKS = [
  {
    title: 'Data Structure',
    to: '/courses/data-structure',
    icon: Layers,
    children: [
      { to: '/courses/data-structure/arrays', label: 'Arrays', icon: Binary },
      { to: '/courses/data-structure/stacks', label: 'Stacks', icon: Layers },
      { to: '/courses/data-structure/queues', label: 'Queues', icon: Workflow },
      { to: '/courses/data-structure/linked-lists', label: 'Linked Lists', icon: GitBranch },
      { to: '/courses/data-structure/sorting', label: 'Sorting', icon: ListOrdered },
      { to: '/courses/data-structure/searching', label: 'Searching', icon: Search },
      { to: '/courses/data-structure/graphs', label: 'Graphs', icon: Network },
    ],
  },
  {
    title: 'Advanced Data Structure',
    to: '/courses/advanced-data-structure',
    icon: GitBranch,
    children: [
      { to: '/courses/advanced-data-structure/trees', label: 'Binary Search Trees', icon: TreePine },
      { to: '/courses/advanced-data-structure/avl-tree', label: 'AVL Tree', icon: TreePine },
      { to: '/courses/advanced-data-structure/red-black-tree', label: 'Red-Black Tree', icon: TreePine },
    ],
  },
];

const TOOLS = [
  { to: '/practice', label: 'Practice Mode', icon: Trophy },
  { to: '/compare', label: 'Compare Algorithms', icon: Scale },
  { to: '/api-keys', label: 'AI & API Settings', icon: KeyRound },
];

function SidebarLink({ to, label, icon: Icon, onNavigate, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={label}
      aria-label={label}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const handleNavigate = () => {
    if (window.matchMedia('(max-width: 1199px)').matches) onToggle();
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
      <Link
        to="/"
        className="sidebar-brand"
        onClick={handleNavigate}
        title="Home"
        aria-label="FCAI-Visualizer home"
      >
        <img src={logo} alt="" className="sidebar-brand-logo" />
        <span className="sidebar-brand-copy">
          <strong>FCAI-CU</strong>
          <small>Learn by visualizing</small>
        </span>
      </Link>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </button>

      <nav className="sidebar-nav">
        <p className="sidebar-section-title">Workspace</p>
        <SidebarLink to="/" label="Home" icon={Home} onNavigate={handleNavigate} end />

        <p className="sidebar-section-title">Courses</p>
        {COURSE_LINKS.map((course) => {
          const Icon = course.icon;
          return (
            <section className="sidebar-course" key={course.to}>
              <Link
                to={course.to}
                className="sidebar-course-heading"
                onClick={handleNavigate}
                title={course.title}
                aria-label={course.title}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{course.title}</span>
              </Link>
              <div className="sidebar-course-topics">
                {course.children.map((item) => (
                <SidebarLink key={item.to} {...item} onNavigate={handleNavigate} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="sidebar-section-title">Learning tools</p>
        {TOOLS.map((tool) => (
          <SidebarLink key={tool.to} {...tool} onNavigate={handleNavigate} />
        ))}

        <div className="sidebar-support-card">
          <div className="sidebar-support-icon"><Sparkles size={16} /></div>
          <strong>Learn actively</strong>
          <span>Watch an algorithm, then try it yourself.</span>
          <Link to="/practice" onClick={handleNavigate}>Explore practice <Trophy size={14} /></Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-mark"><BookOpen size={15} /></span>
        <span>Faculty of Computers &amp; AI<br /><b>Cairo University</b></span>
        <span className="sidebar-footer-cu">CU</span>
      </div>
    </aside>
  );
}
