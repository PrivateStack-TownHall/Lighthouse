import { Router } from 'express';
import { sendSuccess } from '../common/contract/response.js';
import { requireAccess } from './access.js';

export const PER_SOURCE_LIMIT = 5;
export const FEED_LIMIT = 30;

/**
 * Same endpoints as the NestJS ObservabilityModule.
 * Mount at /api: GET /api/health, /api/monitoring, /api/activities, /api/version, /api/public
 *
 * createObservabilityRouter({
 *   name: 'Orange LMS', type: 'LMS', version: '1.0.0',
 *   checkDatabase: async () => { await sequelize.authenticate(); },   // or prisma.$queryRaw`SELECT 1`
 *   activitySources: [{ collect: async (limit) => [{ id, type, entity, title, description, createdAt }] }],
 * })
 *
 * /monitoring and /activities disclose internals, so `access` is REQUIRED:
 *   access: allowRoles(['ADMIN', 'STAFF'], (req) => req.user?.role)   // see ./access.js
 *   access: allowAll                                                  // dev and tests only
 * /health, /version and /public stay open.
 */
export function createObservabilityRouter({
  name = process.env.APP_NAME ?? 'app',
  type = process.env.APP_TYPE ?? 'GENERIC',
  version = process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.0.0',
  checkDatabase = async () => {},
  activitySources = [],
  access,
} = {}) {
  if (typeof access !== 'function') {
    throw new Error('createObservabilityRouter: `access` is required (use allowRoles([...], resolveRole), or allowAll in dev).');
  }
  const guard = requireAccess(access);
  const router = Router();

  async function probe() {
    const start = Date.now();
    let status = 'CONNECTED';
    try {
      await checkDatabase();
    } catch {
      status = 'DISCONNECTED';
    }
    return { status, latency: Date.now() - start };
  }

  router.get('/health', async (_req, res, next) => {
    try {
      const db = await probe();
      sendSuccess(res, {
        status: db.status === 'CONNECTED' ? 'UP' : 'DOWN',
        application: name,
        database: db.status,
        version,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      });
    } catch (e) {
      next(e);
    }
  });

  router.get('/monitoring', guard, async (_req, res, next) => {
    try {
      const db = await probe();
      const memory = process.memoryUsage();
      sendSuccess(res, {
        application: name,
        node: {
          version: process.version,
          uptime: Math.floor(process.uptime()),
          platform: process.platform,
          environment: process.env.NODE_ENV ?? 'development',
        },
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
        database: db,
        response: { generatedAt: new Date().toISOString() },
      });
    } catch (e) {
      next(e);
    }
  });

  router.get('/version', (_req, res) =>
    sendSuccess(res, { name, type, version, commit: process.env.GIT_COMMIT ?? null }),
  );

  router.get('/public', (_req, res) =>
    sendSuccess(res, {
      name,
      environment: process.env.NODE_ENV ?? 'development',
      docsUrl: '/api/docs',
      serverTime: new Date().toISOString(),
    }),
  );

  /** Newest entries across all sources, newest first. One source per entity type. */
  router.get('/activities', guard, async (_req, res, next) => {
    try {
      const lists = await Promise.all(activitySources.map((s) => s.collect(PER_SOURCE_LIMIT)));
      const feed = lists
        .flat()
        .map((entry) => ({ ...entry, application: name }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, FEED_LIMIT);
      sendSuccess(res, feed);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
