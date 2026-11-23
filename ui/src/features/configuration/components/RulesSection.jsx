import { useState } from 'react';
import { Lock, Plus, Trash2, TriangleAlert, ShieldCheck } from 'lucide-react';
import { Textarea, Input, Select } from '../../../components/ui/inputs.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { RichText } from '../../../components/ui/RichText.jsx';

export function RulesSection({ config, dispatch, options, check, errors }) {
  const [showAll, setShowAll] = useState(false);
  const hints = (i) => (check?.problems ?? []).filter((p) => p.message.startsWith(`CR-${String(i + 1).padStart(3, '0')} `));
  const overriddenBy = (id) => config.customRules.map((r, i) => ((r.overrides ?? []).includes(id) ? `CR-${String(i + 1).padStart(3, '0')}` : null)).filter(Boolean);
  const rules = showAll ? options.fixedRules : options.fixedRules.slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-5 text-brand-800" aria-hidden />
          <p className="text-sm font-bold">Fixed Rules (System)</p>
          <Badge tone="navy">{options.fixedRules.length}</Badge>
          <span className="text-xs text-muted-foreground">Apply to every project. Read-only.</span>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rules.map((r) => {
            const by = overriddenBy(r.id);
            return (
              <li key={r.id} className={`flex gap-3 px-3 py-2 text-sm ${by.length ? 'bg-destructive/5' : 'bg-surface'}`}>
                <Lock className="mt-0.5 size-3.5 shrink-0 text-gray-500" aria-hidden />
                <code className="shrink-0 font-mono text-xs font-bold text-brand-800">{r.id}</code>
                <RichText text={r.rule} className="flex-1 text-foreground" />
                {by.length > 0 && <Badge tone="danger">Overridden by {by.join(', ')}</Badge>}
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 text-xs font-semibold text-info hover:underline">
          {showAll ? 'Show fewer' : `Show all ${options.fixedRules.length} rules`}
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold">Custom Rules</p>
            <p className="text-xs text-muted-foreground">Project rules. To change a Fixed Rule, select it and give a reason: it is never changed silently.</p>
          </div>
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => dispatch({ type: 'addRule' })}>Add rule</Button>
        </div>
        {config.customRules.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">No custom rules.</p>}
        <ol className="flex flex-col gap-3">
          {config.customRules.map((r, i) => {
            const id = `CR-${String(i + 1).padStart(3, '0')}`;
            const reasonError = errors[`customRules[${i}]`];
            return (
              <li key={i} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex items-start gap-3">
                  <code className="mt-2 font-mono text-xs font-bold text-brand-800">{id}</code>
                  <Textarea className="min-h-14 flex-1" aria-label={`${id} text`} value={r.text} onChange={(e) => dispatch({ type: 'rule', index: i, patch: { text: e.target.value } })} placeholder="e.g. Article slugs are unique and created with slugify from helpers/." />
                  <button type="button" onClick={() => dispatch({ type: 'removeRule', index: i })} className="mt-1 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${id}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 pl-14 sm:grid-cols-[13rem_1fr]">
                  <Select aria-label={`${id} overrides`} value={r.overrides?.[0] ?? ''} onChange={(e) => dispatch({ type: 'rule', index: i, patch: { overrides: e.target.value ? [e.target.value] : [] } })}>
                    <option value="">No override</option>
                    {options.fixedRules.map((fr) => <option key={fr.id} value={fr.id}>Overrides {fr.id}</option>)}
                  </Select>
                  {r.overrides?.length > 0 && (
                    <Input aria-label={`${id} reason`} aria-invalid={reasonError ? true : undefined} value={r.reason ?? ''} onChange={(e) => dispatch({ type: 'rule', index: i, patch: { reason: e.target.value } })} placeholder="Reason (required to override a Fixed Rule)" />
                  )}
                </div>
                {reasonError && <p className="mt-1 pl-14 text-xs text-destructive">{reasonError}</p>}
                {hints(i).map((h, k) => (
                  <p key={k} className="mt-2 flex gap-2 rounded-md bg-warning/20 px-3 py-2 pl-3 text-xs text-warning-foreground">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden /><RichText text={h.message.replace(/^CR-\d+ /, '')} />
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
