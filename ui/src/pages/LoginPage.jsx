import { motion } from 'framer-motion';
import { LoginForm } from '../features/auth/index.js';
import bgUrl from '../assets/brand/leftbar-bg.webp';

export function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(320px,440px)_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 bg-cover bg-top lg:block" style={{ backgroundImage: `url(${bgUrl})` }}>
        {/* The painting already carries the lighthouse: only the wordmark goes on top, as in the design system. */}
        <motion.div className="absolute inset-x-0 top-[37%] flex flex-col items-center px-10 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-serif text-5xl font-bold tracking-wide text-accent-foreground">LIGHTHOUSE</p>
          <p className="mt-2 flex items-center gap-3 text-sm font-semibold tracking-[0.4em] text-accent-foreground">
            <span className="h-0.5 w-10 rounded bg-beacon-500" aria-hidden />PROJECT STUDIO<span className="h-0.5 w-10 rounded bg-beacon-500" aria-hidden />
          </p>
          <p className="mt-10 font-serif text-2xl text-accent-foreground">One contract for every project.</p>
          <p className="mt-2 text-sm text-brand-200">Documentation-driven, stack-aware, deterministic.</p>
        </motion.div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="mb-10 font-display text-2xl font-extrabold tracking-wide text-navy-900 lg:hidden">LIGHTHOUSE</p>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Sign in</h1>
          <p className="mb-8 mt-1 text-muted-foreground">Use the account created by <code className="rounded bg-muted px-1 font-mono text-sm">npm run db:setup</code>.</p>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <LoginForm />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
