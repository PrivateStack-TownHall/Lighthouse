import { useEffect, useMemo, useReducer, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { stableStringify } from '../../helpers/index.js';
import { fetchOptions, checkConfig } from './api.js';
import { defaultConfig, reducer, sanitize } from './model.js';

export const useOptions = () => useQuery({ queryKey: ['options'], queryFn: fetchOptions, staleTime: Infinity });

export function useConfigState(initial = defaultConfig) {
  const [config, dispatch] = useReducer(reducer, undefined, initial);
  const clean = useMemo(() => sanitize(config), [config]);
  return { config, clean, dispatch };
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Live validation against the library, 350 ms after the last change. */
export function useCompatibility(clean, enabled = true) {
  const key = stableStringify(clean);
  const debouncedKey = useDebounced(key, 350);
  const q = useQuery({
    queryKey: ['check', debouncedKey],
    queryFn: () => checkConfig(JSON.parse(debouncedKey)),
    placeholderData: keepPreviousData,
    enabled,
  });
  return { ...q, isStale: key !== debouncedKey || q.isFetching };
}
