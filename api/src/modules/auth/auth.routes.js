import { Router } from 'express';
import { validate, asyncHandler } from '../../common/middlewares/validate.js';
import { authenticate } from '../../common/middlewares/auth.js';
import { loginSchema, refreshSchema } from './auth.schema.js';
import { createAuthController } from './auth.controller.js';

export function createAuthRouter({ service, secret }) {
  const c = createAuthController(service);
  const router = Router();
  router.post('/login', validate(loginSchema), asyncHandler(c.login));
  router.post('/refresh', validate(refreshSchema), asyncHandler(c.refresh));
  router.get('/me', authenticate(secret), asyncHandler(c.me));
  return router;
}
