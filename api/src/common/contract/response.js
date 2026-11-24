// Standard response helpers (ESM). Same envelope as the NestJS ResponseInterceptor.

export const ERROR_CODE_BY_STATUS = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
};

const DEFAULT_MESSAGES = { 200: 'OK', 201: 'Created', 202: 'Accepted' };

export function sendSuccess(res, data = null, message, statusCode = 200, meta = null) {
  return res.status(statusCode).json({
    success: true,
    message: message ?? DEFAULT_MESSAGES[statusCode] ?? 'OK',
    data: data ?? null,
    meta,
    error: null,
    requestId: res.req?.requestId,
  });
}

export const sendCreated = (res, data = null, message) => sendSuccess(res, data, message, 201);

export function sendPaginated(res, items, pagination, message) {
  return sendSuccess(res, items, message, 200, { pagination });
}

export function sendError(res, statusCode, message, code, details = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    meta: null,
    error: {
      code: code ?? ERROR_CODE_BY_STATUS[statusCode] ?? 'ERROR',
      details: Array.isArray(details) ? details : [details],
    },
    requestId: res.req?.requestId,
  });
}

/** Throw from services/controllers: throw new AppError(404, 'User not found') */
export class AppError extends Error {
  constructor(statusCode, message, code, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
