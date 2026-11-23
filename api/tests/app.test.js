import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJsonStore } from '../src/database/json-store.js';
import { createApp } from '../src/app.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { JWT_SECRET: 'test-secret-test-secret-test-secret-123', CORS_ORIGIN: 'http://localhost:5102' };
let server; let base; let dir; let store; let tokens = {};
const example = JSON.parse(await readFile(join(apiRoot, 'kit/library/examples/vibedesk.config.json'), 'utf8'));

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lighthouse-db-'));
  store = createJsonStore(dir);
  const { app, services } = await createApp({ env, store, kitRoot: join(apiRoot, 'kit'), authRequired: true });
  await services.auth.ensureUser({ email: 'admin@test.local', password: 'admin-password', name: 'Admin Test', role: 'ADMIN' });
  await services.auth.ensureUser({ email: 'user@test.local', password: 'user-password', name: 'User Test', role: 'USER' });
  server = app.listen(0); base = `http://127.0.0.1:${server.address().port}/api`;
  tokens.admin = (await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'admin-password' } })).body.data;
  tokens.user = (await call('POST', '/auth/login', { body: { email: 'user@test.local', password: 'user-password' } })).body.data;
});
after(async () => { server.close(); await rm(dir, { recursive: true, force: true }); });

test('login returns tokens and the user, never the hash', () => {
  assert.ok(tokens.admin.accessToken && tokens.admin.refreshToken);
  assert.equal(tokens.admin.expiresIn, 900);
  assert.deepEqual(Object.keys(tokens.admin.user).sort(), ['email', 'id', 'name', 'role']);
});

test('wrong password is 401 UNAUTHORIZED in the envelope', async () => {
  const r = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'nope' } });
  assert.equal(r.status, 401); assert.equal(r.body.error.code, 'UNAUTHORIZED'); assert.equal(r.body.success, false);
  assert.ok(r.headers.get('x-request-id'));
});

test('refresh gives a new access token; a refresh token is not an access token', async () => {
  const r = await call('POST', '/auth/refresh', { body: { refreshToken: tokens.admin.refreshToken } });
  assert.equal(r.status, 200); assert.ok(r.body.data.accessToken);
  assert.equal((await call('GET', '/auth/me', { token: tokens.admin.refreshToken })).status, 401);
  const me = await call('GET', '/auth/me', { token: r.body.data.accessToken });
  assert.equal(me.body.data.email, 'admin@test.local');
});

test('observability: health open and CONNECTED; monitoring 401 / 403 / 200', async () => {
  const h = await call('GET', '/health');
  assert.equal(h.body.data.database, 'CONNECTED'); assert.equal(h.body.data.application, 'Lighthouse – Contract Kit');
  assert.equal((await call('GET', '/monitoring')).status, 401);
  assert.equal((await call('GET', '/monitoring', { token: tokens.user.accessToken })).status, 403);
  assert.equal((await call('GET', '/monitoring', { token: tokens.admin.accessToken })).status, 200);
});

test('options come from the Contract Kit library', async () => {
  const r = await call('GET', '/options', { token: tokens.user.accessToken });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.choices.backend.map((c) => c.id), ['express', 'nestjs']);
  assert.equal(r.body.data.fixedRules.length, 22);
  assert.equal(r.body.data.outputs.length, 6);
  assert.ok(r.body.data.outputs.every((o) => o.available));
  assert.equal((await call('GET', '/options')).status, 401);
});

test('compatibility check: warn for the example, errors for an empty config', async () => {
  const ok = await call('POST', '/compatibility-checks', { token: tokens.user.accessToken, body: { config: example } });
  assert.equal(ok.body.data.level, 'warn'); assert.ok(ok.body.data.docs.length > 5);
  const bad = await call('POST', '/compatibility-checks', { token: tokens.user.accessToken, body: { config: { schemaVersion: 1 } } });
  assert.equal(bad.body.data.ok, false); assert.ok(bad.body.data.errors.length > 3);
});

test('generate: ADMIN gets the files and a history row; USER is 403; invalid is 422', async () => {
  const r = await call('POST', '/generations', { token: tokens.admin.accessToken, body: { config: example } });
  assert.equal(r.status, 201);
  assert.ok(r.body.data.files.some((f) => f.path === 'PROJECT_CONTRACT.md'));
  assert.ok(r.body.data.markdown.includes('# Project Contract: vibeDesk'));
  assert.equal((await call('POST', '/generations', { token: tokens.user.accessToken, body: { config: example } })).status, 403);
  const bad = await call('POST', '/generations', { token: tokens.admin.accessToken, body: { config: { ...example, stack: { ...example.stack, orm: 'typeorm' } } } });
  assert.equal(bad.status, 422); assert.equal(bad.body.error.code, 'UNPROCESSABLE'); assert.match(bad.body.error.details[0].message, /typeorm/);
  const list = await call('GET', '/generations', { token: tokens.user.accessToken });
  assert.equal(list.body.meta.pagination.total, 1);
});

test('projects CRUD with pagination, 404 and roles; rows stored snake_case', async () => {
  const c = await call('POST', '/projects', { token: tokens.admin.accessToken, body: { name: 'vibeDesk', config: example } });
  assert.equal(c.status, 201); const id = c.body.data.id; assert.equal(c.body.data.slug, 'vibedesk');
  const raw = (await store.read('projects'))[0]; assert.ok(raw.created_at && !raw.createdAt);
  const l = await call('GET', '/projects?limit=1&q=vibe', { token: tokens.user.accessToken });
  assert.equal(l.body.meta.pagination.total, 1); assert.equal(l.body.data[0].id, id);
  assert.equal((await call('GET', '/projects?limit=101', { token: tokens.user.accessToken })).body.error.code, 'VALIDATION_ERROR');
  const u = await call('PATCH', `/projects/${id}`, { token: tokens.admin.accessToken, body: { name: 'vibeDesk 2' } });
  assert.equal(u.body.data.slug, 'vibedesk-2');
  assert.equal((await call('PATCH', `/projects/${id}`, { token: tokens.user.accessToken, body: { name: 'x' } })).status, 403);
  assert.equal((await call('DELETE', `/projects/${id}`, { token: tokens.admin.accessToken })).body.data, null);
  const gone = await call('GET', `/projects/${id}`, { token: tokens.admin.accessToken });
  assert.equal(gone.status, 404); assert.equal(gone.body.error.code, 'NOT_FOUND');
});

test('activities merge projects and generations for STAFF/ADMIN', async () => {
  const r = await call('GET', '/activities', { token: tokens.admin.accessToken });
  assert.ok(r.body.data.some((a) => a.type === 'CONTRACT_GENERATED'));
});

test('Swagger UI is served at /api/docs', async () => {
  const res = await fetch(`${base}/docs/`);
  assert.equal(res.status, 200); assert.match(await res.text(), /swagger/i);
});
