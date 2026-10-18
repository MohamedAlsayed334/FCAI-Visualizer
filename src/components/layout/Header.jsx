import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';

const TITLES = {
  '/': 'Learning dashboard',
  '/courses/data-structure': 'Data Structure',
  '/courses/advanced-data-structure': 'Advanced Data Structure',
  '/courses/advanced-data-structure/trees': 'Trees',
  '/courses/advanced-data-structure/avl-tree': 'AVL Tree',
  '/courses/advanced-data-structure/red-black-tree': 'Red-Black Tree',
  '/sorting': 'Sorting Algorithms',
  '/searching': 'Searching Algorithms',
  '/data-structures': 'Data Structures',
  '/trees': 'Tree Visualizer',
  '/graphs': 'Graph Algorithms',
  '/practice': 'Practice Mode',
  '/compare': 'Algorithm Comparison',
  '/api-keys': 'AI Settings',
};

function getTitle(pathname) {
  // Check exact match first
  if (TITLES[pathname]) return TITLES[pathname];
  // Check prefix match
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const labels = {
      bubble: 'Bubble Sort', selection: 'Selection Sort', insertion: 'Insertion Sort',
      merge: 'Merge Sort', quick: 'Quick Sort', heap: 'Heap Sort',
      counting: 'Counting Sort', radix: 'Radix Sort',
      linear: 'Linear Search', binary: 'Binary Search', jump: 'Jump Search',
      sorting: 'Sorting Algorithms', searching: 'Searching Algorithms', graphs: 'Graph Algorithms',
      arrays: 'Arrays', stacks: 'Stacks', queues: 'Queues', 'linked-lists': 'Linked Lists',
      bst: 'Binary Search Tree', avl: 'AVL Tree', rbt: 'Red-Black Tree',
      bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra',
      array: 'Array', stack: 'Stack', queue: 'Queue',
      'singly-ll': 'Singly Linked List', 'doubly-ll': 'Doubly Linked List',
      'circular-ll': 'Circular Linked List', 'ordered-ll': 'Ordered Linked List',
    };
    return labels[parts[parts.length - 1]] || parts[parts.length - 1];
  }
  return 'FCAI-Visualizer';
}

export default function Header({ onToggleSidebar, theme, onToggleTheme }) {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header className="app-header">
      <button
        onClick={onToggleSidebar}
        className="icon-button mobile-menu-button"
        title="Toggle navigation"
        aria-label="Toggle navigation"
      >
        <Menu size={19} />
      </button>

      <div className="header-title-group">
        <p className="header-eyebrow">FCAI-CU · Learning platform</p>
        <div className="header-title">{title}</div>
      </div>

      <button
        onClick={onToggleTheme}
        className="theme-toggle"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
      </button>
      <Link className="header-help-link" to="/practice">Start learning</Link>
    </header>
  );
}
