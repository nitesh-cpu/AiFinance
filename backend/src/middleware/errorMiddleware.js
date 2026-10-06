import { sendError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status === 413 || err.type === 'entity.too.large'
    ? 413
    : err.status === 400 || err.type === 'entity.parse.failed'
      ? 400
      : err.name === 'ValidationError' || err.name === 'CastError'
        ? 400
        : err.code === 11000
          ? 409
          : 500;
  console.error(JSON.stringify({
    level: 'error',
    event: 'request_failed',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    errorName: err.name || 'Error',
    errorCode: err.code,
  }));
  const message = statusCode === 413
    ? 'Request body is too large'
    : statusCode === 400
      ? 'Request data is invalid'
      : statusCode === 409
        ? 'A record with these details already exists'
        : 'Internal server error';
  return sendError(res, statusCode, message, null, { requestId: req.requestId });
};

export const notFound = (req, res) => {
  return sendError(res, 404, 'Route not found', null, { requestId: req.requestId });
};
