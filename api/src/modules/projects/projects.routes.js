import { Router } from 'express';
import { validate, asyncHandler } from '../../common/middlewares/validate.js';
import { authenticate, requireRoles } from '../../common/middlewares/auth.js';
import { createProjectSchema, listProjectsSchema, projectIdSchema, updateProjectSchema } from './projects.schema.js';
import { createProjectsController } from './projects.controller.js';

const READ = ['ADMIN', 'STAFF', 'USER'];
const WRITE = ['ADMIN', 'STAFF'];

export function createProjectsRouter({ service, secret, authRequired }) {
  const c = createProjectsController(service);
  const router = Router();
  const guard = (...roles) => (authRequired ? [authenticate(secret), requireRoles(...roles)] : []);
  router.get('/', ...guard(...READ), validate(listProjectsSchema, 'query'), asyncHandler(c.list));
  router.get('/:id', ...guard(...READ), validate(projectIdSchema, 'params'), asyncHandler(c.get));
  router.post('/', ...guard(...WRITE), validate(createProjectSchema), asyncHandler(c.create));
  router.patch('/:id', ...guard(...WRITE), validate(projectIdSchema, 'params'), validate(updateProjectSchema), asyncHandler(c.update));
  router.delete('/:id', ...guard(...WRITE), validate(projectIdSchema, 'params'), asyncHandler(c.remove));
  return router;
}
