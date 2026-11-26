const { randomUUID } = require('node:crypto');

function requestContext(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413
    : error instanceof SyntaxError && error.status === 400 ? 400
    : error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error(JSON.stringify({ requestId: req.id, error: error.message }));
  return res.status(status).json({
    error: status >= 500 ? 'The service is temporarily unavailable. Please try again.'
      : status === 413 ? 'The uploaded audio exceeds the 20 MB limit.' : error.message,
    requestId: req.id,
  });
}

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
module.exports = { requestContext, errorHandler, asyncRoute };
