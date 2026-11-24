import { Folder, Download, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';

export function ExportPanel({ disabled, onZip, onMarkdown, zipping }) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl bg-surface px-4 py-3 shadow-sm ring-1 ring-border/70">
      <Folder className="size-8 shrink-0 text-navy-900" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-navy-900">Export Package</h2>
        <p className="text-sm text-foreground/75">Download outputs, Definition of Done and implementation references together.</p>
      </div>
      <Button variant="outlinePrimary" icon={Download} onClick={onZip} loading={zipping} disabled={disabled}>Export ZIP</Button>
      <Button variant="secondary" icon={FileText} onClick={onMarkdown} disabled={disabled}>Export MD</Button>
    </section>
  );
}
