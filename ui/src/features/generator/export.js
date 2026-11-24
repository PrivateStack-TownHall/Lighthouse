import { saveExportZip } from './api.js';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadText = (text, filename) => downloadBlob(new Blob([text], { type: 'text/markdown;charset=utf-8' }), filename);

/** files: [{ path, content }] -> <root>/<path> inside the zip. */
async function buildZip(files, root) {
  const { default: JSZip } = await import('jszip'); // loaded on first export
  const zip = new JSZip();
  const folder = zip.folder(root);
  for (const f of files) folder.file(f.path, f.content);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadZip(files, root, filename) {
  downloadBlob(await buildZip(files, root), filename);
}

export async function exportProjectZip(result, root, filename) {
  const archive = await buildZip(result.files, root);
  await saveExportZip(result.id, archive);
  downloadBlob(archive, filename);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/** PROMPTS/ copied as one text, in file order. */
export const joinFiles = (files) => files.map((f) => `<!-- ${f.path} -->\n${f.content}`).join('\n\n---\n\n');
