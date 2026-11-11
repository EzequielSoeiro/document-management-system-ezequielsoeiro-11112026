const API_PREFIX = '/api';

const errorMessages = {
  FILE_REQUIRED: 'Selecione um arquivo para enviar.',
  EMPTY_FILE: 'O arquivo está vazio. Selecione outro arquivo.',
  UNEXPECTED_FILE: 'Envie apenas um arquivo por vez.',
  FILE_TOO_LARGE: 'O arquivo excede o limite de tamanho do servidor.',
  INVALID_MULTIPART: 'O envio é inválido. Selecione o arquivo novamente.',
  STORAGE_WRITE_FAILED: 'Não foi possível armazenar o documento. Tente novamente.',
  DOCUMENT_NOT_FOUND: 'Documento não encontrado. Atualize a lista.',
  STORAGE_READ_FAILED: 'O arquivo está indisponível para download.',
};

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(errorMessages[body?.error?.code] || 'Não foi possível concluir a operação. Tente novamente.');
  }
  return response;
}

export async function listDocuments({ signal } = {}) {
  const response = await request('/documents', { signal });
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', { method: 'POST', body });
  const result = await response.json();
  return result.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}