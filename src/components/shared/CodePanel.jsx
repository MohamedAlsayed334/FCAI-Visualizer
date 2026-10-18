import { Code2 } from 'lucide-react';

const LANG_LABELS = {
  js: 'JS',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
  csharp: 'C#',
};

export default function CodePanel({ codeByLang, codeSnippet, activeLine, lang = 'js', setLang }) {
  const resolvedSnippet = codeByLang
    ? (codeByLang[lang] ?? codeByLang.js ?? '')
    : (codeSnippet ?? '');

  if (!resolvedSnippet) return null;

  return (
    <section className="panel-card code-container shared-code-panel" aria-label="Algorithm implementation">
      <div className="shared-code-heading">
        <h3><Code2 size={17} /> Implementation</h3>
        {codeByLang && setLang && (
          <div className="lang-tab-bar" role="tablist" aria-label="Programming language">
            {Object.entries(LANG_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={lang === key}
                className={`lang-tab${lang === key ? ' active' : ''}`}
                onClick={() => setLang(key)}
                title={`View in ${label}`}
              >
                {label}
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
