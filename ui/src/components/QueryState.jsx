import { LoaderCircle, CircleAlert, Inbox } from 'lucide-react';
import { toastMessageFor } from '../lib/error-messages.js';
import { Button } from './ui/Button.jsx';

/** One shared loading / error / empty treatment (from contract-kit/frontend/src/components/QueryState.tsx). */
export function QueryState({ isLoading, error, isEmpty, onRetry, emptyTitle = 'Nothing here yet', emptyHint, children }) {
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden /> Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleAlert className="size-8 text-destructive" aria-hidden />
        <p className="text-sm text-foreground">{toastMessageFor(error)}</p>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <Inbox className="mb-1 size-8 text-gray-500" aria-hidden />
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        {emptyHint && <p className="text-sm text-muted-foreground">{emptyHint}</p>}
      </div>
    );
  }
  return <>{children}</>;
}
