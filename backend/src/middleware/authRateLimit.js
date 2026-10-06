import { sendError } from '../utils/response.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;
const MAX_CLIENTS = 10_000;
const requestsByClient = new Map();

export function authRateLimit(req, res, next) {
  const now = Date.now();
  const client = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = requestsByClient.get(client);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    requestsByClient.set(client, entry);
  }

  if (requestsByClient.size > MAX_CLIENTS) {
    for (const [key, value] of requestsByClient) {
      if (value.resetAt <= now || requestsByClient.size > MAX_CLIENTS) requestsByClient.delete(key);
    }
  }

  if (entry.count >= MAX_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return sendError(res, 429, 'Too many authentication attempts. Try again later.');
  }

  entry.count += 1;
  return next();
}
