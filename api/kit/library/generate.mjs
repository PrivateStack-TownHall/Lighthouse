#!/usr/bin/env node
/**
 * Lighthouse – Contract Kit generator.
 *   node library/generate.mjs <config.json> <out-dir> [--md <combined.md>]
 *
 * Deterministic: the same config and the same kit always give the same bytes (no clock, no randomness;
 * the date comes from `generatedOn` in the config). Every sentence in the output comes from the kit
 * (`docs/`, `library/`, `templates/`) or from the fixed templates in `library/outputs/templates/`.
 *
 * The core (`generate(config, lib)`) is pure and has no Node imports, so the Lighthouse app can run it
 * in the browser with a bundled `lib`. Only `loadLibrary` and the CLI touch the file system.
 *
 * Outputs implemented: project contract, architecture, system design, development standards and prompts.
 */

export const KIT_VERSION = '1.3.0';
export const OUTPUTS = ['PROJECT_CONTRACT.md', 'ARCHITECTURE.md', 'SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md', 'MASTER_PROMPT.md', 'PROMPTS/'];
export const TYPES = { 'web-app': 'Full-stack (Frontend + Backend)', frontend: 'Frontend only', api: 'Backend only' };
/** Business category of the project (shown as "Category"). Port groups A1/A2/A3 stay internal and optional. */
export const DOMAINS = {
  lms: 'LMS (Learning)', cms: 'CMS (Content)', ecommerce: 'E-commerce', marketplace: 'Marketplace', erp: 'ERP', crm: 'CRM',
  pos: 'POS (Point of Sale)', hris: 'HRIS (HR)', booking: 'Booking / Reservation', inventory: 'Inventory', finance: 'Finance / Accounting',
  analytics: 'Dashboard / Analytics', 'company-profile': 'Company Profile', portal: 'Portal / Community', other: 'Other',
};
export const PURPOSES = { commercial: 'Commercial / Business', internal: 'Internal tool', personal: 'Personal', portfolio: 'Portfolio', learning: 'Learning' };
const CATEGORY = { 1: 'A1 Main Apps', 2: 'A2 APIs (no UI)', 3: 'A3 Applications' };
const LEVELS = ['supported', 'allowed', 'warn', 'unsupported'];
const LAYERS = [['language', 'Language'], ['frontend', 'Frontend'], ['css', 'CSS'], ['backend', 'Backend'], ['orm', 'ORM'], ['database', 'Database']];
const ROLES = ['ADMIN', 'STAFF', 'USER'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const coreTools = (c, compat) => compat.alwaysInclude.filter((id) => id !== 'core-rules' && (c.project.type !== 'frontend' || !['bcryptjs', 'jsonwebtoken'].includes(id)));

// ---------------------------------------------------------------- small pure helpers
export function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {}; let parent = null;
  const val = (raw) => {
    let v = raw.trim();
    if (v.startsWith('"')) return v.slice(1, v.indexOf('"', 1));
    v = v.replace(/\s+#.*$/, '');
    if (v.startsWith('[')) return v.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    return v;
  };
  for (const line of m[1].split(/\r?\n/)) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    const sub = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (top) { const v = val(top[2]); if (v === '') { out[top[1]] = {}; parent = top[1]; } else { out[top[1]] = v; parent = null; } }
    else if (sub && parent) out[parent][sub[1]] = val(sub[2]);
  }
  return out;
}

/** Body of `## <n>. ...` (or `## <title>`) up to the next `## `, trimmed. */
export function section(text, key) {
  const lines = text.split(/\r?\n/); const out = []; let on = false; let fence = false;
  const isHead = (l) => typeof key === 'number' ? l.startsWith(`## ${key}.`) : l.trim() === `## ${key}`;
  for (const l of lines) {
    if (l.startsWith('```')) fence = !fence;
    if (!fence && l.startsWith('## ')) { if (on) break; if (isHead(l)) { on = true; continue; } }
    if (on) out.push(l);
  }
  return out.join('\n').trim();
}

const tableRows = (md) => md.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).slice(1)
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

/** Replace {{a.b}} from vars; an unknown placeholder is an error, never a silent blank. */
export function fill(template, vars, name) {
  return template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`Template ${name}: unknown placeholder {{${k}}}`);
    return vars[k];
  }).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

const bullets = (items, empty = 'None.') => items.length ? items.map((i) => `- ${i}`).join('\n') : empty;
const numbered = (items) => items.map((i, n) => `${n + 1}. ${i}`).join('\n');
const checks = (items) => items.map((i) => `- [ ] ${i}`).join('\n');
const snake = (s) => s.replace(/-/g, '_');
const lead = (label, text) => (text.startsWith('```') ? `${label}:\n${text}` : `${label}: ${text}`);
const unquote = (s) => s.split(/\r?\n/).map((l) => l.replace(/^>\s?/, '')).join('\n').trim();

// ---------------------------------------------------------------- config validation
export function validateConfig(c, lib) {
  const e = [];
  const req = (cond, msg) => { if (!cond) e.push(msg); };
  req(c && typeof c === 'object', 'Config must be an object.');
  if (!c || typeof c !== 'object') return e;
  req(c.schemaVersion === 1, '`schemaVersion` must be 1.');
  req(/^\d{4}-\d{2}-\d{2}$/.test(c.generatedOn ?? ''), '`generatedOn` must be YYYY-MM-DD (the generator never reads the clock).');
  const p = c.project ?? {};
  req(typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 60, '`project.name` is required (max 60 characters).');
  req(KEBAB.test(p.slug ?? ''), '`project.slug` must be kebab-case.');
  if (p.category !== undefined) req([1, 2, 3].includes(p.category), '`project.category` (port group) must be 1, 2 or 3 when given.');
  if (p.nn !== undefined) req(p.category !== undefined && Number.isInteger(p.nn) && p.nn >= 1 && p.nn <= 99, '`project.nn` must be 1-99 and needs `project.category`.');
  if (p.domain !== undefined) req(p.domain in DOMAINS, `\`project.domain\` must be one of: ${Object.keys(DOMAINS).join(', ')}.`);
  req(/^\d+\.\d+\.\d+$/.test(p.version ?? ''), '`project.version` must be semver, e.g. 1.0.0.');
  req(p.type in TYPES, '`project.type` must be web-app, frontend or api.');
  const folders = { api: p.folders?.api ?? 'api', ui: p.folders?.ui ?? 'ui' };
  for (const layer of p.type === 'frontend' ? ['ui'] : p.type === 'api' ? ['api'] : ['api', 'ui']) {
    const folder = folders[layer];
    req(typeof folder === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(folder) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9]|docs|contract-kit)$/i.test(folder), `\`project.folders.${layer}\` must be a folder name (letters, numbers, hyphens or underscores, max 64); reserved names and paths are not allowed.`);
  }
  if (p.type === 'web-app') req(String(folders.api).toLowerCase() !== String(folders.ui).toLowerCase(), '`project.folders.ui` must differ from the backend folder.');
  if (p.category !== undefined) req((p.type === 'api') === (p.category === 2), '`project.type` "api" goes with port group 2, "web-app" with 1 or 3.');
  req(p.purpose in PURPOSES, `\`project.purpose\` must be one of: ${Object.keys(PURPOSES).join(', ')}.`);
  req(typeof p.description === 'string' && p.description.trim().length > 0 && p.description.length <= 300, '`project.description` is required (max 300 characters).');
  const f = p.features ?? [];
  req(Array.isArray(f) && f.length <= 7, '`project.features` takes at most 7 features (docs/DEFINITION_OF_DONE.md).');
  const seen = new Set();
  for (const [i, x] of (Array.isArray(f) ? f : []).entries()) {
    req(x?.name && x?.description, `\`project.features[${i}]\` needs a name and a description.`);
    if (x?.resource !== undefined) req(KEBAB.test(x.resource), `\`project.features[${i}].resource\` must be plural kebab-case (FR-004).`);
    const key = x?.resource ?? x?.name; req(!seen.has(key), `Feature "${key}" is listed twice.`); seen.add(key);
    for (const k of ['read', 'write']) if (x?.access?.[k]) req(x.access[k].every((r) => ROLES.includes(r)), `\`project.features[${i}].access.${k}\` may only use ${ROLES.join(', ')} (FR-012).`);
  }
  const s = c.stack ?? {};
  for (const [k] of LAYERS) {
    const needsUi = p.type !== 'api';
    if (k === 'frontend' || k === 'css') {
      if (needsUi) req(typeof s[k] === 'string', `\`stack.${k}\` is required for a web application.`);
      else req(s[k] == null, `\`stack.${k}\` must be empty: an API-only project has no UI.`);
    } else if (p.type === 'frontend' && ['backend', 'orm', 'database'].includes(k)) req(s[k] == null, `\`stack.${k}\` must be empty for a frontend-only project.`);
    else req(typeof s[k] === 'string', `\`stack.${k}\` is required.`);
  }
  req(s.tools === undefined || Array.isArray(s.tools), '`stack.tools` must be an array.');
  for (const [i, r] of (c.customRules ?? []).entries()) {
    req(typeof r?.text === 'string' && r.text.trim(), `\`customRules[${i}].text\` is required.`);
    for (const id of r?.overrides ?? []) {
      req(lib.fixedRules.some((fr) => fr.id === id), `\`customRules[${i}]\` overrides unknown rule ${id}.`);
      req(typeof r.reason === 'string' && r.reason.trim(), `\`customRules[${i}]\` changes ${id}: a Fixed Rule cannot be changed silently, give a \`reason\`.`);
    }
  }
  for (const o of c.outputs ?? OUTPUTS) req(OUTPUTS.includes(o), `Unknown or not yet implemented output "${o}". Available: ${OUTPUTS.join(', ')}.`);
  return e;
}

// ---------------------------------------------------------------- compatibility (same rules as resolve.mjs)
export function checkStack(c, lib) {
  const { compat, docs } = lib; const s = c.stack; const problems = [];
  const sel = {}; for (const [k] of LAYERS) if (s[k]) sel[k] = s[k];
  for (const [k, v] of Object.entries(sel)) if (!compat.choices[k]?.includes(v)) problems.push({ level: 'unsupported', message: `Unknown ${k} "${v}": there is no library document. Choose one of: ${compat.choices[k].join(', ')}.` });
  const tools = [...new Set(s.tools ?? [])];
  for (const t of tools) if (!compat.tools.includes(t)) problems.push({ level: 'unsupported', message: `Unknown tool "${t}": there is no library document. Do not invent it.` });
  for (const [t, needs] of Object.entries(compat.toolRequires ?? {})) if (tools.includes(t)) for (const n of needs) if (!sel[n]) problems.push({ level: 'unsupported', message: `Tool "${t}" needs a ${n}.` });
  const matches = (when) => Object.entries(when).every(([k, v]) => sel[k] === v);
  for (const r of compat.rules) if (matches(r.when)) problems.push({ level: r.level, message: r.message });
  const combo = compat.supportedCombos.find((x) => matches(x.match)) ?? null;
  const ids = [...new Set([...Object.values(sel), ...coreTools(c, compat), ...tools])].filter((i) => docs[i]);
  for (const id of ids) for (const r of docs[id].fm.requires ?? []) if (!ids.includes(r)) problems.push({ level: 'unsupported', message: `${docs[id].fm.name} requires ${docs[r]?.fm.name ?? r}.` });
  for (const [id, want] of Object.entries(s.versions ?? {})) {
    const rec = docs[id]?.fm.versions?.recommended ?? '';
    const major = rec.match(/^(\d+)\.x/)?.[1];
    if (!docs[id]) problems.push({ level: 'unsupported', message: `Version given for "${id}", which is not selected or has no document.` });
    else if (!major) problems.push({ level: 'warn', message: `${docs[id].fm.name} ${want}: the library recommends "${rec}", so the version cannot be checked.` });
    else if (String(want).split('.')[0] !== major) problems.push({ level: 'unsupported', message: `${docs[id].fm.name} ${want} is not supported by the library (recommended ${major}.x). Choose ${major}.x, or add it to the library first.` });
  }
  if (!combo && !problems.some((p) => p.level === 'unsupported')) problems.push({ level: 'allowed', message: c.project.type === 'frontend' ? 'Frontend-only: use the selected frontend library documents; no backend integration is generated.' : 'No kit combo document for this stack: the glue between these choices is unverified.' });
  const level = problems.reduce((w, p) => (LEVELS.indexOf(p.level) > LEVELS.indexOf(w) ? p.level : w), combo ? 'supported' : 'allowed');
  return { level, problems, combo, sel, tools, ids };
}

export function checkCustomRules(c, lib) {
  return (c.customRules ?? []).map((r, i) => {
    const id = `CR-${String(i + 1).padStart(3, '0')}`;
    const hints = [];
    for (const [fr, pats] of Object.entries(lib.ruleHints)) {
      if (fr.startsWith('_') || (r.overrides ?? []).includes(fr)) continue;
      for (const p of pats) { const m = r.text.match(new RegExp(p, 'i')); if (m) { hints.push({ fr, match: m[0] }); break; } }
    }
    return { id, ...r, overrides: r.overrides ?? [], hints };
  });
}

// ---------------------------------------------------------------- generate
export function generate(config, lib) {
  const errors = validateConfig(config, lib);
  if (errors.length) return { ok: false, level: 'unsupported', errors, problems: [], files: {} };
  const st = checkStack(config, lib);
  const rules = checkCustomRules(config, lib);
  const ruleWarnings = rules.flatMap((r) => r.hints.map((h) => ({ level: 'warn', message: `${r.id} may conflict with ${h.fr} (matched "${h.match}"). Reword it, or declare \`overrides: ["${h.fr}"]\` with a reason.` })));
  const preset = config.preset && config.preset !== 'custom' ? lib.presets?.[config.preset] : null;
  if (config.preset && config.preset !== 'custom' && !preset) return { ok: false, level: 'unsupported', errors: [`Unknown preset "${config.preset}". Available: custom, ${Object.keys(lib.presets ?? {}).join(', ')}.`], problems: [], files: {} };
  const presetWarnings = preset && canonical({ ...preset.stack, tools: [...(preset.stack.tools ?? [])].sort() }) !== canonical({ language: config.stack.language, frontend: config.stack.frontend ?? null, css: config.stack.css ?? null, backend: config.stack.backend, orm: config.stack.orm, database: config.stack.database, tools: [...(config.stack.tools ?? [])].sort() })
    ? [{ level: 'warn', message: `The stack differs from preset "${preset.name}". Set \`preset\` to "custom" or restore the preset stack.` }] : [];
  const problems = [...st.problems, ...ruleWarnings, ...presetWarnings];
  const level = problems.reduce((w, p) => (LEVELS.indexOf(p.level) > LEVELS.indexOf(w) ? p.level : w), st.level);
  if (level === 'unsupported') return { ok: false, level, errors: problems.filter((p) => p.level === 'unsupported').map((p) => p.message), problems, files: {} };

  const ctx = buildContext(config, lib, st, rules, level, problems);
  const files = {};
  const outputs = config.outputs ?? OUTPUTS;
  if (config.project.type === 'frontend') Object.assign(files, renderFrontend(ctx, lib));
  else {
    if (outputs.includes('PROJECT_CONTRACT.md')) files['PROJECT_CONTRACT.md'] = renderProjectContract(ctx, lib);
    if (outputs.includes('ARCHITECTURE.md')) files['ARCHITECTURE.md'] = renderArchitecture(ctx, lib);
    if (outputs.includes('SYSTEM_DESIGN.md')) files['SYSTEM_DESIGN.md'] = renderSystemDesign(ctx, lib);
    if (outputs.includes('DEVELOPMENT_STANDARDS.md')) files['DEVELOPMENT_STANDARDS.md'] = renderDevelopmentStandards(ctx, lib);
    if (outputs.includes('MASTER_PROMPT.md')) files['MASTER_PROMPT.md'] = fill(lib.templates['MASTER_PROMPT.md'], { ...ctx.vars, header: ctx.header('MASTER_PROMPT.md') }, 'MASTER_PROMPT.md');
    if (outputs.includes('PROMPTS/')) Object.assign(files, renderPrompts(ctx, lib));
  }
  const folders = { api: config.project.folders?.api ?? 'api', ui: config.project.folders?.ui ?? 'ui' };
  for (const key of Object.keys(files)) files[key] = files[key]
    .replace(/(?<![\w/.-])(api|ui)\//g, (_, layer) => `${folders[layer]}/`)
    .replace(/\b(npm --prefix|cd) (api|ui)(?=[\s`"';]|$)/g, (_, command, layer) => `${command} ${folders[layer]}`)
    .replaceAll('__LIGHTHOUSE_API_FOLDER__', folders.api).replaceAll('__LIGHTHOUSE_UI_FOLDER__', folders.ui);
  const manifest = {
    generator: `lighthouse-contract-kit@${KIT_VERSION}`, generatedOn: config.generatedOn, configHash: ctx.hash, compatibility: level,
    problems, docs: ctx.docIds.map((id) => ({ id, path: lib.docs[id].path, status: lib.docs[id].fm.status, unverifiedMarks: lib.docs[id].unverified.length })),
    files: Object.keys(files).sort(),
  };
  files['lighthouse.config.json'] = JSON.stringify(config, null, 2) + '\n';
  files['lighthouse.manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return { ok: true, level, errors: [], problems, files };
}

function buildContext(c, lib, st, rules, level, problems) {
  const { docs, compat } = lib; const p = c.project; const s = c.stack;
  const hash = fnv1a(canonical(c) + KIT_VERSION);
  const hasUi = p.type !== 'api';
  // Ports come from the port group (A1/A2/A3) and NN. Without them the pattern stays visible (3CNN...): never invented.
  const portsAssigned = p.category !== undefined && p.nn !== undefined;
  const nn = portsAssigned ? String(p.nn).padStart(2, '0') : 'NN';
  const ports = portsAssigned
    ? { api: `3${p.category}${nn}`, ui: hasUi ? `5${p.category}${nn}` : null, db: `2${p.category}${nn}` }
    : { api: '3CNN', ui: hasUi ? '5CNN' : null, db: '2CNN' };
  const sub = (t) => (portsAssigned ? t.replace(/3CNN/g, ports.api).replace(/2CNN/g, ports.db).replace(/5CNN/g, ports.ui ?? '5CNN') : t);
  const docIds = [...new Set(['core-rules', ...st.ids, ...(st.combo ? [st.combo.id] : [])])];
  const order = [s.language, s.backend, s.orm, s.database, ...(st.combo ? [st.combo.id] : []), s.frontend, s.css, ...coreTools(c, compat), ...st.tools].filter(Boolean);
  const instructionIds = [...new Set(order)].filter((i) => docs[i]);
  const name = (id) => docs[id]?.fm.name ?? id;
  // A line in doc X that names an unselected choice of ANOTHER category (e.g. "Next.js" inside the Tailwind doc
  // when the frontend is Vite) does not apply to this project and is left out.
  const others = Object.entries(compat.choices).flatMap(([cat, ids]) => ids.filter((i) => i !== s[cat] && docs[i]).map((i) => ({ cat, names: [docs[i].fm.name, docs[i].fm.name.replace(/\s*\(.*\)$/, '')] })));
  const applies = (id, line) => !others.some((o) => o.cat !== docs[id]?.fm.category && o.names.some((n) => line.includes(n)));
  const keep = (id, text) => text.split('\n').filter((l) => !/^\s*- /.test(l) || applies(id, l)).join('\n');
  const features = (p.features ?? []).map((f) => ({ ...f, slug: f.resource ?? f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  const access = (f) => ({ read: f.access?.read ?? ROLES, write: f.access?.write ?? ['ADMIN', 'STAFF'] });

  const header = (file) => `<!-- Generated by Lighthouse – Contract Kit v${KIT_VERSION} from lighthouse.config.json (${hash}). Regenerate instead of editing by hand. -->\n> **${p.name}** · ${file} · generated ${c.generatedOn} · config \`${hash}\` · compatibility **${level.toUpperCase()}**`;

  const stackRows = [...LAYERS.filter(([k]) => s[k]).map(([k, label]) => [label, s[k]]), ...[...coreTools(c, compat), ...st.tools].filter((v, i, a) => a.indexOf(v) === i).map((t) => ['Tool', t])];
  const stackTable = ['| Layer | Choice | Recommended | Checked with npm | Library status |', '|---|---|---|---|---|',
    ...stackRows.map(([label, id]) => { const d = docs[id]; const v = d.fm.versions ?? {}; const u = d.unverified.length;
      return `| ${label} | ${d.fm.name} | ${v.recommended ?? '-'} | ${v.npm_latest ?? '-'} (${d.fm.verified_on}) | ${d.fm.status}${u ? `, ${u} unverified` : ''} |`; })].join('\n');

  const compatBlock = [`**Level: ${level.toUpperCase()}**: ${compat.levels[level]}`, '',
    bullets(problems.map((x) => `[${x.level}] ${x.message}`), '- No warnings.'), '',
    st.combo ? `Kit combo document: \`library/${st.combo.doc}\`.` : 'No kit combo document: write the glue between the choices yourself and mark it unverified.'].join('\n');

  const envApi = sub(lib.kitTemplates['env.example']).replace(/3101/g, ports.api).replace(/5101/g, ports.ui ?? ports.api).replace(/2101/g, ports.db)
    .replace('# APP_NAME=Orange LMS', `APP_NAME=${p.name}`).replace('# APP_TYPE=LMS', '# APP_TYPE=').trim();
  // The kit env example is PostgreSQL: other databases take the URL form of their own library document.
  const dbUrl = s.database !== 'postgresql' && docs[s.database] ? section(docs[s.database].text, 8).match(/DATABASE_URL=[^`\s]+/)?.[0] : null;
  const envApiFinal = dbUrl ? envApi.replace(/^DATABASE_URL=.*$/m, sub(dbUrl)) : envApi;
  const uiVar = s.frontend === 'nextjs' ? 'NEXT_PUBLIC_API_URL' : 'VITE_API_URL';
  const envUi = hasUi ? `UI \`${s.frontend === 'nextjs' ? '.env.local' : '.env'}\` (from \`contract-kit/templates/env.example.frontend\`):\n\`\`\`dotenv\n${uiVar}=http://localhost:${ports.api}/api\n\`\`\`` : 'No UI (category A2).';

  const fixed = lib.fixedRules.map((fr) => {
    const by = rules.filter((r) => r.overrides.includes(fr.id));
    return `- **${fr.id}** ${fr.rule}${fr.id === 'FR-015' ? ` (this project: API ${ports.api}${hasUi ? `, UI ${ports.ui}` : ''}, DB ${ports.db})` : ''}${by.length ? ` **Overridden by ${by.map((r) => `${r.id} (${r.reason})`).join(', ')}.**` : ''}`;
  }).join('\n');
  const custom = rules.length ? rules.map((r) => `- **${r.id}** ${r.text}${r.overrides.length ? ` (overrides ${r.overrides.join(', ')}: ${r.reason})` : ''}${r.hints.map((h) => `\n  - Possible conflict with ${h.fr} (matched "${h.match}"): check before following it.`).join('')}`).join('\n') : 'None.';

  const instructions = instructionIds.map((id) => {
    const d = docs[id]; const cat = d.fm.category === 'combo' ? 'combination' : d.fm.category;
    const frag = keep(id, unquote(section(d.text, d.fm.category === 'combo' ? 'Prompt fragment' : 11)))
      .replace(/<name>/g, d.fm.category === 'frontend' ? '__LIGHTHOUSE_UI_FOLDER__' : d.fm.category === 'backend' ? '__LIGHTHOUSE_API_FOLDER__' : '<name>');
    const rl = keep(id, d.fm.category === 'combo' ? section(d.text, 'Wiring') : section(d.text, 9));
    return `### ${d.fm.name} (${cat})\n${sub(frag)}${rl ? `\n\n${d.fm.category === 'combo' ? 'Wiring:' : 'Rules:'}\n${sub(rl)}` : ''}`;
  }).join('\n\n');

  const unverifiedFor = (ids) => {
    const out = [];
    for (const id of ids) if (docs[id]) for (const u of docs[id].unverified) if (applies(id, u)) out.push(`\`library/${docs[id].path}\`: ${u}`);
    for (const id of ids) if (docs[id]?.fm.status === 'draft') out.push(`\`library/${docs[id].path}\` is a **draft**: treat every claim in it as unverified.`);
    return out;
  };
  const unverifiedAll = unverifiedFor(docIds);
  if (!st.combo && p.type !== 'frontend') unverifiedAll.push('No combo document: the wiring between the chosen backend, ORM and database is unverified.');

  const vars = {
    'kit.version': KIT_VERSION,
    'project.name': p.name,
    'project.table': ['| Field | Value |', '|---|---|', `| Name | ${p.name} |`, `| Slug | \`${p.slug}\` |`,
      `| Category | ${p.domain ? DOMAINS[p.domain] : 'Not set'} |`, `| Type | ${TYPES[p.type]} |`, `| Port group | ${portsAssigned ? `${CATEGORY[p.category]}, NN ${nn}` : 'Not assigned: pick it in contract-kit/docs/PORTS.md'} |`, `| Purpose | ${PURPOSES[p.purpose]} |`, `| Version | ${p.version} |`].join('\n'),
    'project.description': p.description,
    'project.features': features.length ? numbered(features.map((f) => `**${f.name}**${f.resource ? ` (\`/api/${f.resource}\`)` : ''}: ${f.description}`))
      : 'None listed in the configuration. Write the 3-7 must-have features in `docs/DEFINITION_OF_DONE.md` before the first feature step (FR-021).',
    'project.parkingLot': bullets(c.project.parkingLot ?? [], 'Nothing yet. New ideas go here, not into v1.'),
    'stack.table': stackTable, compatibility: compatBlock,
    'ports.table': ['| | Host port | URL |', '|---|---|---|', `| API | ${ports.api} | http://localhost:${ports.api}/api (Swagger: /api/docs) |`,
      ...(hasUi ? [`| UI | ${ports.ui} | http://localhost:${ports.ui} |`] : []), `| Database | ${ports.db} | container port of ${name(s.database)} |`].join('\n')
      + (portsAssigned ? '' : '\n\nPorts are not assigned yet: `C` = port group (1 A1 main app, 2 A2 API, 3 A3 application) and `NN` = project number, from `contract-kit/docs/PORTS.md`. Replace `3CNN`, `5CNN` and `2CNN` everywhere before scaffolding.'),
    'env.api': envApiFinal, 'env.ui': envUi,
    'rules.fixed': fixed, 'stack.instructions': instructions, 'rules.custom': custom,
    'unverified.all': bullets(unverifiedAll, 'Nothing: every included document is verified.'),
  };
  return { c, p, s, st, lib, keep, hash, ports, portsAssigned, hasUi, sub, name, docIds, features, access, header, vars, rules, unverifiedFor };
}

// ---------------------------------------------------------------- PROMPTS/
function renderPrompts(ctx, lib) {
  const { p, s, st, hasUi, ports, sub, name, features, access, docs = lib.docs } = { ...ctx, docs: lib.docs };
  const ts = s.language === 'typescript'; const nest = s.backend === 'nestjs';
  const apiDir = 'api/';
  const ext = ts ? 'ts' : 'js'; const jsx = ts ? 'tsx' : 'jsx';
  const archBackend = nest ? 1 : 2; const archFrontend = s.frontend === 'nextjs' ? 4 : 3;
  const kitApi = nest ? 'nest' : 'express';
  const scripts = nest ? 'package-scripts.backend-nest-prisma.json' : 'package-scripts.backend-express-sequelize.json';
  const docText = (id, n) => (docs[id] ? sub(ctx.keep(id, section(docs[id].text, n))) : '');
  const scaffoldText = (id, dir) => docText(id, 4).replace(/<name>/g, dir);
  const unv = (ids, extra = []) => bullets([...ctx.unverifiedFor(ids), ...extra], 'None in this step.');
  const steps = [];
  const add = (key, title, body) => steps.push({ key, title, ...body });

  add('scaffold', 'Scaffold the repository', {
    goal: `Create the repository layout of \`docs/ARCHITECTURE.md\` section 0 with the official CLIs. No business code in this step.`,
    read: bullets([`\`contract-kit/docs/ARCHITECTURE.md\` sections 0, ${archBackend}${hasUi ? ` and ${archFrontend}` : ''}`, '`contract-kit/docs/PORTS.md`']),
    do: [
      `### 1. Repository\nCreate \`${p.slug}/\` with ${hasUi ? '`api/`, `ui/`, ' : '`api/`, '}\`docs/\`, \`CHANGELOG.md\` (from \`contract-kit/templates/CHANGELOG.template.md\`) and \`README.md\`. ${ctx.portsAssigned ? `Check the ports with \`node contract-kit/scripts/ports.mjs ${p.category} ${String(p.nn).padStart(2, '0')}\` (API ${ports.api}${hasUi ? `, UI ${ports.ui}` : ''}, DB ${ports.db}).` : 'Pick the port group and NN in `contract-kit/docs/PORTS.md`, run `node contract-kit/scripts/ports.mjs <C> <NN>`, and use those numbers wherever this package says `3CNN`, `5CNN` or `2CNN`.'}`,
      `### 2. API: ${name(s.backend)}${apiDir ? ` in \`${apiDir}\`` : ''}\n${scaffoldText(s.backend, '__LIGHTHOUSE_API_FOLDER__')}\n\n${lead(name(s.language), docText(s.language, 4))}\n\n${lead('Install', docText(s.backend, 5))}`,
      `### 3. ORM: ${name(s.orm)}\n${scaffoldText(s.orm, '__LIGHTHOUSE_API_FOLDER__')}\n\n${lead('Install', docText(s.orm, 5))}`,
      ...(hasUi ? [`### 4. UI: ${name(s.frontend)} in \`ui/\`\n${scaffoldText(s.frontend, '__LIGHTHOUSE_UI_FOLDER__')}\n\n${lead('Install', docText(s.frontend, 5))}\n\n${lead(name(s.css), docText(s.css, 5))}`] : []),
      `### ${hasUi ? 5 : 4}. Lint\n${name('eslint')}: ${docText('eslint', 5)}. ${docText('eslint', 8)}`,
      `### ${hasUi ? 6 : 5}. Root and Docker\n${hasUi ? 'Root `package.json`: the scripts of `contract-kit/templates/package-scripts.root.json`. ' : ''}\`docker-compose.yml\` from \`contract-kit/templates/docker-compose.template.yml\`, with \`.env.docker\`:\n\`\`\`dotenv\nCOMPOSE_PROJECT_NAME=${ctx.portsAssigned ? `a${p.category}-` : ''}${p.slug}\nAPP_SLUG=${p.slug}\nPORT_API=${ports.api}\n${hasUi ? `PORT_UI=${ports.ui}\n` : ''}PORT_DB=${ports.db}\nPOSTGRES_PASSWORD=postgres\n\`\`\``,
    ].join('\n\n'),
    accept: checks([`The layout matches ARCHITECTURE.md section 0${hasUi ? ' (`api/`, `ui/`, `docs/`)' : ''}.`, 'Every app was created by its official CLI (FR-022); the commands you ran are in your report.',
      s.database === 'postgresql' ? `\`docker compose --env-file .env.docker --profile db up -d\` starts PostgreSQL on host port ${ports.db}.` : `The compose \`db\` service runs ${name(s.database)} (the kit template is PostgreSQL: replace the image) on host port ${ports.db}.`, ...(hasUi ? [`The UI dev server starts on port ${ports.ui}.`] : []), 'No business code yet.']),
    dont: bullets(['Hand-write a structure an official CLI generates (FR-022).', 'Use other ports than the ones above (FR-015).', 'Add packages that are not in MASTER_PROMPT section 3.']),
    unverified: unv([s.language, s.backend, s.orm, s.database, s.frontend, s.css, 'eslint']),
  });

  add('api-foundation', 'API foundation from the Contract Kit', {
    goal: 'Make the API speak the contract before any feature exists: envelope, requestId, errors, validation, pagination, env validation, helpers and the observability module.',
    read: bullets(['`contract-kit/docs/CONVENTIONS.md`', '`contract-kit/docs/OBSERVABILITY.md`', `\`contract-kit/docs/ARCHITECTURE.md\` sections ${archBackend}, 6 and 7`,
      nest ? '`contract-kit/nest/src/main.example.ts` and `app.module.example.ts`' : '`contract-kit/express/src/app.example.js`']),
    do: numbered([
      `Copy \`contract-kit/${kitApi}/src/common\`, \`observability\` and \`helpers\` into \`${apiDir}src/\` unchanged.`,
      nest ? 'Bootstrap as in `main.example.ts`: global `ResponseInterceptor`, `HttpExceptionFilter`, `requestIdMiddleware`, `/api` prefix, Swagger at `/api/docs`.'
        : 'Build `src/app.js` from `app.example.js` (requestId first, errorHandler last) and `src/server.js` with `listen()` only. Swagger UI at `/api/docs` (the kit comment names `swagger-ui-express`).',
      `Scripts: merge \`contract-kit/templates/${scripts}\` into \`${apiDir}package.json\`. ${nest ? '`db:create` calls `scripts/create-database.mjs`, which the kit does not ship: write it (create the database named in `DATABASE_URL` if it does not exist).' : docText(s.language, 7)}`,
      `\`.env.example\` exactly as in MASTER_PROMPT section 5; env is validated by Zod at boot (\`common/config/env.${ext}\`).`,
      `Register the observability module with \`name: '${p.name}'\`, \`version: '${p.version}'\` and \`access: allowRoles(['ADMIN', 'STAFF'], (req) => req.user?.role)\` from the start. Until step 04 adds auth, \`/monitoring\` and \`/activities\` answer 401: that is correct.`,
      nest ? 'Port the cases of `contract-kit/nest/test/contract.smoke.ts` to a Jest e2e test in `test/`.' : 'Copy `contract-kit/express/tests/contract.test.js` to `tests/` and fix its import paths.',
    ]),
    accept: checks(['`GET /api/health`, `/api/version` and `/api/public` return the envelope `{ success, message, data, meta, error, requestId }` and an `X-Request-Id` header.',
      '`GET /api/monitoring` and `/api/activities` return 401 `UNAUTHORIZED` without a token.', 'An unknown route returns 404 `NOT_FOUND` in the envelope.',
      '`/api/docs` shows the Swagger UI.', 'The ported contract tests, `npm run lint` and `npm run typecheck` pass.']),
    dont: bullets(['Edit the copied `common/` files to suit a feature: report the need instead.', 'Use `allowAll` outside tests (FR-006).', 'Call `res.json` directly or return `{ data }` from a service (FR-018).']),
    unverified: unv([s.backend, 'zod', 'eslint'], nest ? [] : ['Swagger for Express: `swagger-ui-express` is named in the kit but has no library document. Check its current docs and report the version you used.']),
  });

  const comboId = st.combo?.id;
  add('database', `Database: ${name(s.orm)} + ${name(s.database)}`, {
    goal: `Connect the API to ${name(s.database)}, create the users ${s.database === 'mongodb' ? 'collection' : 'table'} and seed one admin account.`,
    read: bullets([`\`contract-kit/library/${docs[s.orm].path}\``, `\`contract-kit/library/${docs[s.database].path}\``, ...(comboId ? [`\`contract-kit/library/${st.combo.doc}\``] : []), '`contract-kit/docs/CONVENTIONS.md` section 4']),
    do: [
      `### 1. Configuration\n${docText(s.orm, 8)}`,
      ...(comboId ? [`### 2. Wiring\n${sub(section(docs[comboId].text, 'Wiring'))}`] : []),
      `### ${comboId ? 3 : 2}. Users table\nOne migration for \`users\`: \`id\` (UUID primary key), \`email\` (unique), \`name\`, \`role\` (\`ADMIN\` | \`STAFF\` | \`USER\`), a password-hash column, \`created_at\`, \`updated_at\`. Columns snake_case, JSON camelCase (FR-009, FR-011).`,
      `### ${comboId ? 4 : 3}. Seed\nSeed one \`ADMIN\` whose email and password come from environment variables that you add to \`.env.example\`. Hash with bcryptjs. The seed must be safe to run twice.`,
      `### ${comboId ? 5 : 4}. Health\nPass the database probe to the observability module so \`/api/health\` reports \`CONNECTED\`.`,
      `### ${comboId ? 6 : 5}. Rules\n${docText(s.orm, 9)}\n${docText(s.database, 9)}`,
    ].join('\n\n'),
    accept: checks(['`npm run db:setup` works on an empty database.', '`GET /api/health` reports `database: "CONNECTED"`; with the database stopped it reports `DISCONNECTED`.', 'The migration has `up` and `down`.', 'Running the seed twice leaves one admin.']),
    dont: bullets(['Change the schema without a migration.', 'Hard-code the admin password.', 'Use auto-increment ids (FR-009).']),
    unverified: unv([s.orm, s.database, ...(comboId ? [comboId] : [])]),
  });

  add('auth', 'Authentication and roles', {
    goal: 'Implement the auth contract of CONVENTIONS.md section 5 and protect the observability endpoints.',
    read: bullets(['`contract-kit/docs/CONVENTIONS.md` section 5', '`contract-kit/library/integrations/jsonwebtoken.md`', '`contract-kit/library/integrations/bcryptjs.md`', '`contract-kit/nest/src/common/auth/auth.types.ts` (the contract types)']),
    do: [
      `### Contract\n${unquote(section(docs.jsonwebtoken.text, 11))}\n\n${unquote(section(docs.bcryptjs.text, 11))}`,
      `### Build\n${numbered([
        `\`POST /api/auth/login\`, \`POST /api/auth/refresh\`, \`GET /api/auth/me\` in \`modules/auth/\` (${nest ? 'module, controller, service, dto' : `\`auth.routes.${ext}\`, \`auth.controller.${ext}\`, \`auth.service.${ext}\`, \`auth.schema.${ext}\``}).`,
        nest ? 'A guard that reads `Authorization: Bearer` and sets `req.user = { id, role }`, plus `@Roles(...)` and `@CurrentUser()` in `common/auth/`.' : 'A middleware `common/middlewares/auth.js` that reads `Authorization: Bearer` and sets `req.user = { id, role }`, and `requireRoles(...roles)`.',
        'Run the auth middleware/guard before the observability module so `allowRoles` sees `req.user`.',
        'How refresh tokens are stored or rotated is not in the kit: propose one way in your report before coding it.',
      ])}`,
      `### Rules\n${section(docs.jsonwebtoken.text, 9)}\n${section(docs.bcryptjs.text, 9)}`,
    ].join('\n\n'),
    accept: checks(['Login with a wrong password returns 401 `UNAUTHORIZED`.', '`/api/auth/me` returns `{ id, email, name, role }` and never a password or hash.',
      '`/api/monitoring`: 401 without a token, 403 `FORBIDDEN` for `USER`, 200 for `ADMIN` and `STAFF`.', 'Tests cover each line above.']),
    dont: bullets(['Put email or name in the token.', 'Invent roles beyond ADMIN, STAFF, USER (FR-012).', 'Log passwords or tokens.']),
    unverified: unv(['jsonwebtoken', 'bcryptjs']),
  });

  if (hasUi) add('ui-foundation', `UI foundation: ${name(s.frontend)}`, {
    goal: 'Give the UI the kit plumbing, the design tokens, a login page and a protected layout. No feature screens yet.',
    read: bullets([`\`contract-kit/docs/ARCHITECTURE.md\` section ${archFrontend}`, '`contract-kit/docs/DESIGN_SYSTEM.md`', `\`contract-kit/library/${docs[s.frontend].path}\``, `\`contract-kit/library/${docs[s.css].path}\``]),
    do: numbered([
      `Copy \`contract-kit/frontend/src/lib\`, \`components/QueryState.tsx\`, \`helpers\` and \`styles/tokens.css\` into \`ui/src/\`.${ts ? '' : ' The kit files are TypeScript: convert them to JavaScript without changing behaviour (see MASTER_PROMPT section 4).'}`,
      lead(name(s.css), docText(s.css, 8)),
      `Set the brand scale in \`tokens.css\` (DESIGN_SYSTEM.md). If this project has no brand yet, ask; do not pick colours.`,
      `${uiVar(s)} as in MASTER_PROMPT section 5.`,
      ...(st.tools.includes('tanstack-query') ? ['Providers: one `QueryClient` in `app/providers.tsx`.'] : []),
      s.frontend === 'nextjs' ? 'Routing in `src/app/`: `/login`, a protected layout group, `not-found`.' : `Routing in \`app/router.${jsx}\`: \`/login\`, a protected layout, a 404 page.`,
      'Login calls `POST /api/auth/login`; `api-client` sends `Authorization: Bearer <accessToken>`; logout clears the tokens.',
    ]),
    accept: checks(['Login works against the API; a wrong password shows the `UNAUTHORIZED` message from `error-messages`.', 'The protected layout redirects to `/login` without a token.',
      'No raw hex outside `tokens.css` (FR-019).', `\`npm run dev\` serves on port ${ports.ui}; \`typecheck\`, \`lint\` and \`test\` pass.`]),
    dont: bullets(['Import axios outside `lib/api-client`.', 'Write loading or error states by hand: use `QueryState`.']),
    unverified: unv([s.frontend, s.css, ...st.tools.filter((t) => ['axios', 'tanstack-query'].includes(t))]),
  });

  const featureSteps = features.length ? features : [{ name: '<Feature>', slug: '<resource>', description: 'Template: repeat this step once for every must-have feature of `docs/DEFINITION_OF_DONE.md`. Replace `<Feature>` and `<resource>` (plural kebab-case, FR-004) before sending it.', template: true }];
  for (const f of featureSteps) {
    const a = access(f); const r = f.slug; const table = snake(r);
    const apiFiles = nest ? [`${r}.module.ts`, `${r}.controller.ts`, `${r}.service.ts`, `${r}.service.spec.ts`, `dto/create-${r}.dto.ts`] : [`${r}.routes.${ext}`, `${r}.controller.${ext}`, `${r}.service.${ext}`, `${r}.schema.${ext}`];
    const endpoints = ['| Method | Path | Access | Returns |', '|---|---|---|---|',
      `| GET | \`/api/${r}\` | ${a.read.join(', ')} | list, \`meta.pagination\`; \`?page=&limit=&sort=-createdAt&q=\` |`,
      `| GET | \`/api/${r}/:id\` | ${a.read.join(', ')} | one item, or 404 \`NOT_FOUND\` |`,
      `| POST | \`/api/${r}\` | ${a.write.join(', ')} | 201, the created item |`,
      `| PATCH | \`/api/${r}/:id\` | ${a.write.join(', ')} | the updated item |`,
      `| DELETE | \`/api/${r}/:id\` | ${a.write.join(', ')} | 200 with \`data: null\`; 404 \`NOT_FOUND\` if it does not exist |`].join('\n');
    add(f.template ? 'feature-template' : `feature-${r}`, f.template ? 'Feature (template, repeat per feature)' : `Feature: ${f.name}`, {
      goal: `${f.description}\n\nBuild it end to end: API${hasUi ? ', tests and UI' : ' and tests'}.`,
      read: bullets(['MASTER_PROMPT sections 6-8', `\`contract-kit/docs/ARCHITECTURE.md\` sections ${archBackend}${hasUi ? ` and ${archFrontend}` : ''}`, '`contract-kit/docs/OBSERVABILITY.md` (activity sources)']),
      do: [
        `### 1. Fields first\nDerive the fields of \`${table}\` from the goal above. List them (name, type, required, example) in your report and in \`docs/api-contract.md\` **before** writing code, and ask when the goal does not decide a field. Always present: \`id\` (UUID), \`created_at\`, \`updated_at\`. Money is an integer in rupiah plus \`currency\` (FR-010).`,
        `### 2. API in \`${apiDir}src/modules/${r}/\`\n${bullets(apiFiles.map((x) => `\`${x}\``))}\n\nMigration for \`${table}\`. Endpoints (proposal: drop any the feature does not need, do not add others without updating MASTER_PROMPT):\n\n${endpoints}\n\nWhitelist the \`sort\` fields. Add one activity source for this entity (OBSERVABILITY.md). Document every endpoint in Swagger.`,
        `### 3. Tests\n${nest ? `\`${r}.service.spec.ts\` and \`test/${r}.e2e-spec.ts\`` : `\`tests/${r}.test.js\` (\`node --test\`)`}: list with pagination, \`limit=101\` gives 400 \`VALIDATION_ERROR\`, unknown id gives 404 \`NOT_FOUND\`, a role outside the write list gives 403 \`FORBIDDEN\`, one happy path for create, update and delete.`,
        ...(hasUi ? [`### 4. UI in \`ui/src/features/${r}/\`\n${bullets([`\`api.${ext}\`: the only file that calls \`apiClient\` (\`unwrapPage\` for the list, \`unwrapItem\` for one)`, `\`hooks.${ext}\`${st.tools.includes('tanstack-query') ? ' (TanStack Query)' : ''}`, '`components/`: list with search (`q`) and pagination, create/edit form, delete confirmation (destructive token)', ts ? '`types.ts`, `index.ts`' : '`index.js` (no types file: MASTER_PROMPT section 7)'])}\n\nA page that composes the feature; loading, empty and error through \`QueryState\`.`] : []),
        `### ${hasUi ? 5 : 4}. Custom rules\n${ctx.vars['rules.custom']}`,
      ].join('\n\n'),
      accept: checks(['The fields were listed and confirmed before coding.', 'Every endpoint is in Swagger and answers in the envelope.', 'The tests above pass, plus `typecheck` and `lint`.',
        ...(hasUi ? [`The UI lists, searches, creates, edits and deletes ${f.name.toLowerCase()} with no raw hex and no direct axios call.`] : [])]),
      dont: bullets(['Return `{ data: null }` for an unknown id (FR-018).', 'Change files in `common/`.', 'Start the next feature in the same step.']),
      unverified: 'None beyond MASTER_PROMPT section 9.',
    });
  }

  const dod = section(lib.kitDocs['DEFINITION_OF_DONE.md'], 'Done checklist');
  add('release-v1', 'Release v1', {
    goal: `Close v1 of ${p.name} with the Definition of Done. After this step v1 is frozen.`,
    read: bullets(['`contract-kit/docs/DEFINITION_OF_DONE.md`', '`CHANGELOG.md`']),
    do: numbered(['Go through the checklist below and fix what is missing.', `Write the \`1.0.0\` entry in \`CHANGELOG.md\` with the release date.`,
      `Update the app registry row: ${p.name}, ${p.domain ? `${DOMAINS[p.domain]}, ` : ''}${ctx.portsAssigned ? `port group ${p.category}, NN ${String(p.nn).padStart(2, '0')}` : 'port group and NN from docs/PORTS.md'}, API ${ports.api}${hasUi ? `, UI ${ports.ui}` : ''}, DB ${ports.db}, repository and deploy URLs.`,
      'List which items of MASTER_PROMPT section 9 you verified and what you found, so the library can be updated.']),
    accept: dod,
    dont: bullets(['Add features: new ideas go to the v1.1 parking lot.']),
    unverified: 'Report on every item of MASTER_PROMPT section 9.',
  });

  const files = {}; const tpl = lib.templates['prompts/step.md'];
  steps.forEach((st2, i) => {
    const num = String(i + 1).padStart(2, '0'); st2.file = `PROMPTS/${num}-${st2.key}.md`; st2.num = num;
  });
  steps.forEach((x, i) => {
    files[x.file] = fill(tpl, { header: ctx.header(x.file), 'step.number': x.num, 'step.title': x.title,
      'step.previous': i ? `Previous step: \`${steps[i - 1].file.slice(8)}\` must be accepted first.` : 'This is the first step.',
      'step.goal': x.goal, 'step.read': x.read, 'step.do': x.do, 'step.accept': x.accept, 'step.dont': x.dont, 'step.unverified': x.unverified }, x.file);
  });
  files['PROMPTS/00-INDEX.md'] = fill(lib.templates['prompts/00-INDEX.md'], { header: ctx.header('PROMPTS/00-INDEX.md'), 'project.name': p.name,
    'index.table': ['| # | File | Step |', '|---|---|---|', ...steps.map((x) => `| ${x.num} | \`${x.file.slice(8)}\` | ${x.title} |`)].join('\n') }, '00-INDEX.md');
  return files;
}
const uiVar = (s) => (s.frontend === 'nextjs' ? '`NEXT_PUBLIC_API_URL` in `.env.local`' : '`VITE_API_URL` in `.env`');


// ---------------------------------------------------------------- trees from docs/ARCHITECTURE.md
const branchCol = (l) => { const i = l.search(/[├└]─/); return i; };
const codeBlock = (text) => { const m = text.match(/```[a-z]*\r?\n([\s\S]*?)\r?\n```/); return m ? m[1] : ''; };

/** Remove a tree line (and its children), keeping the connectors right. */
function removeLine(lines, idx) {
  const col = branchCol(lines[idx]); let end = idx + 1;
  while (end < lines.length && branchCol(lines[end]) > col) end++;
  const wasLast = lines[idx][col] === '└';
  lines.splice(idx, end - idx);
  if (!wasLast) return;
  for (let j = idx - 1; j >= 0; j--) {
    const c = branchCol(lines[j]);
    if (c < col) break;
    if (c === col) { lines[j] = lines[j].slice(0, col) + '└' + lines[j].slice(col + 1);
      for (let k = j + 1; k < idx; k++) if (lines[k][col] === '│') lines[k] = lines[k].slice(0, col) + ' ' + lines[k].slice(col + 1);
      break; }
  }
}

/** Repeat every `<feature>` line (with its children) once per feature, fixing the connectors. */
function expandFeatures(lines, slugs) {
  if (!slugs.length) return lines;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('<feature>')) { out.push(lines[i]); continue; }
    const col = branchCol(lines[i]); let end = i + 1;
    while (end < lines.length && branchCol(lines[end]) > col) end++;
    const block = lines.slice(i, end); const last = lines[i][col] === '└';
    slugs.forEach((slug, n) => {
      const isLast = n === slugs.length - 1;
      block.forEach((l, k) => {
        let x = l.replace(/<feature>/g, slug);
        const ci = l.search(/ #\s/) + 1;  // keep the comment column of the original line
        if (n > 0) x = x.replace(/\s+#.*$/, '');
        else if (ci > 0) { const code = x.slice(0, x.search(/\s+#\s/)); const comment = x.slice(x.search(/#\s/)); x = code.length < ci ? code.padEnd(ci) + comment : `${code} ${comment}`; }
        if (last && !isLast) x = k === 0 ? x.slice(0, col) + '├' + x.slice(col + 1) : (x[col] === ' ' ? x.slice(0, col) + '│' + x.slice(col + 1) : x);
        out.push(x);
      });
    });
    i = end - 1;
  }
  return out;
}

function tree(text, { slugs, js, tsToJs, jsToTs, dropTypes, rename = [] }) {
  let lines = codeBlock(text).split('\n');
  if (dropTypes) for (let i = lines.length - 1; i >= 0; i--) if (/[├└]─ types(\/|\.ts)/.test(lines[i])) removeLine(lines, i);
  lines = expandFeatures(lines, slugs);
  return lines.map((l) => {
    let x = l;
    if (tsToJs) x = x.replace(/\.tsx\b/g, '.jsx').replace(/\.ts\b/g, '.js');
    if (jsToTs) x = x.replace(/\.js\b/g, '.ts');
    for (const [a, b] of rename) x = x.split(a).join(b);
    return x;
  }).join('\n');
}

const afterCode = (text) => text.slice(text.lastIndexOf('```') + 3).trim();

// ---------------------------------------------------------------- PROJECT_CONTRACT.md
function renderProjectContract(ctx, lib) {
  const { p, s, hasUi, ports, features, access, vars } = ctx;
  const conv = lib.kitDocs['CONVENTIONS.md'];
  const nest = s.backend === 'nestjs'; const ts = s.language === 'typescript';
  const be = nest || ts ? 'ts' : 'js'; const fe = ts ? 'ts' : 'js'; const fx = ts ? 'tsx' : 'jsx';
  const api = `http://localhost:${ports.api}/api`;
  const row = (g, m, path, acc, note) => `| ${g} | ${m} | \`${path}\` | ${acc} | ${note} |`;
  const endpoints = ['| Group | Method | Path | Access | Notes |', '|---|---|---|---|---|',
    row('Observability', 'GET', '/api/health', 'Open', 'status, application, database, version, timestamp, uptime'),
    row('Observability', 'GET', '/api/version', 'Open', 'name, type, version, commit'),
    row('Observability', 'GET', '/api/public', 'Open', 'name, environment, docsUrl, serverTime'),
    row('Observability', 'GET', '/api/monitoring', 'ADMIN, STAFF', 'node, memory, database latency'),
    row('Observability', 'GET', '/api/activities', 'ADMIN, STAFF', 'latest 30 activities'),
    row('Auth', 'POST', '/api/auth/login', 'Open', 'body `{ email, password }`'),
    row('Auth', 'POST', '/api/auth/refresh', 'Open', 'body `{ refreshToken }`'),
    row('Auth', 'GET', '/api/auth/me', 'Any signed-in role', '`{ id, email, name, role }`'),
    ...(features.length ? features : [{ name: '<Feature>', slug: '<resource>' }]).flatMap((f) => { const a = access(f); const r = f.slug; return [
      row(f.name, 'GET', `/api/${r}`, a.read.join(', '), 'list; `meta.pagination`'),
      row(f.name, 'GET', `/api/${r}/:id`, a.read.join(', '), 'one item; 404 `NOT_FOUND`'),
      row(f.name, 'POST', `/api/${r}`, a.write.join(', '), '201; the created item'),
      row(f.name, 'PATCH', `/api/${r}/:id`, a.write.join(', '), 'the updated item'),
      row(f.name, 'DELETE', `/api/${r}/:id`, a.write.join(', '), '`data: null`; 404 if missing')]; })].join('\n');
  const notes = bullets(['Every endpoint answers in the envelope of 4.1 and is documented in Swagger.',
    'Feature endpoints are the standard set; drop the ones a feature does not need. Update uses `PATCH` and access defaults to read: ADMIN, STAFF, USER / write: ADMIN, STAFF (generator defaults, set per feature in the config).',
    '`/api/public/<resource>` (open dashboard data) is written per app: allow-list DTO, no email or phone, names masked with `maskName` (FR-007).']);
  const tables = ['| Table | Columns | Source |', '|---|---|---|',
    '| `users` | `id` (UUID), `email` (unique), `name`, `role` (ADMIN, STAFF, USER), password hash, `created_at`, `updated_at` | auth contract (4.4) |',
    ...(features.length ? features : [{ name: 'each feature', slug: '<resource>' }]).map((f) => `| \`${snake(f.slug)}\` | \`id\` (UUID), the fields of ${f.name} (decided in its step, before coding), \`created_at\`, \`updated_at\` | feature ${f.name} |`)].join('\n');
  const impl = nest ? [
    ['Envelope', '`api/src/common/contract/envelope.ts` + `interceptors/response.interceptor.ts`', 'services return raw values; the interceptor wraps them'],
    ['Errors', '`api/src/common/filters/http-exception.filter.ts`', 'throw `NotFoundException` etc.'],
    ['Request id', '`api/src/common/middlewares/request-id.middleware.ts`', ''],
    ['Validation', '`api/src/common/pipes/zod-validation.pipe.ts` + `modules/<feature>/dto/*.dto.ts`', 'Zod schema + inferred type'],
    ['Pagination', '`api/src/common/pagination/pagination.ts`', '`new Paginated(items, buildPagination(...))`'],
    ['Env', '`api/src/common/config/env.ts`', 'Zod, at boot'],
    ['Auth', '`api/src/common/auth/`', 'types from the kit; guard, `@Roles`, `@CurrentUser` written in the app'],
    ['Observability', '`api/src/observability/`', '`ObservabilityModule.register({ ..., access })`'],
    ['Swagger', '`api/src/common/swagger/api-envelope.ts`', '`ApiOkEnvelope`, `ApiListEnvelope`, `ApiPaginatedEnvelope`'],
  ] : [
    ['Envelope', `\`api/src/common/contract/response.${be}\``, '`sendSuccess`, `sendCreated`, `sendPaginated`, `sendError`, `AppError`'],
    ['Errors', `\`api/src/common/middlewares/error-handler.${be}\``, '`notFoundHandler`, `errorHandler`'],
    ['Request id', `\`api/src/common/middlewares/request-id.${be}\``, 'sets `req.requestId` and `X-Request-Id`'],
    ['Validation', `\`api/src/common/middlewares/validate.${be}\` + \`modules/<feature>/<feature>.schema.${be}\``, '`validate(schema, where)`, `asyncHandler`; parsed value in `req.valid`'],
    ['Pagination', `\`api/src/common/pagination/pagination.${be}\``, '`paginationQuerySchema`, `toOffsetLimit`, `buildPagination`, `parseSort`'],
    ['Env', `\`api/src/common/config/env.${be}\``, '`loadEnv()`, Zod, at boot'],
    ['Auth', `\`api/src/common/middlewares/auth.${be}\``, 'written in the app: sets `req.user = { id, role }`'],
    ['Observability', `\`api/src/observability/observability.router.${be}\``, '`createObservabilityRouter({ ..., access })`'],
    ['Swagger', '`/api/docs`', '`swagger-ui-express` (named in the kit, no library document yet)'],
  ];
  if (hasUi) impl.push(['UI: envelope', `\`ui/src/lib/api-client.${fe}\``, '`createApiClient`, `unwrapItem`, `unwrapList`, `unwrapPage`, `ApiError`'],
    ['UI: error codes', `\`ui/src/lib/error-messages.${fe}\``, '`error.code` -> message (`toastMessageFor`)'],
    ['UI: states', `\`ui/src/components/QueryState.${fx}\``, 'loading, empty, error'],
    ['UI: tokens', '`ui/src/styles/tokens.css`', 'the only file with raw colours']);
  const implTable = ['| Part of the contract | File in this project | Notes |', '|---|---|---|', ...impl.map((r) => `| ${r.join(' | ')} |`)].join('\n')
    + `\n\nCopied from \`contract-kit/${nest ? 'nest' : 'express'}/src\`${hasUi ? ' and `contract-kit/frontend/src`' : ''}${(!nest && ts) || (hasUi && !ts) ? '; the kit files are converted to the chosen language (section 2, compatibility)' : ''}.`;
  return fill(lib.templates['PROJECT_CONTRACT.md'], {
    ...vars, header: ctx.header('PROJECT_CONTRACT.md'),
    'project.info': ['| Field | Value |', '|---|---|', `| Project Name | ${p.name} |`, `| Project Type | ${TYPES[p.type]} |`, `| Project Purpose | ${PURPOSES[p.purpose]} |`,
      `| Project Version | ${p.version} |`, `| Category | ${p.domain ? DOMAINS[p.domain] : 'Not set'} |`, `| Repository | \`${p.slug}/\` |`,
      `| Port group | ${ctx.portsAssigned ? `${CATEGORY[p.category]}, NN ${String(p.nn).padStart(2, '0')}` : 'Not assigned (contract-kit/docs/PORTS.md)'} |`,
      `| Ports | API ${ports.api}${hasUi ? ` · UI ${ports.ui}` : ''} · DB ${ports.db} |`].join('\n'),
    'api.baseUrl': api, 'api.endpoints': endpoints, 'api.endpointNotes': notes,
    'conv.envelope': section(conv, 1), 'conv.query': section(conv, 3), 'conv.auth': section(conv, 5), 'conv.data': section(conv, 4),
    'obs.shapes': section(lib.kitDocs['OBSERVABILITY.md'], 'Response shapes').split('Byte Burger').join(p.name),
    'data.tables': tables, 'impl.table': implTable,
    dod: section(lib.kitDocs['DEFINITION_OF_DONE.md'], 'Done checklist'),
  }, 'PROJECT_CONTRACT.md');
}

// ---------------------------------------------------------------- ARCHITECTURE.md
function renderArchitecture(ctx, lib) {
  const { p, s, st, hasUi, ports, features, name, vars } = ctx;
  const arch = lib.kitDocs['ARCHITECTURE.md']; const docs = lib.docs;
  const nest = s.backend === 'nestjs'; const ts = s.language === 'typescript'; const next = s.frontend === 'nextjs';
  const slugs = features.map((f) => f.slug);
  const langName = (id) => name(id).replace(/\s*\(.*\)$/, '');
  const lang = langName(s.language);
  const bSec = nest ? 1 : 2; const fSec = next ? 4 : 3;
  const bText = section(arch, bSec); const fText = hasUi ? section(arch, fSec) : ''; const feRulesText = section(arch, 4);
  const an = (w) => (/^[AEIOU]/i.test(w) ? `an ${w}` : `a ${w}`);
  const notes = (ids, n) => ids.filter((id) => docs[id]).flatMap((id) => ctx.sub(ctx.keep(id, section(docs[id].text, n))).split('\n').filter((l) => /^- /.test(l)).map((l) => `${l} *(${name(id)})*`));

  const repo = codeBlock(section(arch, 0)).split('\n').map((l) => l
    .replace(/^<app>\/\s+#.*$/, `${p.slug}/`).replace('# NestJS or Express', `# ${name(s.backend)} (${lang})`)
    .replace('# Vite React or Next.js', hasUi ? `# ${name(s.frontend)} (${lang})` : '')).filter((l) => hasUi || !/[├└]─ ui\//.test(l)).join('\n');

  const backendTree = tree(bText, { slugs, jsToTs: !nest && ts });
  const ormMismatch = (nest && s.orm !== 'prisma') || (!nest && s.orm !== 'sequelize');
  const lifecycle = nest ? numbered([
    '`requestIdMiddleware` sets the request id and the `X-Request-Id` header.',
    'Global prefix `/api`; the auth guard reads `Authorization: Bearer` and `@Roles(...)` checks the role (401 vs 403).',
    '`ZodValidationPipe` validates body, query and params (400 `VALIDATION_ERROR`).',
    'The controller parses input and calls the service.',
    `The service holds the logic, uses ${name(s.orm)}, and returns a raw value or \`new Paginated(items, meta)\`; not found throws \`NotFoundException\`.`,
    '`ResponseInterceptor` wraps the value in the envelope; `HttpExceptionFilter` turns every error into the error envelope.'])
    : numbered([
    '`requestId` sets `req.requestId` and the `X-Request-Id` header (registered first).',
    '`cors({ origin: CORS_ORIGIN })`, `express.json()`.',
    'Routers under `/api`: the observability router, `/api/auth`, then one router per feature.',
    'In a feature route: `auth` middleware -> `requireRoles(...)` (401 vs 403) -> `validate(schema, "body" | "query" | "params")` -> controller wrapped in `asyncHandler`.',
    'The controller reads `req.valid`, calls the service and answers with `sendSuccess` / `sendCreated` / `sendPaginated`.',
    `The service holds the logic, uses the ${name(s.orm)} models, returns raw data and throws \`AppError\` (e.g. 404 \`NOT_FOUND\`).`,
    '`notFoundHandler` answers unknown routes with 404 `NOT_FOUND`; `errorHandler` (registered last) turns every error into the error envelope.']);
  const backendNotes = bullets([...(ormMismatch ? [`The kit tree above is for ${nest ? 'Prisma' : 'Sequelize'}; with ${name(s.orm)} use the folders of \`library/${docs[s.orm].path}\` section 6 instead (no kit template for this pair).`] : []),
    ...notes([s.backend, s.orm, s.database], 10).map((l) => l.slice(2))]);

  let frontend = '';
  if (hasUi) {
    const tanstack = st.tools.includes('tanstack-query');
    const ft = tree(fText, { slugs, tsToJs: !ts, dropTypes: !ts, rename: tanstack ? [] : [['# React Query hooks', '# data hooks (TanStack Query not selected)'], ['# QueryClient, theme, toaster', '# theme, toaster']] });
    const feRules = afterCode(feRulesText).replace(/^Rules \(both front ends\)\s*/, '').split('\n').filter((l) => /^- /.test(l) && (next || !/^- In Next\.js/.test(l)) && !/^- The only difference between Vite and Next\.js/.test(l)).map((l) => { const x = ctx.sub(l.slice(2)); return ts ? x : x.replace(/\.tsx\b/g, '.jsx').replace(/\.ts\b/g, '.js'); });
    const flow = numbered([
      `A ${next ? 'route in `src/app/`' : 'page in `pages/`'} composes feature components; it holds no data logic.`,
      `A component calls a hook from \`features/<feature>/hooks.${ts ? 'ts' : 'js'}\`${tanstack ? ' (TanStack Query: caching, refetch, mutations)' : ''}.`,
      `The hook calls \`features/<feature>/api.${ts ? 'ts' : 'js'}\`, the only place that uses \`apiClient\`.`,
      `\`lib/api-client\` (axios) adds \`Authorization: Bearer <accessToken>\`, calls \`${next ? 'NEXT_PUBLIC_API_URL' : 'VITE_API_URL'}\` (http://localhost:${ports.api}/api) and unwraps the envelope with \`unwrapItem\` / \`unwrapList\` / \`unwrapPage\`.`,
      'A failure becomes `ApiError` (`code`, `message`, `requestId`, `details`); `lib/error-messages` turns `error.code` into the message shown to the user.',
      '`QueryState` renders loading, empty and error the same way on every screen.']);
    const ds = lib.kitDocs['DESIGN_SYSTEM.md'];
    const styling = [unquote(section(docs[s.css].text, 11)), '', ds.slice(ds.indexOf('Every app ships'), ds.indexOf('Rules:')).trim(), '', ds.slice(ds.indexOf('Rules:'), ds.indexOf('## Worked')).trim()].join('\n');
    frontend = [`## 4. Frontend: ${name(s.frontend)} + ${name(s.css)} (${lang})`, `### 4.1 Folders\n\`\`\`\n${ft}\n\`\`\``, '### 4.2 Rules', bullets(feRules), '### 4.3 Data flow', flow, '### 4.4 Styling', styling,
      '### 4.5 Stack notes', bullets([...notes([s.frontend, s.css, ...st.tools.filter((t) => ['axios', 'tanstack-query'].includes(t))], 10).map((l) => l.slice(2)),
        ...(/stores\//.test(ft) ? ['`stores/` names Zustand, which has no library document yet: leave the folder out until it is added. *(ARCHITECTURE.md)*'] : [])])].join('\n\n');
  }
  const places = tableRows(section(arch, 6)).map((r) => `| ${r[0]} | ${nest ? r[1] : r[2]} |`);
  const n = hasUi ? 5 : 4;
  return fill(lib.templates['ARCHITECTURE.md'], {
    ...vars, header: ctx.header('ARCHITECTURE.md'),
    'arch.summary': `${p.name} is ${hasUi ? `${an(name(s.frontend))} UI and ` : ''}${an(name(s.backend))} API, written in ${lang}, storing data in ${name(s.database)} through ${name(s.orm)}. Folder names, layers and the API contract are the shared standard of every A1/A2/A3 app (\`contract-kit/docs/ARCHITECTURE.md\`, \`PROJECT_CONTRACT.md\`); only file extensions and framework wiring change with the stack.`,
    'arch.diagram': ['flowchart LR', hasUi ? `  U([User]) --> UI["${name(s.frontend)} · ui/ · :${ports.ui}"]` : '  C([Client]) --> API', ...(hasUi ? [`  UI -- "JSON envelope · /api · Bearer token" --> API["${name(s.backend)} · api/ · :${ports.api}"]`] : [`  API["${name(s.backend)} · :${ports.api}"]`]),
      `  API -- "${name(s.orm)}" --> DB[("${name(s.database)} · :${ports.db}")]`, '  API -. "/api/docs" .-> SW[Swagger UI]'].join('\n'),
    'arch.repo': repo, 'arch.backendTitle': `${name(s.backend)} + ${name(s.orm)} (${nest ? 'TypeScript' : lang})`, 'arch.backendTree': backendTree,
    'arch.backendRules': bullets(afterCode(bText).replace(/^Rules\s*/, '').split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2))) + `\n\n${section(arch, 8)}`,
    'arch.lifecycle': lifecycle, 'arch.backendNotes': backendNotes, 'arch.frontend': frontend,
    'arch.n.naming': String(n), 'arch.n.places': String(n + 1), 'arch.n.helpers': String(n + 2), 'arch.n.unverified': String(n + 3),
    'arch.naming': section(arch, 5).split('\n').map((l) => {
      if (l.startsWith('| Test files')) return `| Test files | ${nest ? 'API: `*.spec.ts` next to the code, e2e in `test/`' : `API: \`tests/<feature>.test.${ts ? 'ts' : 'js'}\` (\`node --test\`)`}${hasUi ? `; UI: next to the code (\`*.test.${ts ? 'tsx' : 'jsx'}\`)` : ''} | |`;
      if (l.startsWith('| React components') && !hasUi) return null;
      const apiExt = nest || ts ? 'ts' : 'js';
      return l.replace('order-items.service.ts', `order-items.service.${apiExt}`).replace('OrderCard.tsx', `OrderCard.${ts ? 'tsx' : 'jsx'}`);
    }).filter((l) => l !== null).join('\n'), 'arch.places': [`| Job | ${name(s.backend)} |`, '|---|---|', ...places].join('\n'),
    'arch.helpers': section(arch, 7),
    'arch.unverified': bullets(ctx.unverifiedFor([s.backend, s.orm, s.database, s.frontend, s.css, ...(st.combo ? [st.combo.id] : [])].filter(Boolean)), 'Nothing.'),
  }, 'ARCHITECTURE.md');
}

function renderSystemDesign(ctx, lib) {
  const contract = renderProjectContract(ctx, lib);
  const architecture = renderArchitecture(ctx, lib);
  const entities = [
    'erDiagram',
    '  USERS {', '    uuid id PK', '    string email UK', '    string name', '    string role', '    string password_hash', '    datetime created_at', '    datetime updated_at', '  }',
    ...ctx.features.flatMap((f, i) => [`  FEATURE_${i + 1}["${snake(f.slug)}"] {`, '    uuid id PK', '    datetime created_at', '    datetime updated_at', '  }']),
  ].join('\n');
  const modules = ['| Module | Responsibility | Dependencies |', '|---|---|---|',
    '| Auth | Login, refresh tokens, current user and roles | Users, auth middleware |',
    '| Observability | Health, version, public information, monitoring and activities | Database probe, role checks, activity sources |',
    ...ctx.features.map((f) => `| ${f.name} (\`${f.slug}\`) | ${f.description} | Validation, auth, ${ctx.name(ctx.s.orm)}, ${ctx.name(ctx.s.database)} |`)].join('\n');
  return fill(lib.templates['SYSTEM_DESIGN.md'], {
    ...ctx.vars, header: ctx.header('SYSTEM_DESIGN.md'),
    'design.overview': section(architecture, 1), 'design.entities': entities,
    'design.data': section(contract, 5).replace('auth contract (4.4)', 'auth contract (3.4)'),
    'design.api': section(contract, 4).replace(/^### 4\./gm, '### 3.').replace('envelope of 4.1', 'envelope of 3.1'),
    'design.lifecycle': section(section(architecture, 3).replace(/^### /gm, '## '), '3.3 Request lifecycle'),
    'design.modules': modules,
  }, 'SYSTEM_DESIGN.md');
}

function renderDevelopmentStandards(ctx, lib) {
  const architecture = renderArchitecture(ctx, lib);
  const naming = ctx.hasUi ? 5 : 4;
  return fill(lib.templates['DEVELOPMENT_STANDARDS.md'], {
    ...ctx.vars, header: ctx.header('DEVELOPMENT_STANDARDS.md'),
    'standards.naming': section(architecture, naming),
    'standards.places': section(architecture, naming + 1),
    'standards.helpers': section(architecture, naming + 2),
    'standards.data': section(lib.kitDocs['CONVENTIONS.md'], 4),
    'standards.done': section(lib.kitDocs['DEFINITION_OF_DONE.md'], 'Done checklist'),
  }, 'DEVELOPMENT_STANDARDS.md');
}

function renderFrontend(ctx, lib) {
  const { c, p, s, vars, name, ports } = ctx;
  const folder = 'ui';
  const ts = s.language === 'typescript';
  const jsx = ts ? 'tsx' : 'jsx';
  const ext = ts ? 'ts' : 'js';
  const arch = lib.kitDocs['ARCHITECTURE.md'];
  const frontendSection = s.frontend === 'nextjs' ? 4 : 3;
  const frontendTree = tree(section(arch, frontendSection), { slugs: ctx.features.map((f) => f.slug), tsToJs: !ts, dropTypes: !ts,
    rename: [['# QueryClient, theme, toaster', '# providers, theme, toaster']] })
    .split('\n').filter((line) => !line.includes('stores/') && !line.includes('Zustand')).join('\n');
  const scope = `Build only the ${name(s.frontend)} frontend in \`${folder}/\`. A local backend, database, migrations, server authentication and API deployment are outside this project. External API integration requires an existing endpoint contract; do not invent a server or fake responses.`;
  const docText = (id, n) => ctx.sub(section(lib.docs[id].text, n)).replace(/<name>/g, '__LIGHTHOUSE_UI_FOLDER__');
  const rules = vars['rules.fixed'].split('\n').filter((line) => /FR-(014|017|019|021|022)\b/.test(line)).join('\n');
  const features = ctx.features.length ? numbered(ctx.features.map((f) => `**${f.name}**: ${f.description}`)) : 'Feature details are not supplied. Confirm the screens and user interactions from the project description before implementing them.';
  const boundary = 'Keep browser state in the frontend. A connected service owns persistent data and authorization. Do not put secrets or database credentials in browser environment variables. If an external service is supplied, call it through the shared API client and use the documented response contract; otherwise do not add a network dependency.';
  const flow = ['flowchart LR', `  User --> Pages["${name(s.frontend)} pages"]`, '  Pages --> Features["Feature components and hooks"]', '  Features --> State["Browser state"]', '  Features -. "only when an existing API is supplied" .-> Client["Shared API client"]', '  Client -.-> External["External service outside project scope"]'].join('\n');
  const done = checks(['The frontend is scaffolded with the selected official CLI in the configured folder.', 'The chosen screens work with loading, error, empty and success states where applicable.', 'No local backend, database service or server auth is added.', 'Components use semantic design tokens and shared UI primitives.', '`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass in the frontend folder.', 'Keyboard navigation and narrow-screen behavior are checked.', 'README documents setup, the chosen UI port and any external integration.']);
  const instructions = vars['stack.instructions'].replace(/<name>/g, '__LIGHTHOUSE_UI_FOLDER__');
  const layout = `Repository: \`${p.slug}/\`; frontend: \`${folder}/\`; project documentation: \`docs/\`.\n\n\`\`\`text\n${frontendTree}\n\`\`\``;
  const portsText = `Frontend development port: \`${ports.ui}\`. ${ctx.portsAssigned ? '' : 'Choose the port group and project number from `contract-kit/docs/PORTS.md` before running the app.'} No local API or database port is allocated by this package.`;
  const sectionList = (file, title, sections) => [ctx.header(file), `# ${title}: ${p.name}`, ...sections.map(([heading, body]) => `## ${heading}\n${body}`)].join('\n\n') + '\n';
  const contents = {
    'PROJECT_CONTRACT.md': sectionList('PROJECT_CONTRACT.md', 'Project Contract', [
      ['Project', `${vars['project.table']}\n\n${p.description}`], ['Scope', `${scope}\n\n${features}`], ['Technology stack', vars['stack.table']],
      ['Repository and ports', `${layout}\n\n${portsText}`], ['Data and integration boundary', boundary], ['Frontend rules', rules], ['Custom rules', vars['rules.custom']], ['Definition of Done', done], ['Compatibility', vars.compatibility], ['Unverified', vars['unverified.all']],
    ]),
    'ARCHITECTURE.md': sectionList('ARCHITECTURE.md', 'Architecture', [
      ['Scope', scope], ['System overview', `\`\`\`mermaid\n${flow}\n\`\`\``], ['Folders', layout],
      ['Responsibilities', `Pages compose features. Components render UI. Hooks own browser state and asynchronous work. Feature \`api.${ext}\` modules call the shared client only when a real external service is configured. Helpers are pure functions; design tokens live in \`${folder}/src/styles/tokens.css\`.`],
      ['Ports and boundaries', `${portsText}\n\n${boundary}`], ['Selected stack instructions', instructions], ['Unverified', vars['unverified.all']],
    ]),
    'SYSTEM_DESIGN.md': sectionList('SYSTEM_DESIGN.md', 'System Design', [
      ['Scope', scope], ['Interaction and data flow', `\`\`\`mermaid\n${flow}\n\`\`\``], ['Screens and features', features],
      ['State and data ownership', boundary], ['Module relationships', `\`${folder}/src/app/\` composes route pages, \`features/\` owns feature behavior, \`components/ui/\` owns reusable controls, and \`lib/\` owns integrations. No database ERD or local API endpoints are generated for this mode.`],
      ['UI states and acceptance', done], ['Unverified', vars['unverified.all']],
    ]),
    'DEVELOPMENT_STANDARDS.md': sectionList('DEVELOPMENT_STANDARDS.md', 'Development Standards', [
      ['Scope', scope], ['Technology baseline', vars['stack.table']], ['Applicable frontend rules', rules],
      ['Naming and placement', `Feature folders use kebab-case. Components use PascalCase (\`ExampleCard.${jsx}\`); hooks use \`use\` plus camelCase. Put component tests beside components. Keep pages, features, shared components, integrations and pure helpers separate as shown in ARCHITECTURE.md.`],
      ['Selected stack instructions', instructions], ['Integration boundary', boundary], ['Custom rules', vars['rules.custom']], ['Verification', done], ['Unverified', vars['unverified.all']],
    ]),
    'MASTER_PROMPT.md': sectionList('MASTER_PROMPT.md', 'Master Prompt', [
      ['Role and scope', `Implement ${p.name} using the supplied Contract Kit library.\n\n${scope}`], ['Project', `${p.description}\n\n${features}`], ['Stack', vars['stack.table']], ['Folders', layout], ['Ports', portsText],
      ['Frontend instructions', instructions], ['Rules', rules], ['Data boundary', boundary], ['Custom rules', vars['rules.custom']], ['Acceptance', done], ['Unverified', vars['unverified.all']],
      ['How to work', 'Read PROJECT_CONTRACT.md and ARCHITECTURE.md first. Follow PROMPTS/ in order. Run the relevant checks after each step, report exact results, and keep new ideas in the parking lot.'],
    ]),
  };
  const selected = c.outputs ?? OUTPUTS;
  const files = Object.fromEntries(Object.entries(contents).filter(([file]) => selected.includes(file)));
  if (selected.includes('PROMPTS/')) {
    const steps = [
      { key: 'scaffold', title: 'Scaffold the frontend', goal: `Create ${name(s.frontend)} in ${folder}/ using the official CLI.`,
        work: `${docText(s.frontend, 4)}\n\n${docText(s.frontend, 5)}\n\n${docText(s.css, 5)}\n\n${layout}\n\n${portsText}` },
      { key: 'ui-foundation', title: 'Build the frontend foundation', goal: 'Set up routes, design tokens, shared UI components and client state.', work: `${scope}\n\n${instructions}\n\n${boundary}` },
      ...((ctx.features.length ? ctx.features : [{ name: 'Project screens', slug: 'screens', description: features }]).map((f) => ({
        key: `feature-${f.slug}`, title: f.name, goal: f.description,
        work: `Implement the agreed interactions in \`${folder}/src/features/${f.slug}/\`, compose them from pages, and cover keyboard behavior and responsive states. ${boundary}\n\n${vars['rules.custom']}`,
      }))),
      { key: 'release-v1', title: 'Verify and release the frontend', goal: 'Complete the frontend Definition of Done and document setup.', work: `${done}\n\nDocument the configured folder and deployment URL. Report which library claims you verified.` },
    ];
    for (const [i, step] of steps.entries()) {
      step.file = `PROMPTS/${String(i + 1).padStart(2, '0')}-${step.key}.md`;
      files[step.file] = fill(lib.templates['prompts/step.md'], {
        header: ctx.header(step.file), 'step.number': String(i + 1).padStart(2, '0'), 'step.title': step.title,
        'step.previous': i ? `Previous step: ${steps[i - 1].file}` : 'This is the first step.',
        'step.goal': step.goal, 'step.read': 'PROJECT_CONTRACT.md, ARCHITECTURE.md, DEVELOPMENT_STANDARDS.md and the selected library documents.',
        'step.do': step.work, 'step.accept': done, 'step.dont': 'Do not create a backend, database or server authentication. Do not fabricate external responses.', 'step.unverified': vars['unverified.all'],
      }, step.file);
    }
    files['PROMPTS/00-INDEX.md'] = fill(lib.templates['prompts/00-INDEX.md'], {
      header: ctx.header('PROMPTS/00-INDEX.md'), 'project.name': p.name,
      'index.table': ['| # | File | Step |', '|---|---|---|', ...steps.map((step, i) => `| ${i + 1} | ${step.file.slice(8)} | ${step.title} |`)].join('\n'),
    }, '00-INDEX.md');
  }
  return files;
}


/** "Export MD": every generated Markdown file in one document, in reading order. */
export function exportMarkdown(files) {
  const rank = (f) => OUTPUTS.indexOf(f) + 1 || 9;
  const order = Object.keys(files).filter((f) => f.endsWith('.md')).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return order.map((f) => `<!-- file: ${f} -->\n${files[f].replace(/^<!--.*-->\n/, '')}`).join('\n---\n\n');
}

// ---------------------------------------------------------------- file system (Node only)
export async function loadLibrary(kitRoot) {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const libRoot = join(kitRoot, 'library');
  const docs = {};
  (function walk(dir) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (f !== 'outputs' && f !== 'examples' && f !== 'tests') walk(p); continue; }
      if (!f.endsWith('.md') || f.startsWith('_') || f === 'README.md') continue;
      const text = readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); const fm = parseFrontMatter(text);
      if (!fm) continue;
      const unverified = [];
      const ver = fm.category === 'combo' ? section(text, 'Open points (verify on the first app)') : section(text, 12);
      for (const row of tableRows(ver)) if (row.some((c) => c.includes('[?]'))) unverified.push(row.filter((c) => c && !/^\[\?\]$/.test(c)).join(': ').replace(/\s*\[\?\]\s*/g, ' ').trim());
      docs[fm.id] = { fm, text, path: relative(libRoot, p).split('\\').join('/'), unverified };
    }
  })(libRoot);
  const core = docs['core-rules'].text;
  const fixedRules = tableRows(core.slice(core.indexOf('| ID |'))).map(([id, rule]) => ({ id, rule }));
  const read = (...p) => readFileSync(join(kitRoot, ...p), 'utf8').replace(/\r\n/g, '\n');
  const presets = {};
  for (const f of readdirSync(join(libRoot, 'presets'))) if (f.endsWith('.json')) { const x = JSON.parse(readFileSync(join(libRoot, 'presets', f), 'utf8')); presets[x.id] = x; }
  const tdir = join(libRoot, 'outputs', 'templates');
  const templates = {};
  (function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else templates[relative(tdir, p).split('\\').join('/')] = readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); } })(tdir);
  return {
    compat: JSON.parse(read('library', 'compatibility.json')), ruleHints: JSON.parse(read('library', 'core', 'rule-hints.json')),
    docs, fixedRules, templates, presets,
    kitDocs: Object.fromEntries(['DEFINITION_OF_DONE.md', 'CONVENTIONS.md', 'ARCHITECTURE.md', 'OBSERVABILITY.md', 'DESIGN_SYSTEM.md'].map((f) => [f, read('docs', f)])),
    kitTemplates: { 'env.example': read('templates', 'env.example') },
  };
}

const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { readFileSync, writeFileSync, mkdirSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const args = process.argv.slice(2); const mdAt = args.indexOf('--md'); const mdPath = mdAt >= 0 ? args.splice(mdAt, 2)[1] : null;
  const [cfgPath, outDir] = args;
  if (!cfgPath || !outDir) { console.log('Usage: node library/generate.mjs <config.json> <out-dir> [--md <file.md>]'); process.exit(1); }
  const lib = await loadLibrary(join(dirname(fileURLToPath(import.meta.url)), '..'));
  const res = generate(JSON.parse(readFileSync(cfgPath, 'utf8')), lib);
  console.log(`Compatibility: ${res.level.toUpperCase()}`);
  for (const p of res.problems) console.log(`  [${p.level}] ${p.message}`);
  if (!res.ok) { for (const e of res.errors) console.error(`  ERROR ${e}`); console.error('Nothing generated.'); process.exit(1); }
  rmSync(outDir, { recursive: true, force: true });
  for (const [f, content] of Object.entries(res.files)) { const p = join(outDir, f); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); }
  console.log(`Wrote ${Object.keys(res.files).length} files to ${outDir}`);
  if (mdPath) { writeFileSync(mdPath, exportMarkdown(res.files)); console.log(`Wrote ${mdPath}`); }
}
