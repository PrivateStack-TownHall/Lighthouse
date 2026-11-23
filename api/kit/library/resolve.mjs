#!/usr/bin/env node
/**
 * Prototype of Lighthouse "Generation Validation".
 * Usage: node library/resolve.mjs <choice-id> <choice-id> ...
 *   node library/resolve.mjs typescript react-vite tailwindcss nestjs prisma postgresql
 * Prints: level, warnings, the docs to include, their verification status, and what the generator must mark "unverified".
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const compat = JSON.parse(readFileSync(join(root, 'compatibility.json'), 'utf8'));

export function loadDocs() {
  const docs = {};
  (function walk(dir) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md') {
        const text = readFileSync(p, 'utf8');
        const m = text.match(/^---\n([\s\S]*?)\n---/);
        if (!m) continue;
        const fm = Object.fromEntries(m[1].split('\n').filter((l) => /^[a-z_]+:/.test(l)).map((l) => [l.split(':')[0], l.slice(l.indexOf(':') + 1).trim()]));
        const marks = (text.match(/\[\?\]/g) ?? []).length;
        docs[fm.id] = { ...fm, path: relative(root, p), unverifiedMarks: marks };
      }
    }
  })(root);
  return docs;
}

export function resolve(ids) {
  const docs = loadDocs();
  const sel = {};
  const problems = [];
  for (const id of ids) {
    const cat = Object.entries(compat.choices).find(([, v]) => v.includes(id))?.[0];
    if (cat) {
      if (sel[cat]) problems.push({ level: 'unsupported', message: `Two choices for ${cat}: ${sel[cat]} and ${id}.` });
      sel[cat] = id;
    } else if (!compat.tools.includes(id)) problems.push({ level: compat.unknownChoice, message: `Unknown choice "${id}": no documentation. Do not invent it.` });
  }
  for (const cat of Object.keys(compat.choices)) if (!sel[cat]) problems.push({ level: 'unsupported', message: `Missing choice for ${cat}.` });

  const matches = (when) => Object.entries(when).every(([k, v]) => sel[k] === v);
  for (const r of compat.rules) if (matches(r.when)) problems.push({ level: r.level, message: r.message });
  const combo = compat.supportedCombos.find((c) => matches(c.match));

  const order = ['supported', 'allowed', 'warn', 'unsupported'];
  const worst = problems.reduce((w, p) => (order.indexOf(p.level) > order.indexOf(w) ? p.level : w), combo ? 'supported' : 'allowed');
  const include = [...compat.alwaysInclude, ...Object.values(sel), ...ids.filter((i) => compat.tools.includes(i)), ...(combo ? [combo.id] : [])];
  const unique = [...new Set(include)];
  const missingDocs = unique.filter((i) => !docs[i]);
  const list = unique.filter((i) => docs[i]).map((i) => ({ id: i, path: docs[i].path, status: docs[i].status, unverifiedMarks: docs[i].unverifiedMarks }));
  return { level: missingDocs.length ? 'unsupported' : worst, selection: sel, comboDoc: combo?.doc ?? null, problems, missingDocs, docs: list };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv.slice(2));
  console.log(`Level: ${out.level}`);
  for (const p of out.problems) console.log(`  [${p.level}] ${p.message}`);
  if (out.missingDocs.length) console.log(`  [unsupported] no documentation for: ${out.missingDocs.join(', ')}`);
  console.log('Docs to include:');
  for (const d of out.docs) console.log(`  ${d.path}  status=${d.status}  unverified-claims=${d.unverifiedMarks}`);
  if (!out.comboDoc) console.log('No combo doc: the generator must say the glue between these choices is unverified.');
  process.exit(out.level === 'unsupported' ? 1 : 0);
}
