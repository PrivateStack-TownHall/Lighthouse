import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Copy, Download, FileText, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { QueryState } from '../../../components/QueryState.jsx';
import { formatBytes } from '../../../helpers/index.js';
import { OUTPUT_LOOK } from '../outputs.js';
import leftbarImage from '../../../assets/brand/leftbar-bg@2x.jpg';

const Markdown = lazy(() => import('../../../components/ui/Markdown.jsx').then((m) => ({ default: m.Markdown })));

export function PreviewModal({ output, files, onClose, onCopyFile, onDownloadFile }) {
  const dialogRef = useRef(null);
  const [selection, setSelection] = useState({ id: null, index: 0 });
  const active = selection.id === output?.id && selection.index < files.length ? selection.index : 0;
  const setActive = (index) => setSelection({ id: output?.id, index });
  const file = files[active];
  const many = files.length > 1;
  const Icon = OUTPUT_LOOK[output?.id]?.icon ?? FileText;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!output) return undefined;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, [output]);

  const closeFromBackdrop = (event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="preview-title" onClick={closeFromBackdrop}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto h-[92dvh] max-h-none w-[calc(100%_-_1.5rem)] max-w-[1440px] overflow-hidden rounded-2xl border-[6px] border-brand-800 bg-surface p-0 text-foreground shadow-lg backdrop:bg-navy-900/65 backdrop:backdrop-blur-sm sm:w-[calc(100%_-_3rem)] lg:h-[88dvh]">
      <div className="grid h-full min-h-0 grid-rows-[6rem_minmax(0,1fr)] md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-1 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="relative flex min-h-0 overflow-hidden bg-brand-800 text-accent-foreground" aria-label="Document preview sidebar">
          <img src={leftbarImage} alt="" className="absolute inset-0 size-full object-cover object-[center_10%] md:object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/30 to-transparent" />
          <div className="relative flex min-h-0 w-full flex-col justify-end gap-4 p-4 md:p-5">
            {many && (
              <nav className="hidden min-h-0 max-h-[45%] overflow-y-auto overscroll-contain md:block" aria-label="Preview files">
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={f.path}>
                      <button type="button" onClick={() => setActive(i)} aria-current={i === active ? 'page' : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${i === active ? 'bg-surface font-bold text-brand-800' : 'text-brand-100 hover:bg-surface/15'}`}>
                        <FileText className="size-4 shrink-0" aria-hidden /><span className="truncate">{f.path.replace(/^PROMPTS\//, '')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div>
              <Icon className="mb-3 hidden size-8 md:block" strokeWidth={1.5} aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-200">Document preview</p>
              <p className="mt-1 font-display text-lg font-extrabold leading-snug md:text-xl">{output?.title}</p>
              <p className="mt-2 hidden text-xs text-brand-200 md:block">{files.length} {many ? 'files' : 'document'} · Contract Kit</p>
            </div>

          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex flex-wrap items-start gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
            <div className="min-w-0 flex-1 basis-40">
              <h2 id="preview-title" className="font-display text-lg font-extrabold text-brand-800 sm:text-xl">{output?.title}</h2>
              {file && <p className="mt-1 truncate text-xs text-muted-foreground" title={file.path}>{file.path} · {formatBytes(file.bytes)}</p>}
            </div>
            {file && (
              <div className="order-3 flex w-full gap-2 sm:order-none sm:w-auto">
                <Button size="sm" variant="secondary" icon={Copy} onClick={() => onCopyFile(file)}>Copy</Button>
                <Button size="sm" variant="dark" icon={Download} onClick={() => onDownloadFile(file)}>Download</Button>
              </div>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800" aria-label="Close preview">
              <X className="size-5" aria-hidden />
            </button>
            {many && (
              <div className="order-4 w-full md:hidden">
                <label htmlFor="preview-file" className="sr-only">Preview file</label>
                <select id="preview-file" value={active} onChange={(event) => setActive(Number(event.target.value))} className="w-full rounded-lg border border-border bg-surface p-2 text-sm">
                  {files.map((f, i) => <option key={f.path} value={i}>{f.path.replace(/^PROMPTS\//, '')}</option>)}
                </select>
              </div>
            )}
          </header>
          <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8" tabIndex={0} aria-label="Preview content">
            {file && <Suspense fallback={<QueryState isLoading />}><Markdown text={file.content} /></Suspense>}
          </div>
        </section>
      </div>
    </dialog>
  );
}
