import { useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { LicenseMode, LicenseState } from '../types';
import { apiClient } from '../services/api/client';

const NORMALIZE_KEY = (key: string) => key.trim();

const detectModeFromKey = (key: string | undefined): LicenseMode => {
  const safe = (key || '').trim();
  if (!safe) return 'internal';
  if (safe.toUpperCase().startsWith('TLAB-')) return 'early-access';
  return 'expired';
};

export const useLicense = () => {
  const { license, setLicense } = useAppState();

  const applyKey = useCallback(
    async (rawKey: string) => {
      const normalizedKey = NORMALIZE_KEY(rawKey);
      const localMode = detectModeFromKey(normalizedKey);
      let next: LicenseState = { mode: localMode, key: normalizedKey || undefined };

      if (typeof window !== 'undefined' && normalizedKey) {
        try {
          const serverResult = await apiClient.validateLicenseKey(normalizedKey);
          const serverMode = detectModeFromKey(serverResult?.mode as string | undefined);
          next = {
            mode: serverMode,
            key: normalizedKey || undefined,
          };
        } catch (error: any) {
          // Em ambientes offline ou erro de rede, mantemos o comportamento local.
          if (!error?.isNetworkError) {
            // Para outros erros, apenas logamos em console e seguimos com o modo local.
            // eslint-disable-next-line no-console
            console.warn?.('[license] backend validation failed, using local mode', error);
          }
        }
      }

      setLicense(next);
      return next;
    },
    [setLicense]
  );

  const clearKey = useCallback(() => {
    const next: LicenseState = { mode: 'internal' };
    setLicense(next);
    return next;
  }, [setLicense]);

  return {
    license,
    applyKey,
    clearKey,
  };
};
