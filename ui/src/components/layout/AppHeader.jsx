import { Building2, ArrowUpRight } from 'lucide-react';
import logoUrl from '../../assets/brand/logo-horizontal-white.svg';
import headerBg from '../../assets/brand/header-bg.webp';

/** Product header with the reserved Brickhouse navigation button. */
export function AppHeader() {
  return (
    <header className="bg-topbar relative shrink-0 overflow-hidden text-accent-foreground">
      {/* Wide screens: the scene is right-aligned at full height; its left edge is the same navy as the bar. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-no-repeat lg:block"
        style={{ backgroundImage: `url(${headerBg})`, backgroundSize: 'auto 100%', backgroundPosition: 'right center' }} />
      <div className="relative flex h-20 items-center gap-3 px-4 sm:gap-6 sm:h-24 sm:px-8 xl:px-12">
        <img src={logoUrl} alt="Lighthouse" className="h-9 w-auto max-w-[42vw] shrink-0 sm:h-14" />
        <span className="hidden h-12 w-px bg-surface/30 md:block" aria-hidden />
        <div className="hidden min-w-0 flex-1 md:block">
          <h1 className="truncate font-display text-2xl font-extrabold leading-tight tracking-tight">
            Project Contract &amp; Prompt <span className="text-beacon-500">Generator</span>
          </h1>
          <p className="mt-1 truncate text-sm text-brand-100">Define your project, set the contract, and generate a complete, consistent project package.</p>
        </div>
        <button type="button" disabled title="Brickhouse — link belum diatur" className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-surface/30 bg-surface/10 px-3 text-xs font-bold text-accent-foreground disabled:cursor-not-allowed sm:h-10 sm:text-sm">
          <Building2 className="size-4" aria-hidden />Brickhouse<ArrowUpRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </header>
  );
}
