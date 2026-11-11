const path = require('node:path');
const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');

const configuredLimit = process.env.DMS_MAX_FILE_SIZE_BYTES;
const maxFileSize = configuredLimit === undefined ? 10485760 : Number(configuredLimit);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('DMS_MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const owner = process.env.DMS_OWNER_ID || 'local-user';

function publicMetadata(document) {
  const { storageKey, ...metadata } = document;
  return metadata;
}

function createError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

async function registerDocument(file) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    if (file.size > maxFileSize) {
      throw createError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido.');
    }
    if (file.size === 0) {
      throw createError(400, 'EMPTY_FILE', 'O arquivo não pode estar vazio.');
    }

    const document = {
      id: randomUUID(),
      originalName: path.posix.basename(path.win32.basename(file.originalname)),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageKey: file.filename,
    };

    repository.save(document);
    return publicMetadata(document);
  } catch (error) {
    await repository.removeFile(file.filename).catch(() => {});
    if (error.code === 'EMPTY_FILE' || error.code === 'FILE_TOO_LARGE') throw error;
    throw createError(500, 'STORAGE_WRITE_FAILED', 'Não foi possível armazenar o documento.');
  }
}

function listDocuments() {
  return repository.findAll()
    .sort((first, second) => {
      if (first.uploadedAt !== second.uploadedAt) {
        return first.uploadedAt > second.uploadedAt ? -1 : 1;
      }
      return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
    })
    .map(publicMetadata);
}

async function getDownload(id) {
  const document = repository.findById(id);
  if (!document) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  try {
    const filePath = await repository.getReadableFilePath(document.storageKey);
    return { filePath, originalName: document.originalName };
  } catch {
    throw createError(500, 'STORAGE_READ_FAILED', 'Não foi possível ler o documento.');
  }
}

module.exports = {
  maxFileSize,
  prepareStorage: repository.prepareStorage,
  registerDocument,
  listDocuments,
  getDownload,
};