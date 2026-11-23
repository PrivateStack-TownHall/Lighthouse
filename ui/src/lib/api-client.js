import axios from 'axios';

/**
 * From contract-kit/frontend/src/lib/api-client.ts (converted to JavaScript).
 * Standard envelope: { success, message, data, meta, error: { code, details }, requestId } (docs/CONVENTIONS.md).
 * Added here, once for the whole app: one silent retry after refreshing the access token (library/integrations/axios.md).
 */

/** Every failed call surfaces as an ApiError, whatever went wrong. */
export class ApiError extends Error {
  constructor(code, message, status, requestId, details = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * @param {{ baseURL: string, getToken?: () => string | null, onUnauthorized?: () => void,
 *           refreshAccessToken?: () => Promise<string | null> }} options
 */
export function createApiClient({ baseURL, getToken, onUnauthorized, refreshAccessToken }) {
  const client = axios.create({ baseURL, timeout: 30000 });
  let refreshing = null;

  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const body = error.response?.data;
      const status = error.response?.status ?? 0;
      const original = error.config;
      const isAuthCall = original?.url?.startsWith('/auth/');
      if (status === 401 && refreshAccessToken && original && !original._retried && !isAuthCall) {
        original._retried = true;
        refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
        const token = await refreshing;
        if (token) {
          original.headers.set('Authorization', `Bearer ${token}`);
          return client(original);
        }
      }
      if (status === 401 && !isAuthCall) onUnauthorized?.();
      if (body && typeof body === 'object' && body.error) {
        throw new ApiError(body.error.code, body.message, status, body.requestId, body.error.details);
      }
      if (!error.response) throw new ApiError('NETWORK_ERROR', 'Network error', 0);
      throw new ApiError('INTERNAL_ERROR', error.message, status);
    },
  );
  return client;
}

/** The only place that touches `response.data.data`. A malformed payload degrades to an empty result. */
export function unwrapItem(payload) {
  return payload && typeof payload === 'object' && 'data' in payload ? (payload.data ?? null) : null;
}

export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  const data = unwrapItem(payload);
  return Array.isArray(data) ? data : [];
}

export function unwrapPage(payload) {
  return { items: unwrapList(payload), pagination: payload?.meta?.pagination ?? null };
}
