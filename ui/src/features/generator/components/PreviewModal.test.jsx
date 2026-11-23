import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { PreviewModal } from './PreviewModal.jsx';

// jsdom has no native modal focus management; browser checks cover that behavior.
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeAll(async () => {
  await import('../../../components/ui/Markdown.jsx');
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
});
afterAll(() => {
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow);
  else delete HTMLDialogElement.prototype.showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else delete HTMLDialogElement.prototype.close;
});

const output = { id: 'PROJECT_CONTRACT.md', title: 'Project Contract' };
const file = { path: 'PROJECT_CONTRACT.md', content: '# Project Contract: Example\n\nGenerated content.', bytes: 57 };

test('modal previews the document and sends the active file to Copy and Download', async () => {
  const onCopyFile = vi.fn();
  const onDownloadFile = vi.fn();
  const onClose = vi.fn();
  const props = { output, files: [file], onCopyFile, onDownloadFile, onClose };
  const { rerender } = render(<PreviewModal {...props} />);
  const modal = screen.getByRole('dialog', { name: 'Project Contract' });
  expect(modal).toHaveAttribute('open');
  expect(await within(modal).findByRole('heading', { name: 'Project Contract: Example' })).toBeInTheDocument();
  expect(within(modal).getByRole('complementary', { name: 'Document preview sidebar' }).querySelector('img')).toHaveAttribute('src', expect.stringContaining('leftbar-bg@2x.jpg'));
  fireEvent.click(within(modal).getByRole('button', { name: 'Copy', exact: true }));
  fireEvent.click(within(modal).getByRole('button', { name: 'Download', exact: true }));
  expect(onCopyFile).toHaveBeenCalledWith(file);
  expect(onDownloadFile).toHaveBeenCalledWith(file);
  fireEvent(modal, new Event('cancel', { cancelable: true }));
  expect(onClose).toHaveBeenCalledOnce();
  fireEvent.click(within(modal).getByRole('button', { name: 'Close preview' }));
  expect(onClose).toHaveBeenCalledTimes(2);
  rerender(<PreviewModal {...props} output={null} files={[]} />);
  expect(modal).not.toHaveAttribute('open');
  expect(document.body.style.overflow).not.toBe('hidden');
});

test('file navigation and mobile selector update the preview and its actions', async () => {
  const files = [
    { path: 'PROMPTS/00-INDEX.md', content: '# Prompt index', bytes: 14 },
    { path: 'PROMPTS/01-scaffold.md', content: '# Scaffold project', bytes: 18 },
  ];
  const onCopyFile = vi.fn();
  const onDownloadFile = vi.fn();
  render(<PreviewModal output={{ id: 'PROMPTS/', title: 'Development Prompts' }} files={files} onClose={vi.fn()} onCopyFile={onCopyFile} onDownloadFile={onDownloadFile} />);
  expect(await screen.findByRole('heading', { name: 'Prompt index' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '01-scaffold.md' }));
  expect(await screen.findByRole('heading', { name: 'Scaffold project' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true }));
  expect(onCopyFile).toHaveBeenCalledWith(files[1]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Preview file' }), { target: { value: '0' } });
  expect(await screen.findByRole('heading', { name: 'Prompt index' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Download', exact: true }));
  expect(onDownloadFile).toHaveBeenCalledWith(files[0]);
});
