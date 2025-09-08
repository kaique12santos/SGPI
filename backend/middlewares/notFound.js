const { fail } = require('../helpers/response');

function notFound(req, res) {
  return fail(res, 'NOT_FOUND', 'Rota não encontrada.', 404);
}

module.exports = notFound;