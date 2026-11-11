import { useState } from 'react';
import { CheckCircle2, FileUp, LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (uploading) return;
    setError('');
    setSuccess('');
    if (!file || file.size === 0) {
      setError(file ? 'O arquivo está vazio. Selecione outro arquivo.' : 'Selecione um arquivo para enviar.');
      return;
    }
    const form = event.currentTarget;
    setUploading(true);
    try {
      await uploadDocument(file);
      setSuccess('Documento enviado com sucesso.');
      setFile(null);
      form.reset();
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <h2 id="upload-title">Novo documento</h2>
      <form onSubmit={handleSubmit} aria-busy={uploading}>
        <div className="file-picker">
          <FileUp size={36} strokeWidth={1.5} aria-hidden="true" />
          <label htmlFor="document-file">Selecionar arquivo</label>
          <input id="document-file" name="file" type="file" disabled={uploading}
            onChange={event => {
              setFile(event.target.files?.[0] || null);
              setError('');
              setSuccess('');
            }} />
        </div>
        {file && <p className="selected-file" title={file.name}>{file.name}</p>}
        <button className="primary-button" type="submit" disabled={uploading || !file}>
          {uploading ? <LoaderCircle className="spinning" size={17} aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
        {error && <p className="message error" role="alert">{error}</p>}
        {success && <p className="message success" role="status"><CheckCircle2 size={17} aria-hidden="true" />{success}</p>}
      </form>
    </section>
  );
}