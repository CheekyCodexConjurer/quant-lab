import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api/client';

type ImportStatus = 'idle' | 'running' | 'completed' | 'error' | 'canceled';

type JobLog = { timestamp?: string; message: string };
type FrameStatus = {
  currentFrame?: string | null;
  frameIndex?: number;
  frameCount?: number;
  frameProgress?: number;
  frameStage?: string;
};

const formatLogs = (logs: JobLog[] = []) =>
  logs.map((log) => `[${log.timestamp || new Date().toISOString()}] ${log.message}`);

const POLL_INTERVAL_MS = 1500;
const IMPORT_TIMEFRAME = 'M1';
const JOB_STORAGE_KEY = 'dataImportJobId';
const BOOT_STORAGE_KEY = 'dataImportBootId';

export const useDataImport = (asset: string, _timeframe: string) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const applyJobSnapshot = (job: any) => {
    const nextStatus = (job?.status as ImportStatus) || 'running';
    setStatus(nextStatus);
    setLogs(formatLogs(job?.logs ?? []));
    setFrameStatus({
      currentFrame: job?.currentFrame,
      frameIndex: job?.frameIndex,
      frameCount: job?.frameCount,
      frameProgress: typeof job?.frameProgress === 'number' ? job.frameProgress : undefined,
      frameStage: job?.frameStage,
    });
    setLastUpdated(new Date().toISOString());
    if (typeof job?.progress === 'number') {
      setProgress(job.progress);
    } else if (nextStatus === 'completed') {
      setProgress(1);
    }
    return nextStatus;
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const job = await apiClient.getJob(id);
        const nextStatus = applyJobSnapshot(job);
        if (nextStatus === 'completed' || nextStatus === 'error' || nextStatus === 'canceled') {
          stopPolling();
          localStorage.removeItem(JOB_STORAGE_KEY);
          localStorage.removeItem(BOOT_STORAGE_KEY);
        }
      } catch (error) {
        stopPolling();
        const err = error as Error & { serverBootId?: string; isNetworkError?: boolean };
        const message = err?.serverBootId
          ? `Job not found on server (server restarted: ${err.serverBootId}).`
          : err?.message || 'Failed to fetch job status';
        setStatus('error');
        setLogs((prev) => [...prev, `[${new Date().toISOString()}] Error polling job: ${message}`]);
        localStorage.removeItem(JOB_STORAGE_KEY);
        localStorage.removeItem(BOOT_STORAGE_KEY);
      }
    }, POLL_INTERVAL_MS);
  };

  const resumeJobIfNeeded = async () => {
    const storedId = localStorage.getItem(JOB_STORAGE_KEY);
    const storedBoot = localStorage.getItem(BOOT_STORAGE_KEY);
    if (!storedId || !storedBoot) return;
    try {
      const job = await apiClient.getJob(storedId);
      if (job?.serverBootId && job.serverBootId !== storedBoot) {
        localStorage.removeItem(JOB_STORAGE_KEY);
        localStorage.removeItem(BOOT_STORAGE_KEY);
        setLogs((prev) => [...prev, `[${new Date().toISOString()}] Job reset due to server restart.`]);
        return;
      }
      const nextStatus = applyJobSnapshot(job);
      setJobId(storedId);
      if (nextStatus === 'running') {
        startPolling(storedId);
      }
      if (nextStatus === 'error' || nextStatus === 'completed') {
        localStorage.removeItem(JOB_STORAGE_KEY);
        localStorage.removeItem(BOOT_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(JOB_STORAGE_KEY);
      localStorage.removeItem(BOOT_STORAGE_KEY);
    }
  };

  useEffect(() => {
    resumeJobIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runJob = async (promise: Promise<any>) => {
    try {
      const job = await promise;
      const nextStatus = applyJobSnapshot(job);
      const id = job?.id || null;
      setJobId(id);
      if (id) {
        localStorage.setItem(JOB_STORAGE_KEY, id);
        if (job?.serverBootId) {
          localStorage.setItem(BOOT_STORAGE_KEY, job.serverBootId);
        }
      }
      if (id && nextStatus === 'running') {
        startPolling(id);
      } else {
        stopPolling();
        if (id) {
          localStorage.removeItem(JOB_STORAGE_KEY);
          localStorage.removeItem(BOOT_STORAGE_KEY);
        }
      }
      return job;
    } catch (error) {
      const err = error as Error & { isNetworkError?: boolean };
      const message = err?.isNetworkError ? `Backend unreachable: ${err.message}` : err?.message;
      setStatus('error');
      setLogs((prev) => [...prev, `[${new Date().toISOString()}] Error: ${message}`]);
      stopPolling();
      throw error;
    }
  };

  const cancelJob = async () => {
    if (!jobId) return;
    try {
      await apiClient.cancelJob(jobId);
      setStatus('canceled');
      setLogs((prev) => [...prev, `[${new Date().toISOString()}] Job canceled.`]);
    } finally {
      stopPolling();
      localStorage.removeItem(JOB_STORAGE_KEY);
      localStorage.removeItem(BOOT_STORAGE_KEY);
    }
  };

  const importDukascopy = async (
    range: { startDate?: string; endDate?: string; fullHistory?: boolean } = {},
    mode: 'continue' | 'restart' = 'restart'
  ) => {
    // quick health check to surface network/backend issues early
    try {
      await apiClient.health();
    } catch (error) {
      setStatus('error');
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] Backend unreachable: ${(error as Error).message}`,
      ]);
      return;
    }

    setStatus('running');
    const payload = {
      asset: asset.toUpperCase(),
      timeframe: IMPORT_TIMEFRAME,
      ...range,
      mode,
    };
    setLogs((prev) => [
      ...prev,
      `[${new Date().toISOString()}] Starting Dukascopy import: asset=${payload.asset}, timeframe=${payload.timeframe}, start=${
        payload.startDate || 'oldest'
      }, end=${payload.endDate || 'present'}, fullHistory=${Boolean(payload.fullHistory)}, mode=${mode}`,
    ]);
    setProgress(0);
    return runJob(apiClient.importDukascopy(payload));
  };

  const checkExisting = async () => {
    const payload = { asset: asset.toUpperCase() };
    return apiClient.checkDukascopy(payload);
  };

  const importCustom = async (filename: string) => {
    setStatus('running');
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] Starting custom import: ${filename}`]);
    setProgress(0);
    return runJob(apiClient.importCustom({ filename }));
  };

  return {
    status,
    logs,
    jobId,
    progress,
    cancel: cancelJob,
    importDukascopy,
    importCustom,
    checkExisting,
    lastUpdated,
    reset: () => {
      stopPolling();
      setStatus('idle');
      setLogs([]);
      setProgress(0);
      setJobId(null);
      setFrameStatus({});
      setLastUpdated(null);
      localStorage.removeItem(JOB_STORAGE_KEY);
      localStorage.removeItem(BOOT_STORAGE_KEY);
    },
    clearLogs: () => {
      if (status === 'running') return;
      setLogs([]);
      setProgress(0);
      setFrameStatus({});
      setLastUpdated(null);
      setJobId(null);
      localStorage.removeItem(JOB_STORAGE_KEY);
      localStorage.removeItem(BOOT_STORAGE_KEY);
    },
    frameStatus,
  };
};
