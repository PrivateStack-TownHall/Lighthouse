import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { z } from 'zod';
import { requestId } from '../src/common/middlewares/request-id.js';
import { errorHandler, notFoundHandler } from '../src/common/middlewares/error-handler.js';
import { validate, asyncHandler } from '../src/common/middlewares/validate.js';
import { createObservabilityRouter } from '../src/observability/observability.router.js';
import { allowRoles } from '../src/observability/access.js';
import { AppError, sendPaginated, sendCreated } from '../src/common/contract/response.js';
import { buildPagination, paginationQuerySchema, parseSort } from '../src/common/pagination/pagination.js';
import { loadEnv, envSchema } from '../src/common/config/env.js';

const STAFF = { 'x-test-role': 'STAFF' };
let server;
let base;
let dbUp = true;

before(async () => {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use(
    '/api',
    createObservabilityRouter({
      name: 'Test App',
      type: 'TEST',
      version: '9.9.9',
      access: allowRoles(['ADMIN', 'STAFF'], (req) => req.headers['x-test-role']),
      checkDatabase: async () => {
        if (!dbUp) throw new Error('db down');
      },
      activitySources: [
        { collect: async () => [{ id: 'order-1', type: 'ORDER_CREATED', entity: 'Order', title: '#1', description: 'Order PENDING', createdAt: '2026-11-22T10:00:00.000Z' }] },
        { collect: async () => [{ id: 'product-9', type: 'PRODUCT_CREATED', entity: 'Product', title: 'Espresso', description: 'New product created', createdAt: new Date('2026-11-22T12:00:00.000Z') }] },
      ],
    }),
  );
  app.get('/api/items', validate(paginationQuerySchema, 'query'), (req, res) => {
    const { page, limit } = req.valid.query;
    sendPaginated(res, [{ id: 1 }], buildPagination(45, page, limit));
  });
  app.post('/api/items', validate(z.object({ name: z.string().min(2) })), (req, res) =>
    sendCreated(res, { id: 'x', name: req.valid.body.name }),
  );
  app.get('/api/boom', asyncHandler(async () => { throw new AppError(409, 'Already there', 'SLOT_TAKEN'); }));
  app.get('/api/crash', () => { throw new Error('secret internals'); });
  app.use(notFoundHandler);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const isEnvelope = (b) =>
  ['success', 'message', 'data', 'meta', 'error', 'requestId'].every((k) => k in b);

test('success envelope + request id header', async () => {
  const res = await fetch(`${base}/api/health`, { headers: { 'X-Request-Id': 'abc-123' } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(isEnvelope(body));
  assert.equal(body.success, true);
  assert.equal(body.error, null);
  assert.equal(body.requestId, 'abc-123');
  assert.equal(res.headers.get('x-request-id'), 'abc-123');
});

test('health reports UP, then DOWN when the database is unreachable', async () => {
  let body = await (await fetch(`${base}/api/health`)).json();
  assert.equal(body.data.status, 'UP');
  assert.equal(body.data.application, 'Test App');
  assert.equal(body.data.database, 'CONNECTED');
  dbUp = false;
  body = await (await fetch(`${base}/api/health`)).json();
  assert.equal(body.data.status, 'DOWN');
  assert.equal(body.data.database, 'DISCONNECTED');
  dbUp = true;
});

test('monitoring exposes node, memory and database latency', async () => {
  const body = await (await fetch(`${base}/api/monitoring`, { headers: STAFF })).json();
  assert.ok(body.data.node.version.startsWith('v'));
  assert.equal(typeof body.data.memory.heapUsed, 'number');
  assert.equal(body.data.database.status, 'CONNECTED');
  assert.equal(typeof body.data.database.latency, 'number');
});

test('generates a request id when none is sent', async () => {
  const body = await (await fetch(`${base}/api/version`)).json();
  assert.match(body.requestId, /^req_/);
});

test('/api/public is available', async () => {
  const body = await (await fetch(`${base}/api/public`)).json();
  assert.equal(body.data.docsUrl, '/api/docs');
});

test('/api/version reports name, type and version', async () => {
  const { data } = await (await fetch(`${base}/api/version`)).json();
  assert.deepEqual({ name: data.name, type: data.type, version: data.version }, { name: 'Test App', type: 'TEST', version: '9.9.9' });
});

test('activities merge all sources, newest first, tagged with the application', async () => {
  const body = await (await fetch(`${base}/api/activities`, { headers: STAFF })).json();
  assert.ok(isEnvelope(body));
  assert.deepEqual(body.data.map((a) => a.id), ['product-9', 'order-1']);
  assert.equal(body.data[0].application, 'Test App');
});

test('pagination meta and defaults', async () => {
  const body = await (await fetch(`${base}/api/items?page=2&limit=10`)).json();
  assert.deepEqual(body.meta.pagination, { page: 2, limit: 10, total: 45, totalPages: 5 });
});

test('limit above the maximum is a validation error', async () => {
  const res = await fetch(`${base}/api/items?limit=1000`);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(isEnvelope(body));
});

test('created uses 201 and default message', async () => {
  const res = await fetch(`${base}/api/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'ok' }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.message, 'Created');
});

test('domain AppError keeps its code', async () => {
  const res = await fetch(`${base}/api/boom`);
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.error.code, 'SLOT_TAKEN');
});

test('unknown route is NOT_FOUND envelope', async () => {
  const res = await fetch(`${base}/api/nope`);
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('malformed JSON is BAD_REQUEST', async () => {
  const res = await fetch(`${base}/api/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bad',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'BAD_REQUEST');
});

test('unexpected errors are INTERNAL_ERROR and hide internals in production', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/api/crash`);
  const body = await res.json();
  process.env.NODE_ENV = 'test';
  assert.equal(res.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.deepEqual(body.error.details, []);
});

test('parseSort whitelists fields', () => {
  assert.deepEqual(parseSort('-price', ['price']), ['price', 'DESC']);
  assert.deepEqual(parseSort('password', ['price']), ['createdAt', 'DESC']);
});

test('env schema rejects a short JWT secret', () => {
  const r = envSchema.safeParse({ PORT: '3101', DATABASE_URL: 'x', JWT_SECRET: 'short', CORS_ORIGIN: 'x' });
  assert.equal(r.success, false);
  const ok = loadEnv({ PORT: '3101', DATABASE_URL: 'x', JWT_SECRET: 'a'.repeat(32), CORS_ORIGIN: 'x' });
  assert.equal(ok.PORT, 3101);
});

test('monitoring and activities: 401 without a role, 403 for USER, 200 for STAFF', async () => {
  for (const path of ['monitoring', 'activities']) {
    let res = await fetch(`${base}/api/${path}`);
    let body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
    assert.ok(isEnvelope(body));

    res = await fetch(`${base}/api/${path}`, { headers: { 'x-test-role': 'USER' } });
    body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.error.code, 'FORBIDDEN');

    res = await fetch(`${base}/api/${path}`, { headers: STAFF });
    assert.equal(res.status, 200);
  }
});

test('health, version and public stay open', async () => {
  for (const path of ['health', 'version', 'public']) {
    assert.equal((await fetch(`${base}/api/${path}`)).status, 200);
  }
});

test('createObservabilityRouter refuses to start without `access`', () => {
  assert.throws(() => createObservabilityRouter({ name: 'x' }), /`access` is required/);
});

test('helpers: masking, slug and UTC ISO', async () => {
  const { maskName, maskEmail, slugify, toIsoUtc } = await import('../src/helpers/index.js');
  assert.equal(maskName('Budi Santoso'), 'Budi S.');
  assert.equal(maskName('  Siti '), 'Siti');
  assert.equal(maskName(null), '');
  assert.equal(maskEmail('john@example.com'), 'j***@example.com');
  assert.equal(maskEmail('nope'), '');
  assert.equal(slugify('Kopi Susu Gula Aren!'), 'kopi-susu-gula-aren');
  assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
  assert.equal(toIsoUtc('2026-11-22T14:00:00Z'), '2026-11-22T14:00:00.000Z');
  assert.throws(() => toIsoUtc('not a date'), RangeError);
});
