import { apiClient } from '../../lib/client.js';
import { unwrapItem } from '../../lib/api-client.js';

export const generate = async ({ config, projectId }) => unwrapItem((await apiClient.post('/generations', { config, projectId })).data);
export const saveExportZip = async (id, archive) => unwrapItem((await apiClient.post(`/generations/${id}/export-zip`, archive, { headers: { 'Content-Type': 'application/zip' } })).data);
