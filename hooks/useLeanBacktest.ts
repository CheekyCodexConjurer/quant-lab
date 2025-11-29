import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api/client';
import { BacktestResult, StrategyLabError } from '../types';
import { adaptLeanResult } from '../utils/leanResultAdapter';

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

/**
 * Hook para orquestrar backtests Lean via backend.
 *
 * Contrato principal:
 * - runLeanBacktest(payload) enfileira um job Lean com:
 *   { asset, timeframe, code?, startDate?, endDate?, cash?, feeBps?, slippageBps? }.
 * - status: 'idle' | 'queued' | 'running' | 'completed' | 'error'
 *   ('completed' equivale ao "done" descrito no roadmap).
 * - logs: linhas de stdout/stderr e mensagens internas do serviço Lean.
 * - result: BacktestResult | null (quando presente, sempre com source = 'lean').
 */
export const useLeanBacktest = (onResult?: (result: BacktestResult) => void) => {
  const [status, setStatus] = useState<LeanStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [errorMeta, setErrorMeta] = useState<StrategyLabError | null>(null);
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
    if (job?.errorMeta && typeof job.errorMeta === 'object') {
      const meta = job.errorMeta as any;
      const createdAt = typeof meta.createdAt === 'number' ? meta.createdAt : Date.now();
      setErrorMeta({
        source: 'strategy',
        type: String(meta.type || 'LeanError'),
        message: String(meta.message || job.error || 'Lean job error'),
        file: meta.file ? String(meta.file) : undefined,
        line: typeof meta.line === 'number' ? meta.line : undefined,
        column: typeof meta.column === 'number' ? meta.column : undefined,
        phase: meta.phase ? String(meta.phase) : undefined,
        traceback: meta.traceback ? String(meta.traceback) : undefined,
        createdAt,
      });
    } else {
      setErrorMeta(null);
    }
    return nextStatus;
  };

  const fetchResult = async (id: string) => {
    const res = await apiClient.getLeanResults(id);
    if (res?.status !== 'completed') return;
    const parsed: BacktestResult = adaptLeanResult(res.result, id);
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
    setErrorMeta(null);
  };

  return {
    status,
    logs,
    jobId,
    error,
    errorMeta,
    result,
    params,
    runLeanBacktest,
    setParams,
    reset,
  };
};
