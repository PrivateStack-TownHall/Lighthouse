import { sendSuccess, sendCreated, sendPaginated } from '../../common/contract/response.js';

export const createProjectsController = (service) => ({
  list: async (req, res) => { const { items, pagination } = await service.list(req.valid.query); sendPaginated(res, items, pagination); },
  get: async (req, res) => sendSuccess(res, await service.get(req.valid.params.id)),
  create: async (req, res) => sendCreated(res, await service.create(req.valid.body, req.user), 'Project saved'),
  update: async (req, res) => sendSuccess(res, await service.update(req.valid.params.id, req.valid.body), 'Project updated'),
  remove: async (req, res) => sendSuccess(res, await service.remove(req.valid.params.id), 'Project deleted'),
});
