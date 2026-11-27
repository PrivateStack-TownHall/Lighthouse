import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Info, TriangleAlert, OctagonX, BookOpen, LoaderCircle } from 'lucide-react';
import { DisclosureButton } from '../../../components/ui/DisclosureButton.jsx';
import { LevelBadge } from '../../../components/ui/Badge.jsx';
import { RichText } from '../../../components/ui/RichText.jsx';

const ICON = { supported: CircleCheck, allowed: Info, warn: TriangleAlert, unsupported: OctagonX };
const TEXT = { supported: 'text-success', allowed: 'text-info', warn: 'text-warning-foreground', unsupported: 'text-destructive' };
const STATUS_TONE = { verified: 'bg-success/10 text-success', partial: 'bg-warning/30 text-warning-foreground', draft: 'bg-muted text-muted-foreground' };

export function CompatibilityPanel({ check, levels, loading }) {
  const [showDocs, setShowDocs] = useState(false);
  if (!check) return null;
  const level = check.ok ? check.level : 'unsupported';
  const items = check.ok ? check.problems.filter((p) => !/^CR-\d+/.test(p.message)) : check.errors.map((message) => ({ level: 'unsupported', message }));
  const unverified = check.docs.reduce((n, d) => n + d.unverifiedMarks, 0);

  return (
    <div className="rounded-xl border border-border bg-background/70 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold">Compatibility</p>
        <LevelBadge level={level} />
        {loading && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Checking" />}
        <p className="flex-1 text-xs text-muted-foreground">{levels?.[level]}</p>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((p, i) => {
            const Icon = ICON[p.level];
            return (
              <li key={i} className="flex gap-2 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${TEXT[p.level]}`} aria-hidden />
                <RichText text={p.message} />
              </li>
            );
          })}
        </ul>
      )}
      {check.ok && (
        <div className="mt-3 border-t border-border pt-3">
          <DisclosureButton open={showDocs} onToggle={() => setShowDocs(open => !open)} chevronClassName="ml-auto size-4"
            className="flex w-full items-center gap-2 text-left text-xs font-semibold text-brand-800">
            <BookOpen className="size-4" aria-hidden />
            {check.docs.length} library documents · {unverified} unverified claims
          </DisclosureButton>
          <AnimatePresence initial={false}>
            {showDocs && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 grid gap-1 overflow-hidden sm:grid-cols-2">
                {check.docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-md bg-surface px-2 py-1 text-xs">
                    <code className="truncate font-mono text-muted-foreground">{d.path}</code>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${STATUS_TONE[d.status]}`}>{d.status}{d.unverifiedMarks ? ` · ${d.unverifiedMarks}?` : ''}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
