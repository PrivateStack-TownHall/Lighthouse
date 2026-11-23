import { useId } from 'react';

/** Label + control + hint/error. The control receives id, aria-invalid and aria-describedby. */
export function Field({ label, required, optional, hint, error, counter, className = '', children }) {
  const id = useId();
  const describedBy = error || hint ? `${id}-msg` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-foreground">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(Optional)</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-2">
          <p id={describedBy} className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{error ?? hint}</p>
          {counter && <span className="shrink-0 text-xs text-muted-foreground">{counter}</span>}
        </div>
      )}
    </div>
  );
}
