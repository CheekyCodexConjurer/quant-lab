import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api/client';

type ImportStatus = 'idle' | 'running' | 'completed' | 'error';

type JobLog = { timestamp?: string; message: string };

const formatLogs = (logs: JobLog[] = []) =>
  logs.map((log) => `[${log.timestamp || new Date().toISOString()}] ${log.message}`);

const POLL_INTERVAL_MS = 1500;
const IMPORT_TIMEFRAME = 'TICK';

export const useDataImport = (asset: string, _timeframe: string) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
        if (nextStatus === 'completed' || nextStatus === 'error') {
          stopPolling();
        }
      } catch (error) {
        stopPolling();
        const message = (error as Error).message;
        setStatus('error');
        setLogs((prev) => [...prev, `[${new Date().toISOString()}] Error polling job: ${message}`]);
      }
    }, POLL_INTERVAL_MS);
  };

  const runJob = async (promise: Promise<any>) => {
    try {
      const job = await promise;
      const nextStatus = applyJobSnapshot(job);
      const id = job?.id || null;
      setJobId(id);
      if (id && nextStatus === 'running') {
        startPolling(id);
      } else {
        stopPolling();
      }
      return job;
    } catch (error) {
      const message = (error as Error).message;
      setStatus('error');
      setLogs((prev) => [...prev, `[${new Date().toISOString()}] Error: ${message}`]);
      stopPolling();
      throw error;
    }
  };

  const importDukascopy = async (range: { startDate?: string; endDate?: string; fullHistory?: boolean } = {}) => {
    setStatus('running');
    const payload = {
      asset: asset.toUpperCase(),
      timeframe: IMPORT_TIMEFRAME,
      ...range,
    };
    setLogs([
      `[${new Date().toISOString()}] Starting Dukascopy import: asset=${payload.asset}, timeframe=${payload.timeframe}, start=${
        payload.startDate || 'oldest'
      }, end=${payload.endDate || 'present'}, fullHistory=${Boolean(payload.fullHistory)}`,
    ]);
    setProgress(0);
    return runJob(apiClient.importDukascopy(payload));
  };

  const importCustom = async (filename: string) => {
    setStatus('running');
    setLogs([]);
    setProgress(0);
    return runJob(apiClient.importCustom({ filename }));
  };

  return {
    status,
    logs,
    jobId,
    progress,
    importDukascopy,
    importCustom,
    reset: () => {
      stopPolling();
      setStatus('idle');
      setLogs([]);
      setProgress(0);
      setJobId(null);
    },
  };
};
