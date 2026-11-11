import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button className="icon-button" type="button" onClick={handleDownload} disabled={downloading}
        aria-label={`${downloading ? 'Baixando' : 'Baixar'} ${document.originalName}`}
        title={downloading ? 'Baixando...' : 'Baixar documento'}>
        {downloading ? <LoaderCircle className="spinning" size={19} aria-hidden="true" /> : <Download size={19} aria-hidden="true" />}
      </button>
      {error && <p className="message error download-error" role="alert">{error}</p>}
    </div>
  );
}