import { randomUUID } from 'node:crypto';

/** Mandatory: reuse the incoming X-Request-Id or create one, and echo it back. */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  req.requestId = value && value.length <= 100 ? value : `req_${randomUUID()}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
