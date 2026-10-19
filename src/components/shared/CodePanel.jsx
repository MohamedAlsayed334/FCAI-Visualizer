import { Code2 } from 'lucide-react';

const LANG_LABELS = {
  js: 'JS',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
  csharp: 'C#',
};

export default function CodePanel({ codeByLang, codeSnippet, activeLine, lang = 'js', setLang }) {
  // Tabs follow data: only offer languages this algorithm actually has snippets for.
  const availableLangs = codeByLang
    ? Object.keys(LANG_LABELS).filter((key) => (codeByLang[key] ?? '').length > 0)
    : [];
  // Keep a valid selection even when the persisted lang has no snippets here.
  const effectiveLang = availableLangs.includes(lang)
    ? lang
    : (availableLangs.includes('js') ? 'js' : availableLangs[0] ?? 'js');
  const resolvedSnippet = codeByLang
    ? (codeByLang[effectiveLang] ?? '')
    : (codeSnippet ?? '');

  if (!resolvedSnippet) return null;

  return (
    <section className="panel-card code-container shared-code-panel" aria-label="Algorithm implementation">
      <div className="shared-code-heading">
        <h3><Code2 size={17} /> Implementation</h3>
        {codeByLang && setLang && (
          <div className="lang-tab-bar" role="tablist" aria-label="Programming language">
            {availableLangs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={effectiveLang === key}
                className={`lang-tab${effectiveLang === key ? ' active' : ''}`}
                onClick={() => setLang(key)}
                title={`View in ${LANG_LABELS[key]}`}
              >
                {LANG_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      </div>
      <pre><code>
        {resolvedSnippet.split('\n').map((line, idx) => (
          <span key={`${idx}-${line}`} className={`code-line${activeLine === idx ? ' active' : ''}`}>
            <span className="line-num" aria-hidden="true">{idx + 1}</span>
            <span className="line-text">{line || ' '}</span>
          </span>
        ))}
      </code></pre>
    </section>
  );
}
