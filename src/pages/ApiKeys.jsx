import ApiKeyTable from '../components/ai/ApiKeyTable';
import { useT } from '../hooks/useT';

export default function ApiKeys() {
  const t = useT('apiKeys');
  return (
    <div className="page api-keys-page">
      <div className="page__header">
        <h1>{t('title')}</h1>
        <p className="page__subtitle">
          {t('subtitle')}
        </p>
      </div>
      <ApiKeyTable />
    </div>
  );
}
