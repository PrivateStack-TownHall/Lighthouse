import { useState } from 'react';
import { Layers, FileText, Code2, ShieldCheck, Zap, CloudCheck, LoaderCircle, CloudAlert } from 'lucide-react';
import { Accordion } from '../../../components/ui/Accordion.jsx';
import { Select } from '../../../components/ui/inputs.jsx';
import { Badge, LevelBadge } from '../../../components/ui/Badge.jsx';
import { ProjectInfoSection } from './ProjectInfoSection.jsx';
import { StackSection } from './StackSection.jsx';
import { RulesSection } from './RulesSection.jsx';

const SAVE = {
  saving: { icon: LoaderCircle, text: 'Saving...', tone: 'text-muted-foreground', spin: true },
  saved: { icon: CloudCheck, text: 'Saved', tone: 'text-success' },
  error: { icon: CloudAlert, text: 'Not saved', tone: 'text-destructive' },
};

/** Left panel. The header stays; the accordions scroll inside the panel (one-window layout). */
export function ConfigurationCard({ config, dispatch, options, check, checking, errors, saveState }) {
  const [open, setOpen] = useState({ info: true, stack: true, rules: false });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const infoErrors = Object.keys(errors).filter((k) => k.startsWith('project.')).length;
  const stackErrors = Object.keys(errors).filter((k) => k.startsWith('stack.')).length;
  const level = check ? (check.ok ? check.level : 'unsupported') : null;
  const save = SAVE[saveState];

  return (
    <section className="flex flex-col rounded-[18px] bg-surface shadow-lg lg:min-h-0" aria-labelledby="config-title">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-800 shadow-xs"><Layers className="size-4" strokeWidth={1.6} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="config-title" className="font-display text-base font-extrabold leading-tight tracking-tight text-navy-900">Project Configuration</h2>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/75">
            Project details, stack, and rules.
            {save && <span className={`inline-flex items-center gap-1 text-xs font-semibold ${save.tone}`} role="status"><save.icon className={`size-3.5 ${save.spin ? 'animate-spin' : ''}`} aria-hidden />{save.text}</span>}
          </p>
        </div>
        <div className="ml-auto flex w-full shrink-0 items-center gap-2 sm:w-52">
          <label htmlFor="preset" className="text-xs font-bold text-foreground">Preset</label>
          <div className="min-w-0 flex-1">
            <Select id="preset" icon={Zap} iconClassName="text-primary" value={config.preset} onChange={(e) => dispatch({ type: 'preset', preset: options.presets.find((p) => p.id === e.target.value) ?? null })}>
              <option value="custom">Custom</option>
              {options.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto scrollbar-thin">
        <Accordion icon={FileText} title="Project Information" subtitle="Basic details, purpose, and project type." open={open.info} onToggle={() => toggle('info')}
          status={infoErrors > 0 && <Badge tone="danger">{infoErrors} to fix</Badge>}>
          <ProjectInfoSection config={config} dispatch={dispatch} options={options} errors={errors} />
        </Accordion>
        <Accordion icon={Code2} title="Technology Stack" subtitle="Configure frontend, backend, database, and related tools." open={open.stack} onToggle={() => toggle('stack')}
          status={stackErrors > 0 ? <Badge tone="danger">{stackErrors} to fix</Badge> : <LevelBadge level={level} />}>
          <StackSection config={config} dispatch={dispatch} options={options} errors={errors} check={check} checking={checking} />
        </Accordion>
        <Accordion icon={ShieldCheck} title="Contract Rules" subtitle="Define coding standards, architecture, security, and project rules." open={open.rules} onToggle={() => toggle('rules')}
          status={<Badge tone={open.rules ? 'navy' : 'neutral'}>{options.fixedRules.length} fixed · {config.customRules.length} custom</Badge>}>
          <RulesSection config={config} dispatch={dispatch} options={options} check={check} errors={errors} />
        </Accordion>
      </div>
    </section>
  );
}
