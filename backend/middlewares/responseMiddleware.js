const { ok, fail } = require('../helpers/response');

function attachResponseHelpers(req, res, next) {
  res.ok = (data, message = null, status = 200) => ok(res, data, message, status);
  res.fail = (code, message, status = 400, details = null) => fail(res, code, message, status, details);
  next();
}

module.exports = attachResponseHelpers;