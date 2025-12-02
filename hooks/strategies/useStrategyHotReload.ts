import { useEffect } from 'react';
import { StrategyFile } from '../../types';
import { apiClient } from '../../services/api/client';

type UseStrategyHotReloadArgs = {
  strategies: StrategyFile[];
  refreshFromDisk?: (id: string) => Promise<void> | void;
  onHotReload?: (strategy: StrategyFile) => void;
  intervalMs?: number;
  debounceMs?: number;
  enabled?: boolean;
  startupDelayMs?: number;
};

/**
 * Polls the backend for strategy metadata (lastModified) and triggers a
 * lightweight hot-reload when it detects a newer version on disk than the
 * appliedVersion currently in memory.
 *
 * This is useful when the user edits strategy files with an external editor:
 * the in-app editor and Lean runs stay in sync without requiring a manual reload.
 */
export const useStrategyHotReload = ({
  strategies,
  refreshFromDisk,
  onHotReload,
  intervalMs = 1500,
  debounceMs = 400,
  enabled = true,
  startupDelayMs = 0,
}: UseStrategyHotReloadArgs) => {
  useEffect(() => {
    if (!enabled || !refreshFromDisk || !strategies.length) return;

    let cancelled = false;
    const pending: Record<string, number> = {};

    const getStrategiesById = () => {
      const map = new Map<string, StrategyFile>();
      strategies.forEach((strategy) => {
        map.set(strategy.id, strategy);
      });
      return map;
    };

    const scheduleTick = () => {
      if (cancelled) return;
      window.setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      if (cancelled) return;

      const localById = getStrategiesById();
      if (!localById.size) {
        scheduleTick();
        return;
      }

      try {
        const response = await apiClient.listStrategies();
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

          const applied = local.appliedVersion || local.lastModified || 0;
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
                  const latest = getStrategiesById().get(id) || local;
                  onHotReload(latest);
                }
              } catch {
                // Keep previous appliedVersion on failure; errors surface via normal pipeline.
              }
            }, debounceMs);
          } else {
            pending[id] = Math.max(existing, dueAt);
          }
        });
      } catch {
        // Ignore polling errors (backend down, network issues, etc.).
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
  }, [strategies, refreshFromDisk, onHotReload, intervalMs, debounceMs, enabled, startupDelayMs]);
};
