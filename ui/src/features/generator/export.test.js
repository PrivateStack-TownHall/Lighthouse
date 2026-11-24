import { Blob } from 'node:buffer';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { afterEach, expect, test, vi } from 'vitest';
import { generate, loadLibrary, exportMarkdown, OUTPUTS } from '../../../../api/kit/library/generate.mjs';
import { downloadZip, exportProjectZip } from './export.js';
import { saveExportZip } from './api.js';

vi.mock('./api.js', () => ({ saveExportZip: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(saveExportZip).mockReset();
});

test('project export saves the ZIP before downloading the same blob', async () => {
  let downloaded;
  vi.stubGlobal('Blob', Blob);
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob) { downloaded = blob; return 'blob:project'; }
    static revokeObjectURL() {}
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.mocked(saveExportZip).mockImplementation(async (_id, archive) => {
    expect(click).not.toHaveBeenCalled();
    expect(downloaded).toBeUndefined();
    expect((await JSZip.loadAsync(await archive.arrayBuffer())).file('sample/PROJECT_CONTRACT.md')).not.toBeNull();
  });
  await exportProjectZip({ id: 'generation-id', files: [{ path: 'PROJECT_CONTRACT.md', content: 'Contract' }] }, 'sample', 'sample-project.zip');
  expect(saveExportZip).toHaveBeenCalledOnce();
  expect(saveExportZip).toHaveBeenCalledWith('generation-id', downloaded);
  expect(click).toHaveBeenCalledOnce();
});

test('project export does not download when saving fails', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.mocked(saveExportZip).mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(exportProjectZip({ id: 'generation-id', files: [{ path: 'a.md', content: 'A' }] }, 'sample', 'sample-project.zip')).rejects.toThrow('disk unavailable');
  expect(click).not.toHaveBeenCalled();
});

test.each([{ outputs: OUTPUTS }, { outputs: ['PROMPTS/'] }])('ZIP export carries readable project specifications with selected outputs $outputs', async ({ outputs }) => {
  const lib = await loadLibrary(resolve('../api/kit'));
  const result = generate({
    schemaVersion: 1, generatedOn: '2026-11-24', preset: 'custom',
    project: { name: 'Sample', slug: 'sample', type: 'web-app', purpose: 'internal', version: '1.0.0', description: 'Manage the agreed editorial workflow.' },
    stack: { language: 'javascript', frontend: 'react-vite', css: 'tailwindcss', backend: 'express', orm: 'sequelize', database: 'postgresql', tools: ['axios', 'tanstack-query'] },
    customRules: [], outputs,
  }, lib);
  expect(result.ok).toBe(true);
  let archive;
  vi.stubGlobal('Blob', Blob);
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob) { archive = blob; return 'blob:project'; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await downloadZip(Object.entries(result.files).map(([path, content]) => ({ path, content })), 'sample', 'sample-project.zip');
  expect(saveExportZip).not.toHaveBeenCalled();
  expect(archive).toBeDefined();
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());
  for (const [path, content] of Object.entries(result.files)) expect(await zip.file(`sample/${path}`).async('string')).toBe(content);
  const dod = await zip.file('sample/docs/DEFINITION_OF_DONE.md').async('string');
  expect(dod).toContain('Manage the agreed editorial workflow.');
  expect(dod).toMatch(/feature list is optional/);
  expect(exportMarkdown(result.files)).toContain('<!-- file: docs/DEFINITION_OF_DONE.md -->');
});
