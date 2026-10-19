import { useT } from '../../hooks/useT';

export default function ComplexityPanel({ complexity, algoId }) {
  const t = useT();
  if (!complexity) return null;

  const note = algoId
    ? t(`algorithms:${algoId}.complexityNote`, { defaultValue: complexity.note || '' })
    : (complexity.note || '');

  return (
    <div className="panel-card">
      <h3>{t('panel.complexity.title')}</h3>
      <div className="complexity-grid">
        {/* Sorting/searching datasets store the average case under `avg`;
            DS/tree/graph datasets only carry access/search/insert/delete. */}
        <span className="complexity-label">{t('panel.complexity.best')}</span>
        <span className="complexity-value">{complexity.best}</span>

        <span className="complexity-label">{t('panel.complexity.average')}</span>
        <span className="complexity-value">{complexity.avg ?? complexity.average ?? '—'}</span>

        <span className="complexity-label">{t('panel.complexity.worst')}</span>
        <span className="complexity-value">{complexity.worst}</span>

        <span className="complexity-label">{t('panel.complexity.space')}</span>
        <span className="complexity-value">{complexity.space}</span>
      </div>
      {note && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}
