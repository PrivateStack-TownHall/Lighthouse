import { useSyncExternalStore } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { session } from '../../lib/session.js';
import { login } from './api.js';

export const useSession = () => useSyncExternalStore(session.subscribe, session.get, session.get);

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      session.set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      qc.invalidateQueries();
    },
  });
}
