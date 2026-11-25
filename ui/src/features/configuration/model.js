/** Configuration model: defaults, clean-up before sending, and the reducer behind the three accordions. */
import { slugify } from '../../helpers/index.js';

export const AVAILABLE_OUTPUTS = ['PROJECT_CONTRACT.md', 'ARCHITECTURE.md', 'SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md', 'MASTER_PROMPT.md', 'PROMPTS/'];
const OUTPUT_CATALOG_VERSION = 2;
const NEW_OUTPUTS = ['SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md'];
/** Every UI project uses these; they are not a choice in the form. */
export const UI_TOOLS = ['axios', 'tanstack-query'];
const PORT_LABELS = { api: 'API', ui: 'UI', db: 'DB' };
const portLine = /^(API|UI|DB)\s*:\s*(.*)$/i;

export function portRuleValues(text = '') {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(portLine);
    if (match) values[match[1].toLowerCase()] = match[2];
  }
  return values;
}

export function updatePortRuleText(text = '', layer, value) {
  const values = portRuleValues(text);
  values[layer] = value.trim();
  const notes = text.split(/\r?\n/).filter((line) => !portLine.test(line.trim()) && line.trim());
  return [...Object.entries(PORT_LABELS).filter(([key]) => values[key]).map(([key, label]) => `${label}: ${values[key]}`), ...notes].join('\n');
}

export function portRuleNotes(text = '') {
  return text.split(/\r?\n/).filter((line) => !portLine.test(line.trim())).join('\n').trim();
}

export function updatePortRuleNotes(text = '', notes = '') {
  const values = portRuleValues(text);
  return [...Object.entries(PORT_LABELS).filter(([key]) => values[key]).map(([key, label]) => `${label}: ${values[key]}`), notes.trim()].filter(Boolean).join('\n');
}

export const defaultConfig = () => ({
  schemaVersion: 1,
  outputCatalogVersion: OUTPUT_CATALOG_VERSION,
  preset: 'custom',
  project: {
    name: 'Lighthouse 123', slug: 'lighthouse-123', type: 'web-app', domain: 'cms', purpose: 'commercial', version: '',
    description: 'A web-based CMS and backoffice for managing articles, media, and content.', parkingLot: [], folders: { api: 'api', ui: 'ui' },
  },
  stack: { language: 'javascript', frontend: 'react-vite', css: 'tailwindcss', backend: 'express', orm: 'sequelize', database: 'postgresql' },
  customRules: [],
  outputs: [...AVAILABLE_OUTPUTS],
});

/** What is sent to the API: trimmed, optional fields left out when empty, fixed tools added. */
export function sanitize(c) {
  const p = c.project;
  const api = p.type === 'api';
  const frontend = p.type === 'frontend';
  const lot = (p.parkingLot ?? []).map((x) => x.trim()).filter(Boolean);
  return {
    schemaVersion: 1,
    outputCatalogVersion: OUTPUT_CATALOG_VERSION,
    preset: c.preset,
    project: {
      name: p.name.trim(), slug: p.slug.trim() || slugify(p.name), type: p.type, ...(p.domain && { domain: p.domain }),
      purpose: p.purpose, version: p.version.trim() || '1.0.0', description: p.description.trim(), ...(lot.length && { parkingLot: lot }),
      ...(p.features !== undefined && { features: p.features }),
      folders: { api: frontend ? null : p.folders.api.trim(), ui: api ? null : p.folders.ui.trim() },
    },
    stack: {
      language: c.stack.language, frontend: api ? null : c.stack.frontend, css: api ? null : c.stack.css,
      backend: frontend ? null : c.stack.backend, orm: frontend ? null : c.stack.orm, database: frontend ? null : c.stack.database, tools: api ? [] : [...UI_TOOLS],
    },
    customRules: c.customRules.filter((r) => r.text.trim() || r.overrides?.length).map((r) => ({
      text: r.text.trim(), ...(r.overrides?.length && { overrides: r.overrides, reason: r.reason?.trim() ?? '' }),
    })),
    outputs: c.outputs.filter((o) => AVAILABLE_OUTPUTS.includes(o)),
  };
}

/** A saved config may miss UI-only defaults: fill them. */
export function hydrate(config) {
  const b = defaultConfig();
  const p = { ...b.project, ...config?.project };
  const { tools: _tools, ...stack } = { ...b.stack, ...config?.stack };
  const selected = config?.outputs ?? b.outputs;
  const outputs = (config?.outputCatalogVersion ?? 1) < OUTPUT_CATALOG_VERSION ? [...selected, ...NEW_OUTPUTS] : selected;
  return {
    ...b, ...config,
    outputCatalogVersion: OUTPUT_CATALOG_VERSION,
    project: { name: p.name, slug: p.slug, type: p.type, domain: p.domain ?? '', purpose: p.purpose, version: p.version === '1.0.0' ? '' : p.version, description: p.description, ...(p.features !== undefined && { features: p.features }), parkingLot: p.parkingLot ?? [], folders: { api: p.folders?.api ?? 'api', ui: p.folders?.ui ?? 'ui' } },
    stack: Object.fromEntries(Object.entries(stack).map(([key, value]) => [key, value ?? b.stack[key]])),
    customRules: (config?.customRules ?? []).map((r) => ({ reason: '', overrides: [], ...r })),
    outputs: AVAILABLE_OUTPUTS.filter((o) => outputs.includes(o)),
  };
}

export function reducer(state, action) {
  const c = state;
  switch (action.type) {
    case 'load': return hydrate(action.config);
    case 'project': {
      const project = { ...c.project, [action.field]: action.value };
      if (action.field === 'name' && !action.slugTouched) project.slug = slugify(action.value);
      return { ...c, project, ...(action.field === 'type' && { preset: 'custom' }) };
    }
    case 'parkingLot': return { ...c, project: { ...c.project, parkingLot: action.value } };
    case 'folder': return { ...c, project: { ...c.project, folders: { ...c.project.folders, [action.layer]: action.value } } };
    case 'stack': return { ...c, preset: 'custom', stack: { ...c.stack, [action.field]: action.value } };
    case 'preset': {
      if (action.preset === null) return { ...c, preset: 'custom' };
      const { tools: _tools, ...s } = action.preset.stack;
      const api = !s.frontend;
      return {
        ...c, preset: action.preset.id,
        stack: { ...s, frontend: s.frontend ?? c.stack.frontend, css: s.css ?? c.stack.css },
        project: { ...c.project, type: api ? 'api' : 'web-app' },
      };
    }
    case 'addRule': return { ...c, customRules: [...c.customRules, { text: '', overrides: [], reason: '' }] };
    case 'rule': return { ...c, customRules: c.customRules.map((r, i) => (i === action.index ? { ...r, ...action.patch } : r)) };
    case 'removeRule': return { ...c, customRules: c.customRules.filter((_, i) => i !== action.index) };
    case 'toggleOutput': {
      const has = c.outputs.includes(action.id);
      return { ...c, outputs: has ? c.outputs.filter((o) => o !== action.id) : AVAILABLE_OUTPUTS.filter((o) => o === action.id || c.outputs.includes(o)) };
    }
    default: return c;
  }
}

/** "`project.name` is required ..." -> { 'project.name': message }; the rest stays general. */
export function errorsByPath(errors = []) {
  const byPath = {}; const general = [];
  for (const e of errors) {
    const m = e.match(/^`([^`]+)`/);
    if (m) byPath[m[1]] ??= e.replace(/^`[^`]+`\s*/, '').replace(/^\w/, (x) => x.toUpperCase());
    else general.push(e);
  }
  return { byPath, general };
}
