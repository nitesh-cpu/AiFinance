import { sendError } from './response.js';

export function sendControllerError(res, error, operation, fallbackMessage) {
  const status = error?.code === 11000
    ? 409
    : error?.name === 'ValidationError' || error?.name === 'CastError'
      ? 400
      : 500;
  const message = status === 409
    ? 'A record with these details already exists'
    : status === 400
      ? 'Request data is invalid'
      : fallbackMessage;

  console.error(JSON.stringify({
    level: 'error',
    operation,
    requestId: res.req?.requestId,
    method: res.req?.method,
    path: res.req?.path,
    errorName: error?.name || 'Error',
    errorCode: error?.code,
  }));
  return sendError(res, status, message, null, { requestId: res.req?.requestId });
}
