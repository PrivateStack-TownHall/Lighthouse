import { randomUUID } from 'node:crypto';
import { AppError } from '../../common/contract/response.js';
import { buildPagination } from '../../common/pagination/pagination.js';
import { generate, loadLibrary, exportMarkdown, KIT_VERSION, OUTPUTS, PURPOSES, TYPES, DOMAINS } from '../../../kit/library/generate.mjs';

/** The six selectable outputs supported by the Contract Kit generator. */
export const OUTPUT_CATALOG = [
  { id: 'PROJECT_CONTRACT.md', title: 'Project Contract', description: 'Project overview, scope, API contract, and technical agreement.', format: 'MD' },
  { id: 'ARCHITECTURE.md', title: 'Architecture Documentation', description: 'System architecture, folder structure, and component design.', format: 'MD' },
  { id: 'SYSTEM_DESIGN.md', title: 'System Design', description: 'ERD, data flow, API design, and module relationships.', format: 'MD' },
  { id: 'DEVELOPMENT_STANDARDS.md', title: 'Development Standards', description: 'Coding conventions, naming rules, and implementation guidelines.', format: 'MD' },
  { id: 'MASTER_PROMPT.md', title: 'AI Master Prompt', description: 'The main prompt for AI Developer with full project context.', format: 'MD' },
  { id: 'PROMPTS/', title: 'Development Prompts', description: 'Step-by-step prompts for implementing each module or feature.', format: 'ZIP' },
].map((o) => ({ ...o, available: OUTPUTS.includes(o.id) }));

const today = () => new Date().toISOString().slice(0, 10);

export async function createGeneratorService({ store, kitRoot }) {
  const lib = await loadLibrary(kitRoot);
  const docMeta = (id) => {
    const d = lib.docs[id];
    return { id, name: d.fm.name, category: d.fm.category, status: d.fm.status, verifiedOn: d.fm.verified_on,
      recommended: d.fm.versions?.recommended ?? null, npmLatest: d.fm.versions?.npm_latest ?? null, unverified: d.unverified.length, requires: d.fm.requires ?? [] };
  };

  function options() {
    return {
      kitVersion: KIT_VERSION,
      levels: lib.compat.levels,
      choices: Object.fromEntries(Object.entries(lib.compat.choices).map(([cat, ids]) => [cat, ids.map(docMeta)])),
      tools: lib.compat.tools.map(docMeta),
      alwaysInclude: lib.compat.alwaysInclude.filter((i) => i !== 'core-rules'),
      toolRequires: lib.compat.toolRequires ?? {},
      presets: Object.values(lib.presets),
      fixedRules: lib.fixedRules,
      outputs: OUTPUT_CATALOG,
      purposes: Object.entries(PURPOSES).map(([id, label]) => ({ id, label })),
      types: Object.entries(TYPES).map(([id, label]) => ({ id, label })),
      domains: Object.entries(DOMAINS).map(([id, label]) => ({ id, label })),
      uiTools: ['axios', 'tanstack-query'],
    };
  }

  const withDate = (config) => ({ ...config, generatedOn: config.generatedOn ?? today() });

  /** Validation only: same rules as generate, no files kept. */
  function check(config) {
    const res = generate({ ...withDate(config), outputs: [] }, lib);
    const manifest = res.ok ? JSON.parse(res.files['lighthouse.manifest.json']) : null;
    return { ok: res.ok, level: res.level, errors: res.errors, problems: res.problems, docs: manifest?.docs ?? [], configHash: manifest?.configHash ?? null };
  }

  async function run(config, { projectId, user }) {
    const cfg = withDate(config);
    const res = generate(cfg, lib);
    if (!res.ok) throw new AppError(422, 'The configuration cannot be generated', 'UNPROCESSABLE', res.errors.map((message) => ({ path: 'config', message })));
    const manifest = JSON.parse(res.files['lighthouse.manifest.json']);
    const files = Object.entries(res.files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => ({ path, content, bytes: Buffer.byteLength(content) }));
    const record = await store.update('generations', (rows) => {
      const row = { id: randomUUID(), project_id: projectId ?? null, project_name: cfg.project?.name ?? '', config_hash: manifest.configHash,
        level: res.level, outputs: cfg.outputs ?? OUTPUTS, files: files.map((f) => f.path), created_by: user?.id ?? null, created_at: new Date().toISOString() };
      return { rows: [...rows, row].slice(-500), result: row };
    });
    return { id: record.id, createdAt: record.created_at, level: res.level, problems: res.problems, configHash: manifest.configHash,
      generatedOn: cfg.generatedOn, files, markdown: exportMarkdown(res.files), manifest };
  }

  async function list({ page, limit, q }) {
    const term = q?.toLowerCase();
    const rows = (await store.read('generations')).filter((r) => !term || r.project_name.toLowerCase().includes(term)).reverse();
    const items = rows.slice((page - 1) * limit, page * limit).map((r) => ({ id: r.id, projectId: r.project_id, projectName: r.project_name,
      configHash: r.config_hash, level: r.level, outputs: r.outputs, files: r.files, createdAt: r.created_at }));
    return { items, pagination: buildPagination(rows.length, page, limit) };
  }

  const activitySource = {
    collect: async (limit) => (await store.read('generations')).slice(-limit).reverse().map((r) => ({
      id: `generation-${r.id}`, type: 'CONTRACT_GENERATED', entity: 'Generation', title: r.project_name || 'Untitled',
      description: `${r.files.length} files, compatibility ${r.level.toUpperCase()}`, createdAt: r.created_at })),
  };

  return { options, check, run, list, activitySource };
}
