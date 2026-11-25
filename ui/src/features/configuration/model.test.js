import { describe, expect, test } from 'vitest';
import { AVAILABLE_OUTPUTS, defaultConfig, errorsByPath, hydrate, portRuleNotes, portRuleValues, reducer, sanitize, UI_TOOLS, updatePortRuleNotes, updatePortRuleText } from './model.js';

describe('configuration model', () => {
  test('defaults: Lighthouse 123, CMS, no features, fixed UI tools', () => {
    const s = sanitize(defaultConfig());
    expect(s.project.name).toBe('Lighthouse 123');
    expect(s.project.domain).toBe('cms');
    expect(s.project).not.toHaveProperty('features');
    expect(s.project).not.toHaveProperty('category');
    expect(s.project.version).toBe('1.0.0');
    expect(s.stack.tools).toEqual(UI_TOOLS);
    expect(s.outputs).toEqual(AVAILABLE_OUTPUTS);
    expect(s.outputs).toHaveLength(6);
  });

  test('API-only projects send no frontend, CSS or UI tools', () => {
    const c = reducer(defaultConfig(), { type: 'project', field: 'type', value: 'api' });
    const s = sanitize(c);
    expect(s.stack.frontend).toBeNull();
    expect(s.stack.css).toBeNull();
    expect(s.stack.tools).toEqual([]);
    expect(s.project.folders).toEqual({ api: 'api', ui: null });
  });

  test('frontend-only excludes backend choices and preserves custom folders after restoring', () => {
    let c = reducer(defaultConfig(), { type: 'project', field: 'type', value: 'frontend' });
    c = reducer(c, { type: 'folder', layer: 'ui', value: ' client ' });
    const s = sanitize(c);
    expect(s.project.folders).toEqual({ api: null, ui: 'client' });
    expect(s.stack.backend).toBeNull();
    expect(s.stack.orm).toBeNull();
    expect(s.stack.database).toBeNull();
    expect(s.stack.frontend).toBe('react-vite');
    expect(hydrate(s).project.folders.ui).toBe('client');
    const full = sanitize(reducer(hydrate(s), { type: 'project', field: 'type', value: 'web-app' }));
    expect(full.stack.backend).toBe('express');
    expect(full.project.folders).toEqual({ api: 'api', ui: 'client' });
    expect(hydrate({}).project.folders).toEqual({ api: 'api', ui: 'ui' });
  });

  test('port override fields preserve roles and survive save and restore', () => {
    let c = reducer(defaultConfig(), { type: 'addRule' });
    c = reducer(c, { type: 'rule', index: 0, patch: { overrides: ['FR-015'], reason: 'Assigned locally' } });
    c = reducer(c, { type: 'rule', index: 0, patch: { text: updatePortRuleText(c.customRules[0].text, 'api', '3200') } });
    c = reducer(c, { type: 'rule', index: 0, patch: { text: updatePortRuleText(c.customRules[0].text, 'db', '2200') } });
    c = reducer(c, { type: 'folder', layer: 'ui', value: 'robot' });
    const saved = sanitize(c);
    expect(saved.project.folders).toEqual({ api: 'api', ui: 'robot' });
    expect(saved.customRules[0].text).toBe('API: 3200\nDB: 2200');
    expect(portRuleValues(hydrate(saved).customRules[0].text)).toEqual({ api: '3200', db: '2200' });
    expect(portRuleNotes(updatePortRuleNotes(saved.customRules[0].text, 'Use dedicated local ports.'))).toBe('Use dedicated local ports.');
    expect(updatePortRuleText('API: 3200\nDB: 2200', 'api', '')).toBe('DB: 2200');
    const pending = reducer(reducer(defaultConfig(), { type: 'addRule' }), { type: 'rule', index: 0, patch: { overrides: ['FR-015'], reason: 'Assigned locally' } });
    expect(sanitize(pending).customRules).toEqual([{ text: '', overrides: ['FR-015'], reason: 'Assigned locally' }]);
  });

  test('slug follows the name until edited', () => {
    let c = reducer(defaultConfig(), { type: 'project', field: 'name', value: 'Order Desk' });
    expect(c.project.slug).toBe('order-desk');
    c = reducer(c, { type: 'project', field: 'name', value: 'Order Desk 2', slugTouched: true });
    expect(c.project.slug).toBe('order-desk');
  });

  test('editing the stack after a preset switches back to custom', () => {
    const preset = { id: 'nest-prisma-vite', stack: { language: 'typescript', frontend: 'react-vite', css: 'tailwindcss', backend: 'nestjs', orm: 'prisma', database: 'postgresql', tools: ['axios'] } };
    let c = reducer(defaultConfig(), { type: 'preset', preset });
    expect(c.preset).toBe('nest-prisma-vite');
    expect(c.stack).not.toHaveProperty('tools');
    c = reducer(c, { type: 'stack', field: 'database', value: 'mysql' });
    expect(c.preset).toBe('custom');
  });

  test('an API-only preset switches the project type', () => {
    const c = reducer(defaultConfig(), { type: 'preset', preset: { id: 'nest-prisma-api', stack: { language: 'typescript', frontend: null, css: null, backend: 'nestjs', orm: 'prisma', database: 'postgresql', tools: [] } } });
    expect(c.project.type).toBe('api');
  });

  test('toggleOutput keeps the catalog order', () => {
    let c = reducer(defaultConfig(), { type: 'toggleOutput', id: 'PROJECT_CONTRACT.md' });
    c = reducer(c, { type: 'toggleOutput', id: 'PROJECT_CONTRACT.md' });
    expect(c.outputs[0]).toBe('PROJECT_CONTRACT.md');
  });

  test('older saved projects select the newly available documents once', () => {
    const c = hydrate({ outputs: ['PROJECT_CONTRACT.md', 'PROMPTS/'] });
    expect(c.outputs).toEqual(['PROJECT_CONTRACT.md', 'SYSTEM_DESIGN.md', 'DEVELOPMENT_STANDARDS.md', 'PROMPTS/']);
    const deselected = reducer(c, { type: 'toggleOutput', id: 'SYSTEM_DESIGN.md' });
    const restored = hydrate(sanitize(deselected));
    expect(restored.outputs).not.toContain('SYSTEM_DESIGN.md');
    expect(restored.outputs).toContain('DEVELOPMENT_STANDARDS.md');
  });

  test('errorsByPath maps generator messages to fields', () => {
    const { byPath, general } = errorsByPath(['`project.name` is required (max 60 characters).', 'Feature "x" is listed twice.']);
    expect(byPath['project.name']).toBe('Is required (max 60 characters).');
    expect(general).toEqual(['Feature "x" is listed twice.']);
  });

  test('hydrate preserves optional features while dropping UI-managed legacy fields', () => {
    const c = hydrate({ project: { name: 'x', features: [{ name: 'A' }], category: 3, nn: 2, version: '1.0.0' }, stack: { backend: 'nestjs', tools: ['axios'] } });
    expect(sanitize(c).project.features).toEqual([{ name: 'A' }]);
    expect(c.project).not.toHaveProperty('nn');
    expect(c.project.version).toBe('');
    expect(c.stack).not.toHaveProperty('tools');
    expect(c.stack.backend).toBe('nestjs');
  });
});
