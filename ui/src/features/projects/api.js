import { apiClient } from '../../lib/client.js';
import { unwrapItem } from '../../lib/api-client.js';

export const getProject = async (id) => unwrapItem((await apiClient.get(`/projects/${id}`)).data);
export const createProject = async (body) => unwrapItem((await apiClient.post('/projects', body)).data);
export const updateProject = async ({ id, ...body }) => unwrapItem((await apiClient.patch(`/projects/${id}`, body)).data);
