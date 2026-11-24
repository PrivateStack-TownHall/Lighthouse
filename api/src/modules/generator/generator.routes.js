import { Router, raw } from 'express';
import { validate, asyncHandler } from '../../common/middlewares/validate.js';
import { authenticate, requireRoles } from '../../common/middlewares/auth.js';
import { configBodySchema, generationIdSchema, listGenerationsSchema } from './generator.schema.js';
import { createGeneratorController } from './generator.controller.js';

const ANY = ['ADMIN', 'STAFF', 'USER'];
const WRITE = ['ADMIN', 'STAFF'];

/** /api/options, /api/compatibility-checks, /api/generations */
export function createGeneratorRouter({ service, secret, authRequired }) {
  const c = createGeneratorController(service);
  const router = Router();
  // AUTH_REQUIRED=false (default, local tool): open. true: token + roles, as in the auth contract.
  const guard = (...roles) => (authRequired ? [authenticate(secret), requireRoles(...roles)] : []);
  router.get('/options', ...guard(...ANY), asyncHandler(c.options));
  router.post('/compatibility-checks', ...guard(...ANY), validate(configBodySchema), asyncHandler(c.check));
  router.get('/generations', ...guard(...ANY), validate(listGenerationsSchema, 'query'), asyncHandler(c.list));
  router.post('/generations', ...guard(...WRITE), validate(configBodySchema), asyncHandler(c.generate));
  router.post('/generations/:id/export-zip', ...guard(...WRITE), validate(generationIdSchema, 'params'), raw({ type: 'application/zip', limit: '20mb' }), asyncHandler(c.saveZip));
  return router;
}
