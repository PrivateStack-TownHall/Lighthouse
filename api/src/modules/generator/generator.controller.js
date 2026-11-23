import { sendSuccess, sendCreated, sendPaginated } from '../../common/contract/response.js';

export const createGeneratorController = (service) => ({
  options: async (_req, res) => sendSuccess(res, service.options()),
  check: async (req, res) => sendSuccess(res, service.check(req.valid.body.config), 'Checked'),
  generate: async (req, res) => sendCreated(res, await service.run(req.valid.body.config, { projectId: req.valid.body.projectId, user: req.user }), 'Generated'),
  list: async (req, res) => { const { items, pagination } = await service.list(req.valid.query); sendPaginated(res, items, pagination); },
});
