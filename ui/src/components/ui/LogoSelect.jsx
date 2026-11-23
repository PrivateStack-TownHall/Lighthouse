import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { TechLogo } from './TechLogo.jsx';

/** Select with a technology logo per option (native <select> cannot show images). */
export function LogoSelect({ id, value, options, onChange, disabled, placeholder = 'None', ...aria }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  const current = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    listRef.current?.querySelector('[aria-selected="true"], button')?.focus();
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...(listRef.current?.querySelectorAll('button') ?? [])];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <button id={id} type="button" disabled={disabled} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} {...aria}
        className={`flex h-10 w-full items-center gap-2.5 rounded-lg border bg-surface pl-2.5 pr-9 text-left text-base font-medium text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-info/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${aria['aria-invalid'] ? 'border-destructive' : 'border-border'}`}>
        {current ? <><TechLogo id={current.id} name={current.name} /><span className="truncate">{current.name}</span></> : <span className="text-gray-500">{placeholder}</span>}
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul ref={listRef} role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
            {options.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button type="button" onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-base hover:bg-muted focus:bg-muted focus:outline-none ${o.id === value ? 'font-semibold' : ''}`}>
                  <TechLogo id={o.id} name={o.name} />
                  <span className="flex-1 truncate">{o.name}</span>
                  {o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
                  {o.id === value && <Check className="size-4 text-brand-800" aria-hidden />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
