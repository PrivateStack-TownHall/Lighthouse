import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-brand-800 border border-brand-800/25 hover:bg-brand-50',
  ghost: 'text-brand-800 hover:bg-muted',
  danger: 'bg-surface text-destructive border border-destructive/40 hover:bg-destructive/5',
  dark: 'bg-brand-800 text-accent-foreground hover:bg-brand-900',
  outlinePrimary: 'bg-surface text-primary border border-primary hover:bg-primary-light',
};
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-base gap-2.5' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden /> : null}
      {children}
    </button>
  );
});
