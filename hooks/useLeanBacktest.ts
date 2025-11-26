import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api/client';
import { BacktestResult } from '../types';

type LeanStatus = 'idle' | 'queued' | 'running' | 'completed' | 'error';

type RunPayload = {
  asset: string;
  timeframe: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  cash?: number;
  feeBps?: number;
  slippageBps?: number;
};

const POLL_INTERVAL_MS = 1500;
const DEFAULT_PARAMS = {
  cash: 100000,
  feeBps: 0.5,
  slippageBps: 1,
};

export const useLeanBacktest = (onResult?: (result: BacktestResult) => void) => {
  const [status, setStatus] = useState<LeanStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const applyJobSnapshot = (job: any) => {
    const nextStatus = (job?.status as LeanStatus) || 'running';
    setStatus(nextStatus);
    setLogs((job?.logs || []).map((line: any) => String(line)));
    setError(job?.error || null);
    return nextStatus;
  };

  const fetchResult = async (id: string) => {
    const res = await apiClient.getLeanResults(id);
    if (res?.status !== 'completed') return;
    const parsed: BacktestResult = {
      ...res.result,
      source: 'lean',
      jobId: id,
    };
    setResult(parsed);
    setStatus('completed');
    onResult?.(parsed);
  };

  const pollJob = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const job = await apiClient.getLeanJob(id);
        const nextStatus = applyJobSnapshot(job);
        if (nextStatus === 'completed') {
          await fetchResult(id);
          stopPolling();
        } else if (nextStatus === 'error') {
          stopPolling();
        }
      } catch (err) {
        setStatus('error');
        setError((err as Error).message);
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const runLeanBacktest = async (payload: RunPayload) => {
    stopPolling();
    setStatus('running');
    setLogs([`[${new Date().toISOString()}] Starting Lean backtest for ${payload.asset}/${payload.timeframe}`]);
    setError(null);
    setResult(null);
    setJobId(null);

    try {
      const mergedPayload = { ...params, ...payload };
      const job = await apiClient.runLeanBacktest(mergedPayload);
      const id = job?.id;
      applyJobSnapshot(job);
      if (!id) {
        setStatus('error');
        setError('Lean job did not return an id');
        return;
      }
      setJobId(id);
      if (job.status === 'completed') {
        await fetchResult(id);
      } else if (job.status === 'running') {
        pollJob(id);
      } else if (job.status === 'error') {
        setError(job.error || 'Lean job failed to start');
      }
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
      setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${String((err as Error).message)}`]);
    }
  };

  const reset = () => {
    stopPolling();
    setStatus('idle');
    setLogs([]);
    setError(null);
    setJobId(null);
    setResult(null);
  };

  return {
    status,
    logs,
    jobId,
    error,
    result,
    params,
    runLeanBacktest,
    setParams,
    reset,
  };
};
