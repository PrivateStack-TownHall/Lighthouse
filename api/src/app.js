import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { requestId } from './common/middlewares/request-id.js';
import { errorHandler, notFoundHandler } from './common/middlewares/error-handler.js';
import { identify } from './common/middlewares/auth.js';
import { createObservabilityRouter } from './observability/observability.router.js';
import { allowRoles } from './observability/access.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createProjectsService } from './modules/projects/projects.service.js';
import { createProjectsRouter } from './modules/projects/projects.routes.js';
import { createGeneratorService } from './modules/generator/generator.service.js';
import { createGeneratorRouter } from './modules/generator/generator.routes.js';
import { buildOpenApi } from './docs/openapi.js';

export const APP = { name: 'Lighthouse', type: 'CONTRACT_KIT', version: '1.1.1' };

/** Order matters: requestId first, errorHandler last (express/src/app.example.js). */
export async function createApp({ env, store, kitRoot, exportDir, authRequired = false }) {
  const secret = env.JWT_SECRET;
  const auth = createAuthService({ store, secret });
  const projects = createProjectsService({ store });
  const generator = await createGeneratorService({ store, kitRoot, exportDir });

  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()), exposedHeaders: ['X-Request-Id'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApi(APP)));
  app.use('/api', identify(secret));
  app.use('/api', createObservabilityRouter({
    ...APP,
    checkDatabase: () => store.ping(),
    activitySources: [projects.activitySource, generator.activitySource],
    access: allowRoles(['ADMIN', 'STAFF'], (req) => req.user?.role),
  }));
  app.use('/api/auth', createAuthRouter({ service: auth, secret }));
  app.use('/api/projects', createProjectsRouter({ service: projects, secret, authRequired }));
  app.use('/api', createGeneratorRouter({ service: generator, secret, authRequired }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, services: { auth, projects, generator } };
}
