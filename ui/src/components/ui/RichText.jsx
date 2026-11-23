/** Renders `code` spans and **bold** inside short library texts (rules, messages). */
export function RichText({ text, className = '' }) {
  const parts = String(text ?? '').split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-brand-800">{p.slice(1, -1)}</code>;
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return p;
      })}
    </span>
  );
}
