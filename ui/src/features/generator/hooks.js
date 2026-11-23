import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generate } from './api.js';

export function useGenerate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: generate, onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }) });
}
