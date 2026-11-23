/** Informational workflow guide; icons do not track completion. */
export function Stepper({ steps }) {
  return (
    <ol aria-label="Contract generation steps" className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {steps.map(({ title, icon: Icon }) => (
        <li key={title} className="flex min-w-0 items-center gap-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-800"><Icon className="size-4" aria-hidden /></span>
          <span className="text-[11px] font-semibold leading-snug text-navy-900">{title}</span>
        </li>
      ))}
    </ol>
  );
}
