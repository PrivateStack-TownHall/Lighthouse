import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJsonStore } from '../src/database/json-store.js';
import { createApp } from '../src/app.js';
import { buildOpenApi } from '../src/docs/openapi.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { JWT_SECRET: 'test-secret-test-secret-test-secret-123', CORS_ORIGIN: 'http://localhost:5102' };
let server; let base; let dir; let exportDir; let store; let tokens = {};
const example = JSON.parse(await readFile(join(apiRoot, 'kit/library/examples/example-cms.config.json'), 'utf8'));

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lighthouse-db-'));
  exportDir = join(dir, 'generated-results');
  store = createJsonStore(dir);
  const { app, services } = await createApp({ env, store, kitRoot: join(apiRoot, 'kit'), exportDir, authRequired: true });
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
  assert.equal(h.body.data.database, 'CONNECTED'); assert.equal(h.body.data.application, 'Lighthouse');
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

test('compatibility check: supported for the documented combination, errors for an empty config', async () => {
  const ok = await call('POST', '/compatibility-checks', { token: tokens.user.accessToken, body: { config: example } });
  assert.equal(ok.body.data.level, 'supported'); assert.ok(ok.body.data.docs.length > 5);
  const bad = await call('POST', '/compatibility-checks', { token: tokens.user.accessToken, body: { config: { schemaVersion: 1 } } });
  assert.equal(bad.body.data.ok, false); assert.ok(bad.body.data.errors.length > 3);
});

test('generate: ADMIN gets the files and a history row; USER is 403; invalid is 422', async () => {
  const r = await call('POST', '/generations', { token: tokens.admin.accessToken, body: { config: example } });
  assert.equal(r.status, 201);
  assert.ok(r.body.data.files.some((f) => f.path === 'PROJECT_CONTRACT.md'));
  assert.ok(r.body.data.markdown.includes('# Project Contract: Example CMS'));
  assert.equal((await call('POST', '/generations', { token: tokens.user.accessToken, body: { config: example } })).status, 403);
  const bad = await call('POST', '/generations', { token: tokens.admin.accessToken, body: { config: { ...example, stack: { ...example.stack, orm: 'typeorm' } } } });
  assert.equal(bad.status, 422); assert.equal(bad.body.error.code, 'UNPROCESSABLE'); assert.match(bad.body.error.details[0].message, /typeorm/);
  const list = await call('GET', '/generations', { token: tokens.user.accessToken });
  assert.equal(list.body.meta.pagination.total, 1);
});

test('ZIP is saved only on export, with the same bytes and the standard response contract', async () => {
  await assert.rejects(readdir(exportDir), { code: 'ENOENT' });
  const generation = await call('POST', '/generations', { token: tokens.admin.accessToken, body: { config: example } });
  assert.equal(generation.status, 201);
  await assert.rejects(readdir(exportDir), { code: 'ENOENT' });
  const id = generation.body.data.id;
  const archive = Buffer.from('UEsDBBQAAAAIAASheF0PSvkQCgAAAAgAAAAaAAAAc2FtcGxlL1BST0pFQ1RfQ09OVFJBQ1QubWRzzs8rKUpMLgEAUEsBAhQAFAAAAAgABKF4XQ9K+RAKAAAACAAAABoAAAAAAAAAAAAAAIABAAAAAHNhbXBsZS9QUk9KRUNUX0NPTlRSQUNULm1kUEsFBgAAAAABAAEASAAAAEIAAAAAAA==', 'base64');
  const send = (path, token, body = archive) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/zip', ...(token && { authorization: `Bearer ${token}` }) }, body,
  });
  assert.equal((await send(`/generations/${id}/export-zip`)).status, 401);
  assert.equal((await send(`/generations/${id}/export-zip`, tokens.user.accessToken)).status, 403);
  assert.equal((await send(`/generations/${id}/export-zip`, tokens.admin.accessToken, Buffer.from('not-a-zip'))).status, 400);
  assert.equal((await send(`/generations/${randomUUID()}/export-zip`, tokens.admin.accessToken)).status, 404);
  await assert.rejects(readdir(exportDir), { code: 'ENOENT' });
  const saved = await send(`/generations/${id}/export-zip`, tokens.admin.accessToken);
  const response = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(response.success, true);
  assert.equal(response.error, null);
  assert.equal(response.meta, null);
  assert.ok(response.requestId);
  assert.match(response.data.filename, /^example-cms-[0-9a-f-]+\.zip$/);
  assert.deepEqual(await readdir(exportDir), [response.data.filename]);
  assert.deepEqual(await readFile(join(exportDir, response.data.filename)), archive);
});

test('projects CRUD with pagination, 404 and roles; rows stored snake_case', async () => {
  const c = await call('POST', '/projects', { token: tokens.admin.accessToken, body: { name: 'Example CMS', config: example } });
  assert.equal(c.status, 201); const id = c.body.data.id; assert.equal(c.body.data.slug, 'example-cms');
  const raw = (await store.read('projects'))[0]; assert.ok(raw.created_at && !raw.createdAt);
  const l = await call('GET', '/projects?limit=1&q=example', { token: tokens.user.accessToken });
  assert.equal(l.body.meta.pagination.total, 1); assert.equal(l.body.data[0].id, id);
  assert.equal((await call('GET', '/projects?limit=101', { token: tokens.user.accessToken })).body.error.code, 'VALIDATION_ERROR');
  const u = await call('PATCH', `/projects/${id}`, { token: tokens.admin.accessToken, body: { name: 'Example CMS 2' } });
  assert.equal(u.body.data.slug, 'example-cms-2');
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
  const operation = buildOpenApi({ name: 'Lighthouse', version: '1.1.1' }).paths['/generations/{id}/export-zip'].post;
  assert.ok(operation.requestBody.content['application/zip']);
  assert.ok(operation.responses[200].content['application/json']);
});
