import { useEffect } from 'react';
import { CustomIndicator } from '../../types';
import { apiClient } from '../../services/api/client';

type UseIndicatorHotReloadArgs = {
  indicators: CustomIndicator[];
  refreshFromDisk?: (id: string) => Promise<void> | void;
  onHotReload?: (indicator: CustomIndicator) => void;
  intervalMs?: number;
  debounceMs?: number;
  enabled?: boolean;
  startupDelayMs?: number;
};

/**
 * Polls the backend for indicator metadata (lastModified) and triggers
 * a lightweight hot-reload when it detects a newer version than the
 * appliedVersion currently in memory.
 *
 * It relies on refreshFromDisk (which already updates appliedVersion
 * and invalidates execution cache) and calls onHotReload after a
 * successful refresh.
 */
export const useIndicatorHotReload = ({
  indicators,
  refreshFromDisk,
  onHotReload,
  intervalMs = 1500,
  debounceMs = 400,
  enabled = true,
  startupDelayMs = 0,
}: UseIndicatorHotReloadArgs) => {
  useEffect(() => {
    if (!enabled || !refreshFromDisk || !indicators.length) return;

    let cancelled = false;
    const pending: Record<string, number> = {};

    const getIndicatorsById = () => {
      const map = new Map<string, CustomIndicator>();
      indicators.forEach((indicator) => {
        map.set(indicator.id, indicator);
      });
      return map;
    };

    const scheduleTick = () => {
      if (cancelled) return;
      window.setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      if (cancelled) return;
      const localById = getIndicatorsById();
      if (!localById.size) {
        scheduleTick();
        return;
      }
      try {
        const response = await apiClient.listIndicators();
        const items: any[] = Array.isArray((response as any)?.items)
          ? (response as any).items
          : [];

        const remoteById = new Map<string, any>();
        items.forEach((item) => {
          if (item && item.id) {
            remoteById.set(item.id, item);
          }
        });

        const now = Date.now();

        localById.forEach((local, id) => {
          const remote = remoteById.get(id);
          if (!remote || typeof remote.lastModified !== 'number') return;
          const applied = local.appliedVersion || 0;
          if (remote.lastModified <= applied) return;

          const existing = pending[id];
          const dueAt = now + debounceMs;
          if (!existing || existing < now) {
            pending[id] = dueAt;
            window.setTimeout(async () => {
              if (cancelled) return;
              const stamp = pending[id];
              if (!stamp || stamp > Date.now()) return;
              delete pending[id];
              try {
                await refreshFromDisk(id);
                if (onHotReload) {
                  const latest = getIndicatorsById().get(id) || local;
                  onHotReload(latest);
                }
              } catch {
                // On failure we keep the previous appliedVersion; errors
                // will be surfaced through the normal indicator error pipeline.
              }
            }, debounceMs);
          } else {
            pending[id] = Math.max(existing, dueAt);
          }
        });
      } catch {
        // ignore polling errors (backend down etc.)
      } finally {
        scheduleTick();
      }
    };

    const startHandle = window.setTimeout(() => {
      if (!cancelled) {
        tick();
      }
    }, Math.max(0, startupDelayMs));

    return () => {
      cancelled = true;
      window.clearTimeout(startHandle);
    };
  }, [indicators, refreshFromDisk, onHotReload, intervalMs, debounceMs, enabled, startupDelayMs]);
};
