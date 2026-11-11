import { useEffect, useState } from 'react';
import { Files, RefreshCw } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments({ signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch(loadError => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  function refreshDocuments() {
    setRevision(current => current + 1);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="DMS - início">
          <Files size={25} aria-hidden="true" />
          <span>DMS<span className="brand-description">Gestão de documentos</span></span>
        </a>
        <span className="instance-label">Espaço local</span>
      </header>
      <main>
        <div className="page-heading">
          <div><p className="eyebrow">Meu acervo</p><h1>Documentos</h1></div>
          <button className="secondary-button" type="button" onClick={refreshDocuments} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" />Atualizar
          </button>
        </div>
        <div className="workspace">
          <UploadComponent onUploaded={refreshDocuments} />
          <section className="catalog" aria-labelledby="catalog-title" aria-busy={loading}>
            <div className="section-heading">
              <h2 id="catalog-title">Arquivos</h2>
              <span className="document-count">{documents.length}</span>
            </div>
            {error && <p className="message error" role="alert">{error}</p>}
            <DocumentList documents={documents} loading={loading} error={Boolean(error)} />
          </section>
        </div>
      </main>
    </div>
  );
}
