#!/usr/bin/env node
/** Structure check for the library: node library/validate.mjs */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocs } from './resolve.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const compat = JSON.parse(readFileSync(join(root, 'compatibility.json'), 'utf8'));
const docs = loadDocs();
const errors = [];
const STATUS = ['draft', 'partial', 'verified'];
const SECTIONS = ['## 1.', '## 2.', '## 3.', '## 4.', '## 5.', '## 6.', '## 7.', '## 8.', '## 9.', '## 10.', '## 11.', '## 12.', '## 13.'];

for (const [id, d] of Object.entries(docs)) {
  if (!STATUS.includes(d.status)) errors.push(`${d.path}: status "${d.status}" is not one of ${STATUS}`);
  if (!d.verified_on || !/^\d{4}-\d{2}-\d{2}$/.test(d.verified_on)) errors.push(`${d.path}: verified_on missing or not YYYY-MM-DD`);
  if (!d.path.includes(id)) errors.push(`${d.path}: file name does not match id "${id}"`);
  if (d.category && !['core', 'combo'].includes(d.category)) {
    const text = readFileSync(join(root, d.path), 'utf8');
    for (const s of SECTIONS) if (!text.includes(s)) errors.push(`${d.path}: missing section "${s}"`);
    if (d.status === 'verified' && /\[\?\]/.test(text)) errors.push(`${d.path}: status verified but has [?] claims`);
    if (d.status !== 'draft' && !/\[V\]|\[T\]/.test(text)) errors.push(`${d.path}: status ${d.status} but no [V] or [T] evidence`);
  }
}
for (const [cat, ids] of Object.entries(compat.choices)) for (const id of ids) if (!docs[id]) errors.push(`compatibility.json: choice "${id}" (${cat}) has no doc`);
for (const id of [...compat.tools, ...compat.alwaysInclude]) if (!docs[id]) errors.push(`compatibility.json: "${id}" has no doc`);
for (const c of compat.supportedCombos) if (!docs[c.id]) errors.push(`compatibility.json: combo "${c.id}" has no doc`);
for (const r of compat.rules) for (const [k, v] of Object.entries(r.when)) if (!compat.choices[k]?.includes(v)) errors.push(`compatibility.json: rule refers to unknown ${k}=${v}`);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`library OK: ${Object.keys(docs).length} docs, ${compat.rules.length} rules, ${compat.supportedCombos.length} supported combos`);
