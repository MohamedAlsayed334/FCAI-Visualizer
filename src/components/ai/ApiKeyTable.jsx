import { useState, useEffect } from 'react';
import { getApiKeyStatus, resetApiKeys } from '../../services/aiService';
import { useT } from '../../hooks/useT';
import { useLocale } from '../../hooks/useLocale';
import { formatTime } from '../../i18n/format';

function StatusBadge({ status, isAvailable, hasKey, t }) {
  if (!hasKey) return <span className="api-badge api-badge--missing">{t('table.noKey')}</span>;
  if (isAvailable) return <span className="api-badge api-badge--active">{t('table.active')}</span>;
  if (status === 'out_of_work') return <span className="api-badge api-badge--cooldown">{t('table.cooldown')}</span>;
  return <span className="api-badge api-badge--unknown">{t('table.unknown')}</span>;
}

export default function ApiKeyTable() {
  const [keys, setKeys] = useState(() => getApiKeyStatus());
  const t = useT('apiKeys');
  const { locale } = useLocale();

  useEffect(() => {
    const interval = setInterval(() => {
      setKeys(getApiKeyStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    resetApiKeys();
    setKeys(getApiKeyStatus());
  };

  const formatCooldown = (ms) => {
    if (ms <= 0) return t('table.notUsed');
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return t('cooldownShort', { hours, mins });
  };

  const totalAvailable = keys.filter(k => k.hasKey && (k.status === 'active' || (k.status === 'out_of_work' && k.remainingCooldown <= 0))).length;
  const totalKeys = keys.filter(k => k.hasKey).length;

  return (
    <div className="api-key-table-wrapper">
      <div className="api-key-table-header">
        <h2>{t('table.title')}</h2>
        <div className="api-key-table-actions">
          <span className="api-key-summary">
            {t('table.summary', { available: totalAvailable, total: totalKeys })}
          </span>
          <button className="api-reset-btn" onClick={handleReset}>{t('table.resetAll')}</button>
        </div>
      </div>
      <div className="api-key-table-scroll">
        <table className="api-key-table">
          <thead>
            <tr>
              <th>{t('table.headers.provider')}</th>
              <th>{t('table.headers.model')}</th>
              <th>{t('table.headers.status')}</th>
              <th>{t('table.headers.lastUsed')}</th>
              <th>{t('table.headers.cooldown')}</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr><td colSpan="5" className="api-empty">{t('table.empty')}</td></tr>
            ) : (
              keys.map(k => (
                <tr key={k.id} className={!k.hasKey ? 'api-row--disabled' : ''}>
                  <td className="api-provider-cell">
                    <span className={`api-provider-dot api-provider-dot--${k.provider.toLowerCase()}`} />
                    {k.provider}
                  </td>
                  <td className="api-model-cell">{k.model}</td>
                  <td>
                    <StatusBadge status={k.status} isAvailable={k.remainingCooldown <= 0} hasKey={k.hasKey} t={t} />
                  </td>
                  <td className="api-time-cell">
                    {k.lastUsed ? formatTime(k.lastUsed, locale) : t('table.notUsed')}
                  </td>
                  <td className="api-time-cell">{formatCooldown(k.remainingCooldown)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
