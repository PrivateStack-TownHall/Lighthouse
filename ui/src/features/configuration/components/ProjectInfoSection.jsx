import { useState } from 'react';
import { Layers, Target, Tags, Folder } from 'lucide-react';
import { Field } from '../../../components/ui/Field.jsx';
import { Input, Select, Textarea } from '../../../components/ui/inputs.jsx';

export function ProjectInfoSection({ config, dispatch, options, errors }) {
  const p = config.project;
  const [slugTouched, setSlugTouched] = useState(false);
  const set = (field) => (e) => dispatch({ type: 'project', field, value: e.target.value, slugTouched });
  const err = (path) => errors[`project.${path}`];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <Field label="Project Name" required error={err('name')}>
          {(a) => <Input {...a} value={p.name} maxLength={60} onChange={set('name')} placeholder="e.g. Lighthouse 123" />}
        </Field>
        <Field label="Project Type" required error={err('type')}>
          {(a) => (
            <Select {...a} icon={Layers} value={p.type} onChange={set('type')}>
              {options.types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Project Purpose" required error={err('purpose')}>
          {(a) => (
            <Select {...a} icon={Target} value={p.purpose} onChange={set('purpose')}>
              {options.purposes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Project Version" optional error={err('version')}>
          {(a) => <Input {...a} value={p.version} onChange={set('version')} placeholder="e.g. 1.0.0" />}
        </Field>
        <Field label="Category" required error={err('domain')}>
          {(a) => (
            <Select {...a} icon={Tags} value={p.domain} onChange={set('domain')}>
              {options.domains.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Slug" required error={err('slug')} hint="Repository folder name.">
          {(a) => <Input {...a} value={p.slug} onChange={(e) => { setSlugTouched(true); dispatch({ type: 'project', field: 'slug', value: e.target.value }); }} placeholder="lighthouse-123" />}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {p.type !== 'frontend' && <Field label="Backend folder" required error={err('folders.api')} hint="Folder name only, e.g. backend.">
          {(a) => <Input {...a} icon={Folder} value={p.folders.api} maxLength={64} onChange={(e) => dispatch({ type: 'folder', layer: 'api', value: e.target.value })} placeholder="api" />}
        </Field>}
        {p.type !== 'api' && <Field label="Frontend folder" required error={err('folders.ui')} hint="Folder name only, e.g. frontend.">
          {(a) => <Input {...a} icon={Folder} value={p.folders.ui} maxLength={64} onChange={(e) => dispatch({ type: 'folder', layer: 'ui', value: e.target.value })} placeholder="ui" />}
        </Field>}
      </div>

      <Field label="Short Description" required error={err('description')}>
        {(a) => (
          <div className="relative">
            <Textarea {...a} className="min-h-16 pb-6" value={p.description} maxLength={300} onChange={set('description')} placeholder="One or two sentences: what it is and who uses it." />
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">{p.description.length} / 300</span>
          </div>
        )}
      </Field>

      <Field label="Outside the agreed scope" optional hint="One exclusion per line. Documented separately from the requested work.">
        {(a) => <Textarea {...a} className="min-h-12" value={p.parkingLot.join('\n')} onChange={(e) => dispatch({ type: 'parkingLot', value: e.target.value.split('\n') })} placeholder="e.g. Media library" />}
      </Field>
    </div>
  );
}
