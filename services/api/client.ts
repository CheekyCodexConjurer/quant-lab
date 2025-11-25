const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4800';

const headers = {
  'Content-Type': 'application/json',
};

export const apiClient = {
  async importDukascopy(payload: { asset: string; timeframe: string; startDate?: string; endDate?: string }) {
    const res = await fetch(`${BASE_URL}/api/import/dukascopy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to start Dukascopy import');
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
    if (!res.ok) throw new Error('Job not found');
    return res.json();
  },

  async getNormalization() {
    const res = await fetch(`${BASE_URL}/api/normalization`);
    if (!res.ok) throw new Error('Failed to fetch normalization');
    return res.json();
  },

  async updateNormalization(payload: { tickSize?: number; timezone?: string; basis?: string }) {
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

  async fetchData(asset: string, timeframe: string) {
    const res = await fetch(`${BASE_URL}/api/data/${asset}/${timeframe}`);
    if (!res.ok) throw new Error('Dataset not available');
    return res.json();
  },
};
