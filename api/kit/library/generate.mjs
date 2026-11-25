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
  req(Array.isArray(f), '`project.features` must be an array when supplied; a feature list is optional.');
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
  const portEntries = (c.customRules ?? []).filter((r) => r?.overrides?.includes('FR-015'))
    .flatMap((r) => String(r.text ?? '').split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(API|UI|DB)\s*:/i.test(line)));
  const customPorts = new Map();
  for (const entry of portEntries) {
    const match = entry.match(/^(API|UI|DB)\s*:\s*(\d{1,5})$/i);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535) {
      e.push(`Invalid FR-015 port assignment "${entry}"; use API, UI or DB followed by a port from 1 to 65535.`);
      continue;
    }
    const layer = match[1].toLowerCase();
    if ((p.type === 'api' && layer === 'ui') || (p.type === 'frontend' && layer !== 'ui')) e.push(`FR-015 port ${layer.toUpperCase()} does not apply to a ${p.type} project.`);
    if (customPorts.has(layer)) e.push(`FR-015 port ${layer.toUpperCase()} is assigned more than once.`);
    customPorts.set(layer, match[2]);
  }
  if (new Set(customPorts.values()).size !== customPorts.size) e.push('FR-015 API, UI and DB ports must be distinct.');
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
  if (!combo && !problems.some((p) => p.level === 'unsupported')) problems.push({ level: 'allowed', message: c.project.type === 'frontend' ? 'Frontend-only: use the selected frontend library documents; no backend integration is generated.' : 'Integration guidance for this stack is incomplete; verify the connections between the selected technologies.' });
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
  if (outputs.length) Object.assign(files, renderSupportingDocuments(ctx, lib));
  const folders = { api: config.project.folders?.api ?? 'api', ui: config.project.folders?.ui ?? 'ui' };
  for (const key of Object.keys(files)) files[key] = files[key]
    .replace(/(?<![\w/.-])(api|ui)\//g, (match, layer, offset, content) => {
      const linePrefix = content.slice(content.lastIndexOf('\n', offset) + 1, offset);
      return /^[│ ]+[├└]─\s*$/.test(linePrefix) ? match : `${folders[layer]}/`;
    })
    .replace(/\b(npm --prefix|cd) (api|ui)(?=[\s`"';]|$)/g, (_, command, layer) => `${command} ${folders[layer]}`)
    .replaceAll('__LIGHTHOUSE_API_FOLDER__', folders.api).replaceAll('__LIGHTHOUSE_UI_FOLDER__', folders.ui);
  const manifest = {
    generator: `lighthouse@${KIT_VERSION}`, generatedOn: config.generatedOn, configHash: ctx.hash, compatibility: level,
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
  const portGroupAssigned = p.category !== undefined && p.nn !== undefined;
  const nn = portGroupAssigned ? String(p.nn).padStart(2, '0') : 'NN';
  const ports = portGroupAssigned
    ? { api: `3${p.category}${nn}`, ui: hasUi ? `5${p.category}${nn}` : null, db: `2${p.category}${nn}` }
    : { api: '3CNN', ui: hasUi ? '5CNN' : null, db: '2CNN' };
  let customPortAssigned = false;
  for (const r of c.customRules ?? []) if (r.overrides?.includes('FR-015')) {
    for (const line of r.text.split(/\r?\n/)) {
      const match = line.trim().match(/^(API|UI|DB)\s*:\s*(\d{1,5})$/i);
      if (match) { ports[match[1].toLowerCase()] = match[2]; customPortAssigned = true; }
    }
  }
  const applicablePorts = p.type === 'frontend' ? ['ui'] : ['api', 'db', ...(hasUi ? ['ui'] : [])];
  const portsAssigned = applicablePorts.every((layer) => /^\d+$/.test(ports[layer]));
  const portGroupLabel = portGroupAssigned ? `${CATEGORY[p.category]}, NN ${nn}${customPortAssigned ? ' (FR-015 override)' : ''}` : portsAssigned ? 'Custom ports (FR-015 override)' : 'Choose available local ports using docs/PORTS.md';
  const sub = (t) => t.replace(/3CNN/g, ports.api).replace(/2CNN/g, ports.db).replace(/5CNN/g, ports.ui ?? '5CNN');
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

  const header = (file) => `<!-- Generated by Lighthouse from lighthouse.config.json (${hash}). Regenerate instead of editing by hand. -->\n> **${p.name}** · ${file} · generated ${c.generatedOn} · config \`${hash}\` · compatibility **${level.toUpperCase()}**`;

  const stackRows = [...LAYERS.filter(([k]) => s[k]).map(([k, label]) => [label, s[k]]), ...[...coreTools(c, compat), ...st.tools].filter((v, i, a) => a.indexOf(v) === i).map((t) => ['Tool', t])];
  const stackTable = ['| Layer | Choice | Recommended | Checked with npm | Library status |', '|---|---|---|---|---|',
    ...stackRows.map(([label, id]) => { const d = docs[id]; const v = d.fm.versions ?? {}; const u = d.unverified.length;
      return `| ${label} | ${d.fm.name} | ${v.recommended ?? '-'} | ${v.npm_latest ?? '-'} (${d.fm.verified_on}) | ${d.fm.status}${u ? `, ${u} unverified` : ''} |`; })].join('\n');

  const compatBlock = [`**Level: ${level.toUpperCase()}**: ${compat.levels[level]}`, '',
    bullets(problems.map((x) => `[${x.level}] ${x.message}`), '- No warnings.'), '',
    st.combo ? 'Integration guidance is included in `docs/STACK.md`.' : 'Verify integration between the selected technologies and record the result.'].join('\n');

  const envApi = sub(lib.kitTemplates['env.example']).replace(/3101/g, ports.api).replace(/5101/g, ports.ui ?? ports.api).replace(/2101/g, ports.db)
    .replace('# APP_NAME=Example App', `APP_NAME=${p.name}`).replace('# APP_TYPE=EXAMPLE', '# APP_TYPE=').trim();
  // The kit env example is PostgreSQL: other databases take the URL form of their own library document.
  const dbUrl = s.database !== 'postgresql' && docs[s.database] ? section(docs[s.database].text, 8).match(/DATABASE_URL=[^`\s]+/)?.[0] : null;
  const envApiFinal = dbUrl ? envApi.replace(/^DATABASE_URL=.*$/m, sub(dbUrl)) : envApi;
  const uiVar = s.frontend === 'nextjs' ? 'NEXT_PUBLIC_API_URL' : 'VITE_API_URL';
  const envUi = hasUi ? `UI environment example (\`${s.frontend === 'nextjs' ? '.env.local' : '.env'}\`):\n\`\`\`dotenv\n${uiVar}=http://localhost:${ports.api}/api\n\`\`\`` : 'No UI (backend-only scope).';

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
    for (const id of ids) if (docs[id]) for (const u of docs[id].unverified) if (applies(id, u)) out.push(`${name(id)}: ${u}`);
    for (const id of ids) if (docs[id]?.fm.status === 'draft') out.push(`${name(id)} guidance is a **draft**: verify its claims in the project.`);
    return out;
  };
  const unverifiedAll = unverifiedFor(docIds);
  if (!st.combo && p.type !== 'frontend') unverifiedAll.push('No combo document: the wiring between the chosen backend, ORM and database is unverified.');

  const vars = {
    'project.name': p.name,
    'project.table': ['| Field | Value |', '|---|---|', `| Name | ${p.name} |`, `| Slug | \`${p.slug}\` |`,
      `| Category | ${p.domain ? DOMAINS[p.domain] : 'Not set'} |`, `| Type | ${TYPES[p.type]} |`, `| Port group | ${portGroupLabel} |`, `| Purpose | ${PURPOSES[p.purpose]} |`, `| Version | ${p.version} |`].join('\n'),
    'project.description': p.description,
    'project.features': features.length ? numbered(features.map((f) => `**${f.name}**${f.resource && p.type !== 'frontend' ? ` (\`/api/${f.resource}\`)` : ''}: ${f.description}`))
      : `${p.description}\n\nA separate feature list is optional. Derive acceptance criteria from this purpose and the applicable custom rules in \`docs/DEFINITION_OF_DONE.md\`; resolve material ambiguities before implementation.`,
    'project.parkingLot': bullets(c.project.parkingLot ?? [], 'No additional exclusions supplied. Changes to scope must be documented with their acceptance criteria.'),
    'stack.table': stackTable, compatibility: compatBlock,
    'ports.table': ['| | Host port | URL |', '|---|---|---|', `| API | ${ports.api} | http://localhost:${ports.api}/api (Swagger: /api/docs) |`,
      ...(hasUi ? [`| UI | ${ports.ui} | http://localhost:${ports.ui} |`] : []), `| Database | ${ports.db} | container port of ${name(s.database)} |`].join('\n')
      + (portsAssigned ? '' : '\n\nAssign available local ports using the scheme in `docs/PORTS.md`. Replace `3CNN`, `5CNN` and `2CNN` in runnable configuration before starting services.'),
    'env.api': envApiFinal, 'env.ui': envUi,
    'rules.fixed': fixed, 'stack.instructions': instructions, 'rules.custom': custom,
    'unverified.all': bullets(unverifiedAll, 'Nothing: every included document is verified.'),
  };
  return { c, p, s, st, lib, keep, hash, ports, portsAssigned, portGroupAssigned, customPortAssigned, portGroupLabel, hasUi, sub, name, docIds, features, access, header, vars, rules, unverifiedFor };
}

// ---------------------------------------------------------------- PROMPTS/
function renderPrompts(ctx, lib) {
  const { p, s, hasUi, ports, name, features, access } = ctx;
  const nest = s.backend === 'nestjs';
  const jsx = s.language === 'typescript' ? 'tsx' : 'jsx';
  const docText = (id, n) => ctx.sub(ctx.keep(id, section(lib.docs[id].text, n)))
    .replace(/<name>/g, id === s.frontend ? '__LIGHTHOUSE_UI_FOLDER__' : '__LIGHTHOUSE_API_FOLDER__');
  const steps = [];
  const add = (key, title, body) => steps.push({ key, title, ...body });
  const read = bullets(['`docs/PROJECT_CONTRACT.md`', '`docs/ARCHITECTURE.md`', '`docs/STACK.md`', '`docs/DEFINITION_OF_DONE.md`']);
  const unverified = ctx.vars['unverified.all'];

  add('scaffold', 'Scaffold the repository', {
    goal: `Create the repository for ${p.name} using the selected stack and document the agreed scope.`, read,
    do: [
      `Create \`${p.slug}/\` with \`api/\`, ${hasUi ? '`ui/`, ' : ''}\`docs/\`, \`README.md\` and \`CHANGELOG.md\`. Preserve the supplied project documents. Review the purpose, exclusions and acceptance criteria in the Definition of Done; a feature list is optional.`,
      `Assign available local ports using \`docs/PORTS.md\`. ${ctx.portsAssigned ? `Use API ${ports.api}${hasUi ? `, UI ${ports.ui}` : ''} and database ${ports.db}.` : 'Select the category and two-digit project number, calculate the ports, and replace all 3CNN, 5CNN and 2CNN markers before running commands.'}`,
      `### Backend scaffold and install\n${docText(s.backend, 4)}\n\n${docText(s.backend, 5)}\n\n${docText(s.language, 4)}`,
      `### Database tooling\n${docText(s.orm, 4)}\n\n${docText(s.orm, 5)}\n\n${docText(s.database, 4)}`,
      ...(hasUi ? [`### Frontend scaffold and install\n${docText(s.frontend, 4)}\n\n${docText(s.frontend, 5)}\n\n${docText(s.css, 5)}`] : []),
      'Configure real dev, build, start, typecheck, lint and test commands for each application. Root scripts delegate to each configured folder. Add database setup, migrate, seed and reset commands for the selected ORM. Configure compose for the selected database with a persistent volume, healthcheck and environment-supplied credentials.',
      `### Environment\nCreate backend \`.env.example\` from these values; replace local credential examples and never commit secrets:\n\`\`\`dotenv\n${ctx.vars['env.api']}\n\`\`\`\n${ctx.vars['env.ui']}`,
    ].join('\n\n'),
    accept: checks(['The folders match the supplied architecture.', 'Official scaffolding commands and chosen local ports are recorded.', 'Application dev commands start; the database healthcheck succeeds.', 'Scope and acceptance criteria are recorded without requiring a feature list.']),
    dont: bullets(['Recreate an official scaffold by hand.', 'Add business behavior outside the agreed scope.', 'Use unresolved port markers in runnable configuration.']), unverified,
  });
  add('api-foundation', 'Implement the API foundation', {
    goal: 'Implement the response contract, validation, pagination, environment handling and observability in the project.',
    read: `${read}\n- \`docs/CONVENTIONS.md\`\n- \`docs/OBSERVABILITY.md\``,
    do: numbered([
      `Create \`api/src/common/\`, \`api/src/helpers/\` and \`api/src/observability/\` in ${name(s.language)}. Implement the shared interfaces listed in the project contract; these files are project code to create and test.`,
      nest ? 'Implement requestId middleware, ResponseInterceptor, HttpExceptionFilter, ZodValidationPipe and pagination helpers. Register middleware, the global interceptor and exception filter in bootstrap; set the /api prefix and Swagger at /api/docs.' : 'Implement requestId middleware, AppError, sendSuccess, sendCreated, sendPaginated, sendError, validate, asyncHandler, notFoundHandler and errorHandler. Keep app creation in src/app and listening in src/server; requestId runs first and errorHandler last. Configure Swagger UI at /api/docs.',
      'Apply the documented envelope on success, validation failures and unknown routes. Set X-Request-Id consistently. Parse page, limit, q and whitelisted sort fields; reject limits outside 1-100.',
      'Validate environment variables with Zod at boot. Invalid required values must stop startup with a clear error; keep secrets out of responses and logs.',
      `Implement the observability registration interface and response shapes from docs/OBSERVABILITY.md with application name ${p.name}. Require an explicit access policy for monitoring and activities. Before authentication exists, reject unauthenticated access with 401. Public endpoints must not expose personal data.`,
      'Write contract tests against the actual HTTP application for envelope keys, request ids, errors, pagination and protected observability. Implement database probes and activity-source interfaces; connect real data in the following steps.',
    ]),
    accept: checks(['GET /api/health, /api/version and /api/public return the documented envelope and X-Request-Id.', 'Monitoring and activities return 401 without a token.', 'Unknown routes return 404 NOT_FOUND; invalid input returns 400 VALIDATION_ERROR.', 'Swagger lists the implemented endpoints.', 'Contract tests, typecheck and lint pass.']),
    dont: bullets(['Bypass the shared response helpers in application controllers.', 'Permit anonymous monitoring or activities outside tests.', 'Present fake database status or activity data as real.']), unverified,
  });
  add('database', `Connect ${name(s.orm)} and ${name(s.database)}`, {
    goal: 'Connect real persistence, define the authentication schema and verify database setup.', read,
    do: [
      `### Configuration\n${docText(s.orm, 8)}\n\n${docText(s.database, 8)}`,
      ...(ctx.st.combo ? [`### Integration\n${ctx.sub(section(lib.docs[ctx.st.combo.id].text, 'Wiring'))}`] : []),
      'Create the users schema with UUID identity, unique email, name, role, password hash and UTC created/updated timestamps. Follow the documented camelCase JSON and snake_case storage conventions. Use the schema-change mechanism appropriate to the selected database and record rollback steps.',
      'Implement an idempotent admin seed using environment-supplied credentials and bcryptjs. Connect the real database health probe. Test setup against an empty database and a repeat seed run.',
      `${docText(s.orm, 9)}\n${docText(s.database, 9)}`,
    ].join('\n\n'),
    accept: checks(['Database setup works from an empty database.', 'Schema changes and rollback are documented and verified.', 'Running the seed twice creates only one admin.', 'The health probe distinguishes connected and disconnected database states.']),
    dont: bullets(['Hard-code admin credentials.', 'Change persisted schemas without a recorded migration or database-appropriate change procedure.', 'Expose password hashes in API responses.']), unverified,
  });
  add('auth', 'Implement authentication and roles', {
    goal: 'Implement the documented login, refresh and current-user contract and enforce access checks.',
    read: `${read}\n- \`docs/CONVENTIONS.md\` (authentication)`,
    do: numbered([
      'Implement POST /api/auth/login, POST /api/auth/refresh and GET /api/auth/me using the users schema. Validate bodies, verify bcryptjs password hashes and sign tokens with the documented payload and lifetimes.',
      nest ? 'Implement an authentication guard, @Roles and @CurrentUser in common/auth. Populate req.user = { id, role }.' : 'Implement shared auth middleware and requireRoles; populate req.user = { id, role } before protected handlers.',
      'Record the refresh-token storage, expiry, rotation and revocation design before implementation. Reject invalid, expired and wrong-purpose tokens; do not log tokens or secrets.',
      'Run authentication before observability access checks. Return 401 without valid authentication and 403 for an authenticated role without permission.',
      'Test login success, wrong credentials, refresh success and rejection, current-user response fields, and monitoring access for USER, STAFF and ADMIN.',
    ]),
    accept: checks(['Wrong credentials and invalid tokens return 401 UNAUTHORIZED.', 'Current-user responses contain id, email, name and role without secrets.', 'Monitoring returns 401 anonymously, 403 for USER and 200 for ADMIN or STAFF.', 'Authentication and authorization tests pass.']),
    dont: bullets(['Invent roles outside ADMIN, STAFF and USER.', 'Include passwords, email or name in token payloads.', 'Accept a refresh token as an access token.']), unverified,
  });
  if (hasUi) add('ui-foundation', `Implement the ${name(s.frontend)} foundation`, {
    goal: 'Create shared UI infrastructure, authentication routes and accessible application states.',
    read: `${read}\n- \`docs/DESIGN_SYSTEM.md\``,
    do: numbered([
      `Implement \`ui/src/lib/api-client.${s.language === 'typescript' ? 'ts' : 'js'}\` with createApiClient, ApiError, unwrapItem, unwrapList and unwrapPage according to the response contract. Add request authentication and bounded refresh handling in this shared client.`,
      `Implement \`error-messages\` and \`components/QueryState.${jsx}\` for consistent loading, error, retry and empty states; render children on success. Keep pure helpers separate.`,
      'Create styles/tokens.css with brand, semantic, typography and shape tokens. Use the supplied project brand when available; otherwise record a provisional accessible palette as a design assumption. Components consume semantic tokens only.',
      docText(s.css, 8),
      `${uiVar(s)} points to the configured backend. ${ctx.st.tools.includes('tanstack-query') ? 'Create one QueryClient provider for server state.' : 'Implement shared request state with the selected tools.'}`,
      'Add login, protected routes, logout and a not-found page using the selected frontend router. Login calls the real API, protected routes require a session, and logout clears authentication state.',
    ]),
    accept: checks(['Login and logout work against the real API; protected routes redirect without a session.', 'Loading, empty, error, retry and success states render correctly.', 'Keyboard use and narrow-screen layouts are checked.', 'Components contain no raw colors or direct axios calls.', 'Frontend tests, build, typecheck and lint pass.']),
    dont: bullets(['Fabricate API responses.', 'Duplicate authentication or error handling across components.', 'Expose secrets through public environment variables.']), unverified,
  });
  const work = features.length ? features : [{ name: 'Agreed project scope', slug: null, description: p.description }];
  for (const f of work) {
    const roles = f.slug ? access(f) : null;
    add(f.slug ? `feature-${f.slug}` : 'implementation', f.slug ? `Implement ${f.name}` : 'Implement the agreed scope', {
      goal: f.description, read,
      do: numbered([
        'Translate the project description and applicable custom rules into observable user or API outcomes. Record fields, validation, permissions and acceptance criteria before implementing behavior. A separate feature list is optional; do not invent generic CRUD resources when the scope does not call for them.',
        ...(f.slug ? [`Implement the requested ${f.name} behavior in \`api/src/modules/${f.slug}/\`${hasUi ? ` and \`ui/src/features/${f.slug}/\`` : ''}. Resource route: \`/api/${f.slug}\`; allowed read roles: ${roles.read.join(', ')}; write roles: ${roles.write.join(', ')}. Add only the endpoints needed by the scope.`] : ['Organize behavior into domain modules derived from the agreed scope. Resolve decisions that materially affect behavior, data, access or scope before implementing them.']),
        'Keep controllers focused on validated input and responses, services on business logic, and persistence changes in the appropriate schema-change procedure. Document actual endpoints in Swagger and connect real activity sources where relevant.',
        ...(hasUi ? ['Compose pages from domain components and hooks. Use the shared client, QueryState and semantic design tokens. Cover validation, loading, empty, error and success behavior.'] : []),
        'Test the requested end-to-end outcome plus relevant validation, missing-resource and forbidden-access paths. Run the affected checks and record the evidence in docs/DEFINITION_OF_DONE.md.',
        `Apply the project custom rules:\n${ctx.vars['rules.custom']}`,
      ]),
      accept: checks(['The agreed outcomes are implemented and have recorded verification results.', 'Implemented endpoints and data shapes match the documented contract.', 'Applicable regression, authorization and validation tests pass.', 'Build, typecheck and lint pass for affected applications.']),
      dont: bullets(['Add unrelated behavior.', 'Treat an absent feature list as a blocker.', 'Mark untested acceptance criteria complete.']), unverified,
    });
  }
  add('verification', 'Verify completion and document delivery', {
    goal: `Verify ${p.name} against the scope-based Definition of Done.`, read,
    do: numbered(['Run every applicable check in docs/DEFINITION_OF_DONE.md against the actual implementation.', 'Record commands, results, manual checks and remaining blockers. Leave unverified criteria unchecked; explain any not-applicable criteria.', 'Update README setup, environment values, chosen ports and the change record. Record deployment details only when deployment is in the agreed scope.', 'Document scope changes and resolve relevant unverified assumptions.']),
    accept: doneChecklist(ctx),
    dont: bullets(['Declare completion while required checks are failing or blocked.', 'Require an arbitrary feature count or a release-stage label.']), unverified,
  });
  const files = {};
  for (const [i, step] of steps.entries()) {
    step.num = String(i + 1).padStart(2, '0');
    step.file = `PROMPTS/${step.num}-${step.key}.md`;
    files[step.file] = fill(lib.templates['prompts/step.md'], {
      header: ctx.header(step.file), 'step.number': step.num, 'step.title': step.title,
      'step.previous': i ? `Previous step: \`${steps[i - 1].file.slice(8)}\` must be accepted first.` : 'This is the first step.',
      'step.goal': step.goal, 'step.read': step.read, 'step.do': step.do, 'step.accept': step.accept, 'step.dont': step.dont, 'step.unverified': step.unverified,
    }, step.file);
  }
  files['PROMPTS/00-INDEX.md'] = fill(lib.templates['prompts/00-INDEX.md'], {
    header: ctx.header('PROMPTS/00-INDEX.md'), 'project.name': p.name,
    'index.table': ['| # | File | Step |', '|---|---|---|', ...steps.map((step) => `| ${step.num} | \`${step.file.slice(8)}\` | ${step.title} |`)].join('\n'),
  }, '00-INDEX.md');
  return files;
}
const uiVar = (s) => (s.frontend === 'nextjs' ? '`NEXT_PUBLIC_API_URL` in `.env.local`' : '`VITE_API_URL` in `.env`');

function doneChecklist(ctx) {
  const frontendOnly = ctx.p.type === 'frontend';
  return checks([
    'Purpose, agreed scope, exclusions and observable acceptance criteria are documented; a feature list is optional.',
    'Requested outcomes work end to end and each acceptance criterion has a recorded verification result.',
    ...(!frontendOnly ? [
      'API responses, request ids, validation, pagination and error codes follow docs/CONVENTIONS.md; actual endpoints are documented in Swagger.',
      'Authentication and role restrictions pass success and rejection tests; monitoring and activities require ADMIN or STAFF.',
      'Database setup, schema changes, rollback and idempotent seed behavior are verified against real persistence.',
      'Environment values are validated at startup; secrets and personal data are excluded from public responses and logs.',
    ] : ['Browser-only boundaries are respected; any external service integration follows an existing endpoint contract without fabricated responses.']),
    ...(ctx.hasUi ? [
      'Applicable loading, empty, error, retry and success states work through shared UI primitives.',
      'Keyboard access, form validation and narrow-screen layouts are checked; components use semantic design tokens.',
    ] : []),
    'Applicable build, typecheck, lint and test commands pass; exact commands and results are recorded.',
    'README documents reproducible setup, environment configuration, chosen local ports and relevant decisions.',
    'Deployment is verified only when requested in scope; unverified assumptions, skipped checks and blockers are disclosed.',
  ]);
}

function renderSupportingDocuments(ctx, lib) {
  const { p, vars } = ctx;
  const frontendOnly = p.type === 'frontend';
  const file = 'docs/DEFINITION_OF_DONE.md';
  const instructions = lib.kitDocs['DEFINITION_OF_DONE.md'];
  const evidence = ['| Criterion | Verification command or manual procedure | Result | Evidence or blocker |', '|---|---|---|---|',
    ...doneChecklist(ctx).split('\n').map((line) => `| ${line.slice(6).replaceAll('|', '\\|')} | Record when checked | Not verified | No implementation evidence recorded |`)].join('\n');
  const files = {
    [file]: [ctx.header(file), `# Definition of Done: ${p.name}`, '## Purpose and agreed scope', p.description,
      `Project type: ${TYPES[p.type]}.`, ...(ctx.features.length ? ['### Optional feature details', vars['project.features']] : []), '### Outside the agreed scope', vars['project.parkingLot'],
      '### Applicable project rules', vars['rules.custom'], '## Before implementation', section(instructions, 'Before implementation'),
      '## Done checklist', doneChecklist(ctx), '## Verification record', evidence,
      '## Evidence and scope changes', section(instructions, 'Evidence and scope changes')].join('\n\n') + '\n',
    'docs/PORTS.md': frontendOnly
      ? `# Frontend port\n\nUse an available UI development port. ${ctx.portsAssigned ? `Assigned: ${ctx.ports.ui}.` : 'For the 5CNN scheme, C is category 1 or 3 and NN is a two-digit project number; choose available values and replace the marker before running the application.'} Record the chosen value in the README. No local server or database is required.\n`
      : `${lib.kitDocs['PORTS.md'].trim()}\n\n## This project\n\nAPI: \`${ctx.ports.api}\` · ${ctx.hasUi ? `UI: \`${ctx.ports.ui}\` · ` : ''}DB: \`${ctx.ports.db}\`. ${ctx.customPortAssigned ? 'Assigned by FR-015 override.' : ctx.portGroupAssigned ? 'Assigned from the category and project number.' : 'Assign unresolved ports before running services.'}\n`,
  };
  if (frontendOnly) {
    Object.assign(files, Object.fromEntries(Object.entries(renderFrontend({ ...ctx, c: { ...ctx.c, outputs: ['PROJECT_CONTRACT.md', 'ARCHITECTURE.md'] } }, lib)).map(([path, content]) => [`docs/${path}`, content])));
    files['docs/CONVENTIONS.md'] = '# Frontend integration conventions\n\nUse an existing endpoint contract only when an external service is in scope. The browser owns presentation and local state; the external service owns persistence and authorization. Do not implement a local backend or fabricate service responses. Validate user input and handle loading, errors and empty states consistently.\n';
  } else {
    files['docs/PROJECT_CONTRACT.md'] = renderProjectContract(ctx, lib);
    files['docs/ARCHITECTURE.md'] = renderArchitecture(ctx, lib);
    files['docs/CONVENTIONS.md'] = lib.kitDocs['CONVENTIONS.md'];
    files['docs/OBSERVABILITY.md'] = lib.kitDocs['OBSERVABILITY.md'];
  }
  if (ctx.hasUi) files['docs/DESIGN_SYSTEM.md'] = lib.kitDocs['DESIGN_SYSTEM.md'];
  const selected = ctx.docIds.filter((id) => id !== 'core-rules');
  const stack = selected.map((id) => {
    const doc = lib.docs[id];
    const content = doc.fm.category === 'combo'
      ? `### Integration\n${ctx.sub(section(doc.text, 'Wiring'))}`
      : [[4, 'Scaffold'], [5, 'Install'], [7, 'Scripts'], [8, 'Configuration'], [9, 'Rules'], [10, 'Pitfalls']].map(([n, title]) => `### ${title}\n${ctx.sub(ctx.keep(id, section(doc.text, n)))}`)
        .filter((text) => !text.endsWith('\n')).join('\n\n');
    return `## ${doc.fm.name}\n\n${content}`;
  });
  files['docs/STACK.md'] = [ctx.header('docs/STACK.md'), '# Selected stack implementation',
    'Create and test the project code using these implementation requirements. Recorded library checks describe prior reference work; verify applicability in this project.',
    ...stack, '## Open verification points', vars['unverified.all']].join('\n\n') + '\n';
  return files;
}


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
    ...features.flatMap((f) => { const a = access(f); const r = f.slug; return [
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
    ...features.map((f) => `| \`${snake(f.slug)}\` | \`id\` (UUID), the fields of ${f.name} (decided in its step, before coding), \`created_at\`, \`updated_at\` | feature ${f.name} |`)].join('\n');
  const impl = nest ? [
    ['Envelope', '`api/src/common/contract/envelope.ts` + `interceptors/response.interceptor.ts`', 'services return raw values; the interceptor wraps them'],
    ['Errors', '`api/src/common/filters/http-exception.filter.ts`', 'throw `NotFoundException` etc.'],
    ['Request id', '`api/src/common/middlewares/request-id.middleware.ts`', ''],
    ['Validation', '`api/src/common/pipes/zod-validation.pipe.ts` + `modules/<feature>/dto/*.dto.ts`', 'Zod schema + inferred type'],
    ['Pagination', '`api/src/common/pagination/pagination.ts`', '`new Paginated(items, buildPagination(...))`'],
    ['Env', '`api/src/common/config/env.ts`', 'Zod, at boot'],
    ['Auth', '`api/src/common/auth/`', 'implement types, guard, `@Roles` and `@CurrentUser` in the project'],
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
    ['Swagger', '`/api/docs`', 'configure `swagger-ui-express` and document the actual routes'],
  ];
  if (hasUi) impl.push(['UI: envelope', `\`ui/src/lib/api-client.${fe}\``, '`createApiClient`, `unwrapItem`, `unwrapList`, `unwrapPage`, `ApiError`'],
    ['UI: error codes', `\`ui/src/lib/error-messages.${fe}\``, '`error.code` -> message (`toastMessageFor`)'],
    ['UI: states', `\`ui/src/components/QueryState.${fx}\``, 'loading, empty, error'],
    ['UI: tokens', '`ui/src/styles/tokens.css`', 'the only file with raw colours']);
  const implTable = ['| Part of the contract | File in this project | Notes |', '|---|---|---|', ...impl.map((r) => `| ${r.join(' | ')} |`)].join('\n')
    + '\n\nImplement these interfaces in the project using the bundled specifications. Verify behavior with contract tests; no external source folder is required.';
  return fill(lib.templates['PROJECT_CONTRACT.md'], {
    ...vars, header: ctx.header('PROJECT_CONTRACT.md'),
    'project.info': ['| Field | Value |', '|---|---|', `| Project Name | ${p.name} |`, `| Project Type | ${TYPES[p.type]} |`, `| Project Purpose | ${PURPOSES[p.purpose]} |`,
      `| Project Version | ${p.version} |`, `| Category | ${p.domain ? DOMAINS[p.domain] : 'Not set'} |`, `| Repository | \`${p.slug}/\` |`,
      `| Port group | ${ctx.portGroupLabel} |`,
      `| Ports | API ${ports.api}${hasUi ? ` · UI ${ports.ui}` : ''} · DB ${ports.db} |`].join('\n'),
    'api.baseUrl': api, 'api.endpoints': endpoints, 'api.endpointNotes': notes,
    'conv.envelope': section(conv, 1), 'conv.query': section(conv, 3), 'conv.auth': section(conv, 5), 'conv.data': section(conv, 4),
    'obs.shapes': section(lib.kitDocs['OBSERVABILITY.md'], 'Response shapes').split('Example App').join(p.name),
    'data.tables': tables, 'impl.table': implTable,
    dod: doneChecklist(ctx),
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
  const backendNotes = bullets([...(ormMismatch ? [`The base tree uses ${nest ? 'Prisma' : 'Sequelize'}; adapt persistence placement to ${name(s.orm)} using the selected database guidance in \`docs/STACK.md\`.`] : []),
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
    'arch.summary': `${p.name} is ${hasUi ? `${an(name(s.frontend))} UI and ` : ''}${an(name(s.backend))} API, written in ${lang}, storing data in ${name(s.database)} through ${name(s.orm)}. Implement the folders, interfaces and request lifecycle below in the project. The bundled project contract specifies the observable behavior.`,
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
    'standards.done': doneChecklist(ctx),
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
  const done = doneChecklist(ctx);
  const instructions = vars['stack.instructions'].replace(/<name>/g, '__LIGHTHOUSE_UI_FOLDER__');
  const layout = `Repository: \`${p.slug}/\`; frontend: \`${folder}/\`; project documentation: \`docs/\`.\n\n\`\`\`text\n${frontendTree}\n\`\`\``;
  const portsText = `Frontend development port: \`${ports.ui}\`. ${ctx.portsAssigned ? '' : 'Choose an available UI port using docs/PORTS.md before running the app.'} No local API or database port is allocated by this package.`;
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
      ['Role and scope', `Implement ${p.name} using the bundled project specifications.\n\n${scope}`], ['Project', `${p.description}\n\n${features}`], ['Stack', vars['stack.table']], ['Folders', layout], ['Ports', portsText],
      ['Frontend instructions', instructions], ['Rules', rules], ['Data boundary', boundary], ['Custom rules', vars['rules.custom']], ['Acceptance', done], ['Unverified', vars['unverified.all']],
      ['How to work', 'Read docs/PROJECT_CONTRACT.md, docs/ARCHITECTURE.md and docs/DEFINITION_OF_DONE.md first. Follow PROMPTS/ in order when included. Run relevant checks after each step, report exact results and document changes to scope. A feature list is optional.'],
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
      { key: 'verification', title: 'Verify frontend completion', goal: 'Complete the frontend Definition of Done and document setup.', work: `${done}\n\nDocument setup, the configured folder and deployment details when deployment is in scope. Record verification evidence and remaining blockers.` },
    ];
    for (const [i, step] of steps.entries()) {
      step.file = `PROMPTS/${String(i + 1).padStart(2, '0')}-${step.key}.md`;
      files[step.file] = fill(lib.templates['prompts/step.md'], {
        header: ctx.header(step.file), 'step.number': String(i + 1).padStart(2, '0'), 'step.title': step.title,
        'step.previous': i ? `Previous step: ${steps[i - 1].file}` : 'This is the first step.',
        'step.goal': step.goal, 'step.read': 'docs/PROJECT_CONTRACT.md, docs/ARCHITECTURE.md, docs/STACK.md and docs/DEFINITION_OF_DONE.md.',
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
    kitDocs: Object.fromEntries(['DEFINITION_OF_DONE.md', 'CONVENTIONS.md', 'ARCHITECTURE.md', 'OBSERVABILITY.md', 'DESIGN_SYSTEM.md', 'PORTS.md'].map((f) => [f, read('docs', f)])),
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
