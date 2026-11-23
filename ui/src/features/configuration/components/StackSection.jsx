import { Field } from '../../../components/ui/Field.jsx';
import { RadioCards } from '../../../components/ui/inputs.jsx';
import { LogoSelect } from '../../../components/ui/LogoSelect.jsx';
import { TechLogo } from '../../../components/ui/TechLogo.jsx';
import { CompatibilityPanel } from './CompatibilityPanel.jsx';

const docHint = (d) => d && `${d.status}${d.unverified ? ` · ${d.unverified} unverified` : ''}${d.recommended ? ` · ${d.recommended}` : ''}`;

function ChoiceSelect({ label, field, config, options, dispatch, errors }) {
  const list = options.choices[field];
  const value = config.stack[field];
  return (
    <Field label={label} required error={errors[`stack.${field}`]} hint={docHint(list.find((d) => d.id === value))}>
      {(a) => <LogoSelect {...a} value={value} options={list} onChange={(v) => dispatch({ type: 'stack', field, value: v })} />}
    </Field>
  );
}

export function StackSection({ config, dispatch, options, errors, check, checking }) {
  const noUi = config.project.type === 'api';
  const noApi = config.project.type === 'frontend';
  const common = { config, options, dispatch, errors };
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <Field label="Language" required error={errors['stack.language']}>
          {() => (
            <RadioCards name="language" value={config.stack.language} onChange={(v) => dispatch({ type: 'stack', field: 'language', value: v })}
              options={options.choices.language.map((d) => ({ value: d.id, label: d.name.replace(/\s*\(.*\)$/, ''), icon: <TechLogo id={d.id} name={d.name} size={18} /> }))} />
          )}
        </Field>
        {!noUi && <ChoiceSelect label="Frontend" field="frontend" {...common} />}
        {!noApi && <ChoiceSelect label="Backend" field="backend" {...common} />}
        {!noApi && <ChoiceSelect label="ORM / Data Access" field="orm" {...common} />}
        {!noApi && <ChoiceSelect label="Database" field="database" {...common} />}
        {!noUi && <ChoiceSelect label="CSS" field="css" {...common} />}
      </div>
      <CompatibilityPanel check={check} levels={options.levels} loading={checking} />
    </div>
  );
}
