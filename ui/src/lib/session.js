/**
 * Session store (tokens + user) kept in localStorage. Storage may be unavailable, so every access is guarded.
 * React reads it through useSyncExternalStore (features/auth/hooks.js).
 */
const KEY = 'lighthouse.session';
const listeners = new Set();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

let current = load();

export const session = {
  get: () => current,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(next) {
    current = next;
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable: keep the session in memory only */
    }
    listeners.forEach((fn) => fn());
  },
  patch(partial) {
    if (current) session.set({ ...current, ...partial });
  },
};
