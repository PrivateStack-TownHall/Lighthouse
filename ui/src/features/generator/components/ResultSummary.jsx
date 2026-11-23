import { useState } from 'react';
import { CircleCheck, FileClock, TriangleAlert, ChevronDown } from 'lucide-react';
import { LevelBadge } from '../../../components/ui/Badge.jsx';
import { RichText } from '../../../components/ui/RichText.jsx';
import { formatBytes } from '../../../helpers/index.js';

export function ResultSummary({ result, stale }) {
  const [open, setOpen] = useState(false);
  const bytes = result?.files.reduce((n, f) => n + f.bytes, 0) ?? 0;
  return (
    <div className="min-w-0 shrink-0 border-t border-border pt-2 text-xs lg:max-w-52 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0" role="status">
      <div className="flex items-center gap-1.5" title={result ? `config ${result.configHash} · ${result.generatedOn}` : undefined}>
        {!result ? <FileClock className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : stale ? <TriangleAlert className="size-4 shrink-0 text-warning-foreground" aria-hidden /> : <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />}
        <span className="font-semibold">{!result ? 'Not Generated' : stale ? 'Generate again to update files' : `Generated ${result.files.length} files (${formatBytes(bytes)})`}</span>
        {result && <LevelBadge level={result.level} />}
      </div>
      {result?.problems.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand-800">
            {result.problems.length} note{result.problems.length > 1 ? 's' : ''} <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{result.problems.map((p, i) => <li key={i}><RichText text={`[${p.level}] ${p.message}`} /></li>)}</ul>}
        </>
      )}
    </div>
  );
}
