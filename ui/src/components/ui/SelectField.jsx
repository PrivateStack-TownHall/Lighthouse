import { Field } from './Field.jsx';
import { Select } from './inputs.jsx';

export function SelectField({ label, required, error, icon, options, value, onChange }) {
  return (
    <Field label={label} required={required} error={error}>
      {(controlProps) => (
        <Select {...controlProps} icon={icon} value={value} onChange={onChange}>
          {options.map(({ id, label: optionLabel }) => (
            <option key={id} value={id}>{optionLabel}</option>
          ))}
        </Select>
      )}
    </Field>
  );
}
