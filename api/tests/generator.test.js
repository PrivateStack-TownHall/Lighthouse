import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generate, loadLibrary, OUTPUTS } from '../kit/library/generate.mjs';

const kitRoot = fileURLToPath(new URL('../kit/', import.meta.url));
let lib;
let config;
before(async () => {
  lib = await loadLibrary(kitRoot);
  config = JSON.parse(await readFile(new URL('../kit/library/examples/example-cms.config.json', import.meta.url), 'utf8'));
});

test('example packages use the neutral project identity', async () => {
  for (const filename of ['example-cms.config.json', 'example-cms-nest-next.config.json']) {
    const request = JSON.parse(await readFile(new URL(`../kit/library/examples/${filename}`, import.meta.url), 'utf8'));
    assert.equal(request.project.name, 'Example CMS');
    const result = generate(request, lib);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.match(result.files['PROJECT_CONTRACT.md'], /# Project Contract: Example CMS/);
    assert.equal(JSON.parse(result.files['lighthouse.config.json']).project.slug, 'example-cms');
  }
});

test('frontend-only generates every selected document without local backend scaffolding', () => {
  for (const frontend of ['react-vite', 'nextjs']) {
    const request = { ...config, preset: 'custom', project: { ...config.project, type: 'frontend', folders: { ui: 'client', api: null } },
      stack: { language: 'typescript', frontend, css: 'tailwindcss', backend: null, orm: null, database: null, tools: ['axios', 'tanstack-query'] }, outputs: OUTPUTS };
    const result = generate(request, lib);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    for (const output of OUTPUTS.filter((id) => id.endsWith('.md'))) assert.ok(result.files[output], output);
    assert.ok(result.files['PROMPTS/01-scaffold.md']);
    assert.match(result.files['ARCHITECTURE.md'], /client\//);
    if (frontend === 'react-vite') {
      assert.match(result.files['ARCHITECTURE.md'], /[├└]─ ui\/\s+# primitives/);
      assert.doesNotMatch(result.files['ARCHITECTURE.md'], /[├└]─ client\/\s+# primitives/);
    }
    assert.match(result.files['SYSTEM_DESIGN.md'], /components\/ui\//);
    assert.doesNotMatch(Object.values(result.files).filter((value) => typeof value === 'string').join('\n'), /api\/src|db:migrate|DATABASE_URL=|JWT_SECRET=/);
    assert.ok(Object.keys(result.files).filter((file) => file.startsWith('PROMPTS/')).every((file) => !/database|api-foundation|\d+-auth/.test(file)));
    assert.deepEqual(generate(request, lib).files, result.files);
    const manifest = JSON.parse(result.files['lighthouse.manifest.json']);
    assert.ok(manifest.docs.every((doc) => !['express', 'nestjs', 'prisma', 'sequelize', 'postgresql', 'bcryptjs', 'jsonwebtoken'].includes(doc.id)));
  }
});

test('FR-015 port assignments drive API-only documents and reject ambiguous values', () => {
  const request = { ...config, preset: 'custom', project: { ...config.project, type: 'api', category: undefined, nn: undefined, folders: { api: 'core', ui: null } },
    stack: { language: 'typescript', frontend: null, css: null, backend: 'nestjs', orm: 'prisma', database: 'postgresql', tools: [] },
    customRules: [{ text: 'API: 3200\nDB: 2200', overrides: ['FR-015'], reason: 'Custom number' }], outputs: OUTPUTS };
  const result = generate(request, lib);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.files['PROJECT_CONTRACT.md'], /Base URL: `http:\/\/localhost:3200\/api`/);
  assert.match(result.files['PROJECT_CONTRACT.md'], /API 3200 · DB 2200/);
  assert.match(result.files['MASTER_PROMPT.md'], /PORT=3200/);
  assert.match(result.files['MASTER_PROMPT.md'], /localhost:2200/);
  assert.match(result.files['PROMPTS/01-scaffold.md'], /Use API 3200 and database 2200/);
  assert.match(result.files['docs/PORTS.md'], /Assigned by FR-015 override/);
  assert.doesNotMatch(result.files['SYSTEM_DESIGN.md'], /:3CNN|:2CNN/);
  for (const text of ['API: nope\nDB: 2200', 'API: 3200\nDB: 3200', 'API: 70000\nDB: 2200']) {
    const invalid = generate({ ...request, customRules: [{ ...request.customRules[0], text }] }, lib);
    assert.equal(invalid.ok, false, text);
  }
});

test('FR-015 assigns only the ports applicable to web and frontend projects', () => {
  const web = generate({ ...config, preset: 'custom', customRules: [{ text: 'API: 3109\nUI: 5109\nDB: 2109', overrides: ['FR-015'], reason: 'Assigned ports' }] }, lib);
  assert.equal(web.ok, true, JSON.stringify(web.errors));
  assert.match(web.files['PROJECT_CONTRACT.md'], /API 3109 · UI 5109 · DB 2109/);
  assert.match(web.files['PROMPTS/01-scaffold.md'], /Use API 3109, UI 5109 and database 2109/);
  assert.match(web.files['docs/PORTS.md'], /Assigned by FR-015 override/);
  const frontend = generate({ ...config, preset: 'custom', project: { ...config.project, type: 'frontend', category: undefined, nn: undefined, folders: { ui: 'robot', api: null } },
    stack: { language: 'typescript', frontend: 'react-vite', css: 'tailwindcss', backend: null, orm: null, database: null, tools: [] },
    customRules: [{ text: 'UI: 5307', overrides: ['FR-015'], reason: 'Assigned frontend port' }], outputs: OUTPUTS }, lib);
  assert.equal(frontend.ok, true, JSON.stringify(frontend.errors));
  assert.match(frontend.files['PROJECT_CONTRACT.md'], /Frontend development port: `5307`/);
  assert.match(frontend.files['docs/PORTS.md'], /Assigned: 5307/);
  assert.doesNotMatch(frontend.files['ARCHITECTURE.md'], /components\/robot\//);
});

test('project identity follows each configuration without carrying another project name', () => {
  const first = generate({ ...config, project: { ...config.project, name: 'Pearl Forager', slug: 'pearl-forager', description: 'Pearl discovery workspace' } }, lib);
  const second = generate({ ...config, project: { ...config.project, name: 'AIssistante', slug: 'aissistante', description: 'Robot assistant interface' } }, lib);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.match(first.files['PROJECT_CONTRACT.md'], /Pearl discovery workspace/);
  assert.doesNotMatch(first.files['PROJECT_CONTRACT.md'], /Robot assistant interface/);
  assert.match(second.files['PROJECT_CONTRACT.md'], /Robot assistant interface/);
  assert.doesNotMatch(second.files['PROJECT_CONTRACT.md'], /Pearl discovery workspace/);
});

test('custom folders appear in full-stack and backend-only output without changing API routes', () => {
  for (const type of ['web-app', 'api']) {
    const request = { ...config, project: { ...config.project, type, category: type === 'api' ? 2 : 1, folders: { api: 'service', ui: type === 'api' ? null : 'client' } },
      stack: { ...config.stack, ...(type === 'api' && { frontend: null, css: null, tools: [] }) } };
    const result = generate(request, lib);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.match(result.files['ARCHITECTURE.md'], /service\//);
    assert.match(result.files['PROJECT_CONTRACT.md'], /service\/src/);
    assert.match(result.files['PROJECT_CONTRACT.md'], /\/api\/health/);
    assert.doesNotMatch(result.files['PROJECT_CONTRACT.md'], /\/service\/health/);
    if (type === 'web-app') {
      assert.match(result.files['ARCHITECTURE.md'], /client\//);
      assert.match(result.files['MASTER_PROMPT.md'], /npm create vite@latest client/);
    }
    else assert.doesNotMatch(result.files['PROMPTS/01-scaffold.md'], /API at the root|UI:/);
  }
});

test('folder paths, reserved names and case-insensitive collisions are rejected', () => {
  for (const folder of ['../outside', '/tmp', 'two/parts', '', 'CON', 'docs', 'contract-kit']) {
    const result = generate({ ...config, project: { ...config.project, folders: { api: folder, ui: 'client' } } }, lib);
    assert.equal(result.ok, false, folder);
    assert.ok(result.errors.some((message) => message.startsWith('`project.folders.api`')));
  }
  const collision = generate({ ...config, project: { ...config.project, folders: { api: 'App', ui: 'app' } } }, lib);
  assert.equal(collision.ok, false);
  const invalidFrontend = generate({ ...config, project: { ...config.project, type: 'frontend' } }, lib);
  assert.equal(invalidFrontend.ok, false);
  assert.ok(invalidFrontend.errors.some((message) => message.startsWith('`stack.backend`')));
});

test('swapping canonical folder names rewrites scaffold commands only once', () => {
  const result = generate({ ...config, project: { ...config.project, folders: { api: 'ui', ui: 'api' } } }, lib);
  assert.equal(result.ok, true);
  assert.match(result.files['PROMPTS/01-scaffold.md'], /npm create vite@latest api/);
  assert.match(result.files['PROJECT_CONTRACT.md'], /ui\/src\/common/);
  assert.match(result.files['PROJECT_CONTRACT.md'], /api\/src\/lib/);
  assert.match(result.files['PROJECT_CONTRACT.md'], /\/api\/health/);
  assert.doesNotMatch(Object.values(result.files).join('\n'), /__LIGHTHOUSE_(API|UI)_FOLDER__/);
});

test('nested prompt templates use portable slash keys and generate real prompt files', () => {
  assert.ok(lib.templates['prompts/step.md']);
  assert.ok(lib.templates['prompts/00-INDEX.md']);
  assert.ok(Object.keys(lib.templates).every((key) => !key.includes('\\')));
  assert.ok(Object.values(lib.docs).every((doc) => !doc.path.includes('\\')));
  const result = generate({ ...config, outputs: ['PROMPTS/'] }, lib);
  assert.equal(result.ok, true);
  assert.match(result.files['PROMPTS/00-INDEX.md'], /01-scaffold\.md/);
  assert.ok(Object.keys(result.files).some((path) => path.startsWith('PROMPTS/') && path.includes('feature-')));
});

test('System Design and Development Standards generate independently for web and API projects', () => {
  for (const apiOnly of [false, true]) {
    const selected = apiOnly ? {
      ...config,
      project: { ...config.project, type: 'api', category: 2 },
      stack: { ...config.stack, frontend: null, css: null, tools: [] },
    } : config;
    for (const output of ['SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md']) {
      const request = { ...selected, outputs: [output] };
      const result = generate(request, lib);
      assert.equal(result.ok, true, JSON.stringify(result.errors));
      assert.deepEqual(Object.keys(result.files).filter((path) => !path.startsWith('docs/')).sort(), [output, 'lighthouse.config.json', 'lighthouse.manifest.json'].sort());
      assert.ok(result.files['docs/DEFINITION_OF_DONE.md']);
      const content = result.files[output];
      assert.ok(content.includes(selected.project.name));
      assert.doesNotMatch(content, /\{\{[a-zA-Z0-9_.]+\}\}/);
      if (output === 'SYSTEM_DESIGN.md') {
        assert.match(content, /erDiagram/);
        assert.match(content, /POST.*\/api\/auth\/login/);
        assert.match(content, /The controller reads/);
        assert.match(content, /FEATURE_1/);
        assert.ok(content.includes(selected.project.features[0].name));
      } else {
        assert.match(content, /FR-001/);
        assert.match(content, /Naming conventions/);
        assert.match(content, /Implementation responsibilities/);
      }
      assert.deepEqual(generate(request, lib).files, result.files);
    }
  }
});

test('standalone packages include their specifications across supported project modes', () => {
  const requests = [
    { ...config, project: { ...config.project, features: undefined } },
    { ...config, stack: { ...config.stack, language: 'typescript', backend: 'nestjs', orm: 'prisma', frontend: 'nextjs' } },
    { ...config, project: { ...config.project, type: 'api', category: 2, features: [] }, stack: { ...config.stack, frontend: null, css: null, tools: [] } },
    { ...config, project: { ...config.project, type: 'frontend', category: undefined, nn: undefined, features: [] }, stack: { ...config.stack, backend: null, orm: null, database: null } },
    { ...config, stack: { ...config.stack, database: 'mysql', css: 'bootstrap' } },
    { ...config, stack: { ...config.stack, database: 'mongodb', orm: 'mongoose' } },
  ];
  for (const request of requests) {
    const result = generate({ ...request, outputs: OUTPUTS }, lib);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    for (const path of ['docs/PROJECT_CONTRACT.md', 'docs/ARCHITECTURE.md', 'docs/STACK.md', 'docs/DEFINITION_OF_DONE.md', 'docs/PORTS.md']) assert.ok(result.files[path], path);
    for (const [path, content] of Object.entries(result.files)) {
      assert.doesNotMatch(content, /contract[- ]kit|\bthe kit\b|\bv1(?:\.\d+)?\b|3[-–]7|must-have features|release-v1|feature-template/i, path);
      if (path.endsWith('.md')) for (const match of content.matchAll(/`(docs\/[A-Z_]+\.md)`/g)) assert.ok(result.files[match[1]], `${path} requires ${match[1]}`);
    }
    const dod = result.files['docs/DEFINITION_OF_DONE.md'];
    assert.ok(dod.includes(request.project.description));
    assert.match(dod, /feature list is optional/i);
    assert.match(dod, /Verification record/);
    assert.doesNotMatch(dod, /\[x\]/i);
    if (request.project.type === 'frontend') assert.doesNotMatch(dod, /Database setup|Authentication and role restrictions/);
    if (request.project.type === 'api') assert.doesNotMatch(dod, /Keyboard access|loading, empty/);
    assert.deepEqual(generate({ ...request, outputs: OUTPUTS }, lib).files, result.files);
    const manifest = JSON.parse(result.files['lighthouse.manifest.json']);
    assert.ok(manifest.files.includes('docs/DEFINITION_OF_DONE.md'));
  }
});

test('feature lists are optional and do not impose a count or generic resource', () => {
  for (const features of [undefined, [], config.project.features.slice(0, 1), Array.from({ length: 8 }, (_, i) => ({ name: `Item ${i}`, resource: `items-${i}`, description: `Requested outcome ${i}` }))]) {
    const result = generate({ ...config, project: { ...config.project, features }, outputs: OUTPUTS }, lib);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    if (!features?.length) {
      assert.ok(result.files['PROMPTS/06-implementation.md']);
      assert.doesNotMatch(result.files['PROJECT_CONTRACT.md'], /\/api\/<resource>/);
    }
  }
  const malformed = generate({ ...config, project: { ...config.project, features: [{ name: 'Incomplete' }] } }, lib);
  assert.equal(malformed.ok, false);
  assert.ok(malformed.errors.some((message) => message.includes('needs a name and a description')));
});

test('prompt-only exports carry their own references and revised FR-021', () => {
  const result = generate({ ...config, project: { ...config.project, features: [] }, outputs: ['PROMPTS/'] }, lib);
  assert.equal(result.ok, true);
  assert.equal(result.files['PROJECT_CONTRACT.md'], undefined);
  assert.ok(result.files['docs/PROJECT_CONTRACT.md']);
  assert.match(result.files['PROMPTS/02-api-foundation.md'], /Create `api\/src\/common\//);
  assert.match(result.files['PROMPTS/05-ui-foundation.md'], /Implement `ui\/src\/lib\/api-client/);
  assert.match(result.files['docs/PROJECT_CONTRACT.md'], /FR-021.*acceptance criteria.*feature lists are optional/);
  assert.ok(result.files['PROMPTS/07-verification.md']);
});
