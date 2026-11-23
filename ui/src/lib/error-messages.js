import { ApiError } from './api-client.js';

/** error.code -> message shown in toasts (from contract-kit/frontend/src/lib/error-messages.ts). */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check the highlighted fields.',
  BAD_REQUEST: 'The request could not be processed.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to do this.',
  NOT_FOUND: 'We could not find what you were looking for.',
  CONFLICT: 'This already exists or was changed by someone else.',
  UNPROCESSABLE: 'This action cannot be completed right now.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment.',
  NETWORK_ERROR: 'Cannot reach the server. Check your connection.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
};

export function toastMessageFor(error, extra = {}) {
  if (error instanceof ApiError) {
    return extra[error.code] ?? ERROR_MESSAGES[error.code] ?? error.message ?? ERROR_MESSAGES.INTERNAL_ERROR;
  }
  return ERROR_MESSAGES.INTERNAL_ERROR;
}
