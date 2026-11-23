import { motion } from 'framer-motion';
import { Play, Files } from 'lucide-react';

export function GeneratePanel({ onGenerate, loading, disabledReason }) {
  return (
    <section className="rounded-xl bg-gradient-to-r from-brand-800 to-navy-900 px-5 py-4 text-accent-foreground shadow-md">
      <div className="flex flex-wrap items-center gap-4">
        <Files className="size-10 shrink-0" strokeWidth={1.3} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold leading-tight tracking-tight">Generate Contract Kit</h2>
          <p className="text-sm text-brand-100">Create a complete and consistent project contract package based on your configuration.</p>
        </div>
        <motion.button whileHover={disabledReason ? undefined : { scale: 1.03 }} whileTap={disabledReason ? undefined : { scale: 0.97 }}
          type="button" onClick={onGenerate} disabled={Boolean(disabledReason) || loading}
          className="relative inline-flex h-11 items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-b from-beacon-500 to-beacon-600 px-5 text-base font-bold text-primary-foreground shadow-lg transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/25 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />}
          <Play className="size-5" aria-hidden />
          {loading ? 'Generating...' : 'Generate Contract'}
        </motion.button>
      </div>
      {disabledReason && <p className="mt-3 text-sm text-beacon-200">{disabledReason}</p>}
    </section>
  );
}
