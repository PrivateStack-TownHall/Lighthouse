const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  navy: 'bg-brand-100 text-brand-800',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  red: 'bg-primary-light text-beacon-700',
};

export function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/** Compatibility level -> badge tone and label. */
const LEVEL_TONE = { supported: 'success', allowed: 'info', warn: 'warning', unsupported: 'danger' };
export function LevelBadge({ level, className }) {
  if (!level) return null;
  return <Badge tone={LEVEL_TONE[level]} className={className}>{level.toUpperCase()}</Badge>;
}
