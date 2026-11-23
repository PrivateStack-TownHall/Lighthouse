import { apiClient } from '../../lib/client.js';
import { unwrapItem } from '../../lib/api-client.js';

export const login = async (body) => unwrapItem((await apiClient.post('/auth/login', body)).data);
export const fetchMe = async () => unwrapItem((await apiClient.get('/auth/me')).data);
