const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4800';

const headers = {
  'Content-Type': 'application/json',
};

export const apiClient = {
  async importDukascopy(payload: {
    asset: string;
    timeframe: string;
    startDate?: string;
    endDate?: string;
    fullHistory?: boolean;
    mode?: 'continue' | 'restart';
  }) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/import/dukascopy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const err = new Error(`Failed to reach backend (${BASE_URL}): ${(error as Error).message}`);
      (err as any).isNetworkError = true;
      throw err;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body?.error || 'Failed to start Dukascopy import';
      throw new Error(message);
    }
    return res.json();
  },

  async checkDukascopy(payload: { asset: string }) {
    const res = await fetch(`${BASE_URL}/api/import/dukascopy/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to check Dukascopy dataset');
    return res.json();
  },

  async importCustom(payload: { filename: string }) {
    const res = await fetch(`${BASE_URL}/api/import/custom`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to import custom file');
    return res.json();
  },

  async getJob(jobId: string) {
    const res = await fetch(`${BASE_URL}/api/import/jobs/${jobId}`);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message = errBody?.error || 'Job not found';
      const bootId = errBody?.serverBootId;
      const err = new Error(message) as Error & { serverBootId?: string };
      if (bootId) (err as any).serverBootId = bootId;
      throw err;
    }
    return res.json();
  },

  async cancelJob(jobId: string) {
    const res = await fetch(`${BASE_URL}/api/import/jobs/${jobId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message = errBody?.error || 'Failed to cancel job';
      throw new Error(message);
    }
    return res.json();
  },

  async health() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getNormalization() {
    const res = await fetch(`${BASE_URL}/api/normalization`);
    if (!res.ok) throw new Error('Failed to fetch normalization');
    return res.json();
  },

  async updateNormalization(payload: {
    tickSize?: number;
    timezone?: string;
    basis?: string;
    gapQuantization?: {
      enabled?: boolean;
    };
  }) {
    const res = await fetch(`${BASE_URL}/api/normalization`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update normalization');
    return res.json();
  },

  async listDatasets() {
    const res = await fetch(`${BASE_URL}/api/data`);
    if (!res.ok) throw new Error('Failed to list datasets');
    return res.json();
  },

  async fetchDataText(asset: string, timeframe: string, options: { signal?: AbortSignal } = {}) {
    const res = await fetch(`${BASE_URL}/api/data/${asset}/${timeframe}`, {
      signal: options.signal,
    });
    if (!res.ok) throw new Error('Dataset not available');
    return res.text();
  },

  async listTimeframes(asset: string) {
    const normalized = String(asset || '').toLowerCase();
    const res = await fetch(`${BASE_URL}/api/data/${normalized}/timeframes`);
    if (!res.ok) throw new Error('Failed to list timeframes');
    return res.json();
  },

  async fetchData(asset: string, timeframe: string) {
    const res = await fetch(`${BASE_URL}/api/data/${asset}/${timeframe}`);
    if (!res.ok) throw new Error('Dataset not available');
    return res.json();
  },

  async listIndicators() {
    const res = await fetch(`${BASE_URL}/api/indicators`);
    if (!res.ok) throw new Error('Failed to list indicators');
    return res.json();
  },

  async getIndicator(id: string) {
    const res = await fetch(`${BASE_URL}/api/indicators/${id}`);
    if (!res.ok) throw new Error('Indicator not found');
    return res.json();
  },

  async saveIndicator(id: string, payload: { code?: string; filePath?: string; active?: boolean; name?: string }) {
    const res = await fetch(`${BASE_URL}/api/indicators/${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save indicator');
    return res.json();
  },

  async uploadIndicator(payload: { code: string; filePath: string }) {
    const res = await fetch(`${BASE_URL}/api/indicators`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save indicator');
    return res.json();
  },

  async setIndicatorActive(id: string, active: boolean) {
    const res = await fetch(`${BASE_URL}/api/indicators/${id}/active`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error('Failed to toggle indicator');
    return res.json();
  },

  async deleteIndicator(id: string) {
    const res = await fetch(`${BASE_URL}/api/indicators/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Failed to delete indicator');
    }
    return res.json();
  },

  async listStrategies() {
    const res = await fetch(`${BASE_URL}/api/strategies`);
    if (!res.ok) throw new Error('Failed to list strategies');
    return res.json();
  },

  async getStrategy(id: string) {
    const res = await fetch(`${BASE_URL}/api/strategies/${id}`);
    if (!res.ok) throw new Error('Strategy not found');
    return res.json();
  },

  async saveStrategy(id: string, payload: { code: string; filePath?: string }) {
    const res = await fetch(`${BASE_URL}/api/strategies/${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save strategy');
    return res.json();
  },

  async uploadStrategy(payload: { code: string; filePath: string }) {
    const res = await fetch(`${BASE_URL}/api/strategies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save strategy');
    return res.json();
  },

  async deleteStrategy(id: string) {
    const res = await fetch(`${BASE_URL}/api/strategies/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete strategy');
    return res.json();
  },

  async runLeanBacktest(payload: {
    asset: string;
    timeframe: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    cash?: number;
    feeBps?: number;
    slippageBps?: number;
  }) {
    const res = await fetch(`${BASE_URL}/api/lean/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Failed to start Lean backtest');
    }
    return res.json();
  },

  async getLeanJob(jobId: string) {
    const res = await fetch(`${BASE_URL}/api/lean/jobs/${jobId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Lean job not found');
    }
    return res.json();
  },

  async getLeanResults(jobId: string) {
    const res = await fetch(`${BASE_URL}/api/lean/results/${jobId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Lean results not available');
    }
    return res.json();
  },
};
