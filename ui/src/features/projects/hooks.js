import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api-client.js';
import { stableStringify } from '../../helpers/index.js';
import { createProject, getProject, updateProject } from './api.js';

const KEY = 'lighthouse.projectId';
const readId = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeId = (id) => { try { localStorage.setItem(KEY, id); } catch { /* memory only */ } };

/** Loads the last configuration once (database/projects.json), then saves every change 800 ms after the last edit. */
export function useAutosave({ clean, onLoaded, enabled }) {
  const [state, setState] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [ready, setReady] = useState(false);
  const idRef = useRef(readId());
  const lastSaved = useRef(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => { onLoadedRef.current = onLoaded; });

  useEffect(() => {
    if (!enabled || ready) return undefined;
    let cancelled = false;
    (async () => {
      if (idRef.current) {
        try {
          const p = await getProject(idRef.current);
          if (!cancelled) { onLoadedRef.current(p.config); lastSaved.current = stableStringify(p.config); }
        } catch {
          idRef.current = null; // deleted or unreachable: the next edit creates a new project
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [enabled, ready]);

  const key = stableStringify(clean);
  useEffect(() => {
    if (!enabled || !ready || !clean.project.name || key === lastSaved.current) return undefined;
    const t = setTimeout(async () => {
      setState('saving');
      try {
        const body = { name: clean.project.name, config: clean };
        let saved;
        try {
          saved = idRef.current ? await updateProject({ id: idRef.current, ...body }) : await createProject(body);
        } catch (e) {
          if (!(e instanceof ApiError && e.code === 'NOT_FOUND')) throw e;
          saved = await createProject(body);
        }
        idRef.current = saved.id; writeId(saved.id); lastSaved.current = key;
        setState('saved');
      } catch {
        setState('error');
      }
    }, 800);
    return () => clearTimeout(t);
  }, [key, clean, enabled, ready]);

  return { saveState: state, ready };
}
