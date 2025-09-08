function ok(res, data = null, message = null, status = 200) {
    return res.status(status).json({ success: true, data, message });
  }
  
  function fail(res, errorCode, message, status = 400, details = null) {
    return res.status(status).json({ success: false, errorCode, message, details });
  }
  
  class AppError extends Error {
    constructor(message, { status = 400, code = 'GENERIC_ERROR', details = null } = {}) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  
  module.exports = { ok, fail, AppError };