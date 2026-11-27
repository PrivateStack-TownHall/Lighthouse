import { ChevronDown } from 'lucide-react';

export function DisclosureButton({ open, onToggle, className, chevronClassName = 'size-4', children }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className={className}>
      {children}
      <ChevronDown className={`${chevronClassName} transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
    </button>
  );
}
