import { motion } from 'framer-motion';
import { Eye, Copy, Download, Check } from 'lucide-react';
import { OUTPUT_LOOK, filesOf } from '../outputs.js';

function ActionButton({ icon: Icon, label, onClick, disabled, text }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-semibold text-navy-900 shadow-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${text ? 'px-2.5' : 'w-8'}`}>
      <Icon className="size-[18px]" aria-hidden />{text && <span className="hidden sm:inline">{text}</span>}
    </button>
  );
}

/** Mockup "Generated Outputs". The icon tile toggles whether an output is generated (Select Output step). */
export function OutputList({ outputs, selected, onToggle, result, onPreview, onCopy, onDownload }) {
  const count = outputs.filter((o) => o.available && selected.includes(o.id)).length;
  return (
    <section aria-labelledby="outputs-title" className="rounded-xl bg-gray-100/50 px-3 pb-1 pt-3 ring-1 ring-border/50">
      <div className="mb-2 flex flex-wrap items-center gap-3 px-1">
        <h2 id="outputs-title" className="font-display text-xl font-extrabold tracking-tight text-navy-900">Generated Outputs</h2>
        <span className="rounded-full bg-info/15 px-3 py-1 text-sm font-bold text-brand-800">{count} Documents</span>
        <span className="ml-auto text-xs text-muted-foreground">Click an icon to include or exclude it.</span>
      </div>
      <ul className="divide-y divide-border/70">
        {outputs.map((o, i) => {
          const look = OUTPUT_LOOK[o.id];
          const files = filesOf(result, o.id);
          const ready = files.length > 0;
          const on = o.available && selected.includes(o.id);
          return (
            <motion.li key={`${o.id}-${result?.id ?? 'none'}`} initial={ready ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: ready ? i * 0.06 : 0 }}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-2 sm:flex-nowrap">
              <button type="button" role="checkbox" aria-checked={on} aria-label={`Include ${o.title}`} disabled={!o.available} onClick={() => onToggle(o.id)}
                className={`relative grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br shadow-sm transition ${look.tile} ${on ? '' : 'opacity-45 grayscale'} disabled:cursor-not-allowed`}>
                <look.icon className="size-6" strokeWidth={1.8} aria-hidden />
                {o.available && (
                  <span className={`absolute -right-1 -top-1 grid size-5 place-items-center rounded-full ring-2 ring-surface ${on ? 'bg-brand-800 text-accent-foreground' : 'bg-gray-300'}`}>
                    {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  </span>
                )}
              </button>
              <div className={`min-w-[10rem] flex-1 ${o.available ? '' : 'opacity-60'}`}>
                <p className="truncate font-display text-base font-extrabold tracking-tight text-navy-900">{o.title}</p>
                <p className="truncate text-sm text-foreground/75" title={o.description}>{o.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-md bg-gray-300/70 px-2 py-0.5 text-[10px] font-extrabold text-navy-900">{o.format}</span>
                <span className={`text-[10px] font-semibold ${ready ? 'text-success' : 'text-muted-foreground'}`}>{ready ? 'Generated' : 'Not Generated'}</span>
              </div>
              <div className="ml-auto flex gap-1.5">
                <ActionButton icon={Eye} text="Preview" label={`Preview ${o.title}`} disabled={!ready} onClick={() => onPreview(o)} />
                <ActionButton icon={Copy} text="Copy" label={`Copy ${o.title}`} disabled={!ready} onClick={() => onCopy(o)} />
                <ActionButton icon={Download} label={`Download ${o.title}`} disabled={!ready} onClick={() => onDownload(o)} />
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
