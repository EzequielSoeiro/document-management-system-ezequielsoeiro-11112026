const { randomUUID } = require('node:crypto');
const multer = require('multer');
const service = require('../services/documentService');

const receiveFile = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      service.prepareStorage().then(directory => callback(null, directory), callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: service.maxFileSize + 1, files: 1 },
}).single('file');

function sendError(res, error) {
  return res.status(error.status).json({
    error: { code: error.code, message: error.message },
  });
}

function upload(req, res) {
  receiveFile(req, res, async error => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, { status: 413, code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
        return sendError(res, { status: 400, code: 'UNEXPECTED_FILE', message: 'Envie apenas um arquivo no campo file.' });
      }
      if (error instanceof multer.MulterError || /multipart|boundary|unexpected end of (form|file)/i.test(error.message)) {
        return sendError(res, { status: 400, code: 'INVALID_MULTIPART', message: 'Envio de arquivo inválido.' });
      }
      return sendError(res, { status: 500, code: 'STORAGE_WRITE_FAILED', message: 'Não foi possível armazenar o documento.' });
    }

    try {
      const document = await service.registerDocument(req.file);
      res.status(201).json({ document });
    } catch (uploadError) {
      sendError(res, uploadError);
    }
  });
}

function list(req, res) {
  res.json({ documents: service.listDocuments() });
}

async function download(req, res) {
  try {
    const { filePath, originalName } = await service.getDownload(req.params.id);
    res.set('Content-Type', 'application/octet-stream');
    res.download(filePath, originalName, error => {
      if (!error) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      sendError(res, { status: 500, code: 'STORAGE_READ_FAILED', message: 'Não foi possível ler o documento.' });
    });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { upload, list, download };