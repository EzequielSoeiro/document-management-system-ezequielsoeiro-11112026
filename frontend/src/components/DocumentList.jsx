import { File, FolderOpen, LoaderCircle } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${numberFormatter.format(bytes / 1024)} KB`;
  return `${numberFormatter.format(bytes / 1024 ** 2)} MB`;
}

export default function DocumentList({ documents, loading, error }) {
  if (loading) {
    return <p className="catalog-state" role="status"><LoaderCircle className="spinning" size={24} aria-hidden="true" />Carregando documentos...</p>;
  }
  if (error) return null;
  if (documents.length === 0) {
    return <div className="catalog-state"><FolderOpen size={42} strokeWidth={1.3} aria-hidden="true" /><p>Nenhum documento enviado.</p></div>;
  }

  return (
    <ul className="document-list" aria-label="Documentos disponíveis">
      {documents.map(document => (
        <li className="document-row" key={document.id}>
          <File className="document-icon" size={23} strokeWidth={1.5} aria-hidden="true" />
          <div className="document-details">
            <h3 title={document.originalName}>{document.originalName}</h3>
            <div className="document-meta">
              <span>{formatSize(document.size)}</span>
              <time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time>
              <span className="document-owner" title={document.owner}>{document.owner}</span>
            </div>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}