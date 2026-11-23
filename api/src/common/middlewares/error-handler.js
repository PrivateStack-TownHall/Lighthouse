import { ZodError } from 'zod';
import { AppError, ERROR_CODE_BY_STATUS, sendError } from '../contract/response.js';

export function notFoundHandler(req, res) {
  return sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND');
}

// Express recognises error handlers by their 4 arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return sendError(
      res,
      400,
      'Validation failed',
      'VALIDATION_ERROR',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.code, err.details);
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, 409, 'Resource already exists', 'CONFLICT');
  }
  if (err?.name === 'SequelizeValidationError') {
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', err.errors?.map((e) => ({ path: e.path, message: e.message })) ?? []);
  }
  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Malformed JSON body', 'BAD_REQUEST');
  }

  // eslint-disable-next-line no-console
  console.error(`[${req.requestId}]`, err);
  const isProd = process.env.NODE_ENV === 'production';
  return sendError(res, 500, 'Internal server error', ERROR_CODE_BY_STATUS[500] ?? 'INTERNAL_ERROR', isProd ? [] : [String(err?.message ?? err)]);
}
