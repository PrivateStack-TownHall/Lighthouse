import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/** Section with a navy header bar when open (mockup: Project Information, Technology Stack, Contract Rules). */
export function Accordion({ icon: Icon, title, subtitle, open, onToggle, status, children }) {
  return (
    <section className={`rounded-xl border transition-shadow ${open ? 'border-border/70 bg-surface' : 'border-border/70 bg-surface shadow-sm'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-4 rounded-xl px-4 py-2.5 text-left transition-colors ${open ? 'rounded-b-none bg-brand-800 text-accent-foreground' : 'text-foreground hover:bg-muted/60'}`}
      >
        <Icon className={`size-6 shrink-0 ${open ? 'text-accent-foreground' : 'text-brand-800'}`} strokeWidth={1.6} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold leading-tight tracking-tight">{title}</span>
          <span className={`block truncate text-sm ${open ? 'text-brand-100' : 'text-muted-foreground'}`}>{subtitle}</span>
        </span>
        {status}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="size-5" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="px-4 pb-4 pt-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
