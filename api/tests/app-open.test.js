// AUTH_REQUIRED=false (the default for the local tool): generator and projects work without a token;
// observability keeps its own rule (FR-006).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJsonStore } from '../src/database/json-store.js';
import { createApp } from '../src/app.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let server; let base; let dir;
const config = {
  schemaVersion: 1, preset: 'custom',
  project: { name: 'Lighthouse 123', slug: 'lighthouse-123', type: 'web-app', domain: 'cms', purpose: 'commercial', version: '1.0.0', description: 'A CMS.' },
  stack: { language: 'javascript', frontend: 'react-vite', css: 'tailwindcss', backend: 'express', orm: 'sequelize', database: 'mysql', tools: ['axios', 'tanstack-query'] },
  customRules: [], outputs: ['PROJECT_CONTRACT.md', 'ARCHITECTURE.md', 'SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md', 'MASTER_PROMPT.md', 'PROMPTS/'],
};
const call = async (method, path, body) => {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lighthouse-open-'));
  const { app } = await createApp({ env: { JWT_SECRET: 'test-secret-test-secret-test-secret-123', CORS_ORIGIN: 'http://localhost:5102' }, store: createJsonStore(dir), kitRoot: join(apiRoot, 'kit') });
  server = app.listen(0); base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); await rm(dir, { recursive: true, force: true }); });

test('options list the business categories and the new databases', async () => {
  const r = await call('GET', '/options');
  assert.equal(r.status, 200);
  assert.ok(r.body.data.domains.some((d) => d.id === 'cms'));
  assert.deepEqual(r.body.data.choices.database.map((d) => d.id), ['postgresql', 'mysql', 'mongodb']);
  assert.deepEqual(r.body.data.choices.css.map((d) => d.id), ['tailwindcss', 'bootstrap']);
});

test('generate without a token; history row has no user', async () => {
  const r = await call('POST', '/generations', { config });
  assert.equal(r.status, 201, JSON.stringify(r.body.error));
  assert.ok(r.body.data.files.some((f) => f.path === 'PROMPTS/06-feature-template.md'));
  for (const path of ['SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md']) {
    const file = r.body.data.files.find((f) => f.path === path);
    assert.ok(file.content.includes('Lighthouse 123'));
    assert.ok(r.body.data.markdown.includes(`<!-- file: ${path} -->`));
    assert.ok(r.body.data.manifest.files.includes(path));
  }
  assert.equal((await call('GET', '/generations')).body.meta.pagination.total, 1);
});

test('autosave flow: create then patch a project without a token', async () => {
  const c = await call('POST', '/projects', { name: 'Lighthouse 123', config });
  assert.equal(c.status, 201); assert.equal(c.body.data.createdBy, null);
  const u = await call('PATCH', `/projects/${c.body.data.id}`, { config: { ...config, project: { ...config.project, version: '1.0.1' } } });
  assert.equal(u.body.data.config.project.version, '1.0.1');
});

test('observability keeps its rule: /monitoring needs a token', async () => {
  assert.equal((await call('GET', '/monitoring')).status, 401);
  assert.equal((await call('GET', '/health')).body.data.database, 'CONNECTED');
});

test('frontend-only project generates all six document outputs through the API', async () => {
  const frontend = { ...config, project: { ...config.project, type: 'frontend', folders: { ui: 'web-client', api: null } },
    stack: { ...config.stack, backend: null, orm: null, database: null } };
  const r = await call('POST', '/generations', { config: frontend });
  assert.equal(r.status, 201, JSON.stringify(r.body.error));
  const architecture = r.body.data.files.find((file) => file.path === 'ARCHITECTURE.md');
  assert.match(architecture.content, /web-client\//);
  assert.doesNotMatch(architecture.content, /api\/src/);
  for (const path of frontend.outputs.filter((name) => name.endsWith('.md'))) assert.ok(r.body.data.files.some((file) => file.path === path));
});
