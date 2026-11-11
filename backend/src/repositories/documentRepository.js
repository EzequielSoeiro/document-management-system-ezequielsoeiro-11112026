const path = require('node:path');
const fs = require('node:fs/promises');
const { constants } = require('node:fs');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

async function prepareStorage() {
  await fs.mkdir(storageDirectory, { recursive: true });
  return storageDirectory;
}

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findAll() {
  return Array.from(documents.values());
}

function findById(id) {
  return documents.get(id);
}

function getFilePath(storageKey) {
  if (!storageKey || path.basename(storageKey) !== storageKey || storageKey === '.' || storageKey === '..') {
    throw new Error('Nome de armazenamento inválido.');
  }
  return path.join(storageDirectory, storageKey);
}

async function getReadableFilePath(storageKey) {
  const filePath = getFilePath(storageKey);
  await fs.access(filePath, constants.R_OK);
  return filePath;
}

async function removeFile(storageKey) {
  await fs.unlink(getFilePath(storageKey));
}

module.exports = { prepareStorage, save, findAll, findById, getReadableFilePath, removeFile };