import { sendSuccess } from '../../common/contract/response.js';

export const createAuthController = (service) => ({
  login: async (req, res) => sendSuccess(res, await service.login(req.valid.body), 'Signed in'),
  refresh: async (req, res) => sendSuccess(res, await service.refresh(req.valid.body), 'Token refreshed'),
  me: async (req, res) => sendSuccess(res, await service.me(req.user.id)),
});
