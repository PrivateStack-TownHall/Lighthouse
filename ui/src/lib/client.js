import axios from 'axios';
import { createApiClient, unwrapItem } from './api-client.js';
import { session } from './session.js';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3102/api';

async function refreshAccessToken() {
  const refreshToken = session.get()?.refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 15000 });
    const data = unwrapItem(res.data);
    session.patch({ accessToken: data.accessToken });
    return data.accessToken;
  } catch {
    return null;
  }
}

/** The app's single API client. Features call it only from their own api.js. */
export const apiClient = createApiClient({
  baseURL,
  getToken: () => session.get()?.accessToken,
  onUnauthorized: () => session.set(null),
  refreshAccessToken,
});

export const API_BASE_URL = baseURL;
