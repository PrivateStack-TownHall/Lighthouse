import { apiClient } from '../../lib/client.js';
import { unwrapItem } from '../../lib/api-client.js';

export const generate = async ({ config, projectId }) => unwrapItem((await apiClient.post('/generations', { config, projectId })).data);
