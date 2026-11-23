import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const base = 'w-full rounded-lg border bg-surface text-base text-foreground placeholder:text-gray-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-info/30 disabled:bg-muted disabled:text-muted-foreground';
const border = (invalid) => (invalid ? 'border-destructive focus:border-destructive' : 'border-border focus:border-info');

export const Input = forwardRef(function Input({ className = '', icon: Icon, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />}
      <input ref={ref} className={`${base} ${border(props['aria-invalid'])} h-10 ${Icon ? 'pl-9' : 'px-3'} pr-3 ${className}`} {...props} />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`${base} ${border(props['aria-invalid'])} min-h-20 resize-y px-3 py-2 ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', icon: Icon, iconClassName = 'text-brand-700', children, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && <Icon className={`pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 ${iconClassName}`} aria-hidden />}
      <select ref={ref} className={`${base} ${border(props['aria-invalid'])} h-10 appearance-none ${Icon ? 'pl-10' : 'pl-3'} pr-9 font-medium ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  );
});

export function Checkbox({ checked, onChange, label, disabled, className = '' }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
      <input type="checkbox" className="size-4 rounded border-border accent-brand-800" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Segmented radio group, e.g. JavaScript / TypeScript. */
export function RadioCards({ name, value, options, onChange, invalid }) {
  return (
    <div role="radiogroup" className={`grid grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-surface p-1 ${invalid ? 'border-destructive' : 'border-border'}`}>
      {options.map((o) => (
        <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-base font-medium transition-colors ${value === o.value ? 'bg-primary-light text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="size-4 accent-primary" />
          {o.icon}
          {o.label}
        </label>
      ))}
    </div>
  );
}
