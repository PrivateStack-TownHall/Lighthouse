import { apiClient } from '../../lib/client.js';
import { unwrapItem } from '../../lib/api-client.js';

export const fetchOptions = async () => unwrapItem((await apiClient.get('/options')).data);
export const checkConfig = async (config) => unwrapItem((await apiClient.post('/compatibility-checks', { config })).data);
