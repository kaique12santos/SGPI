const { fail, AppError } = require('../helpers/response');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return fail(res, err.code, err.message, err.status, err.details);
  }

  if (err && err.name === 'MulterError') {
    return fail(res, 'UPLOAD_ERROR', err.message, 400);
  }

  console.error('Unhandled Error:', err);
  return fail(res, 'INTERNAL_ERROR', 'Erro interno do servidor.', 500);
}

module.exports = errorHandler;