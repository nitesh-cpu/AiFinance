import api from './api';

export const insightService = {
  getHealthScore: async () => {
    const res = await api.get('/insights/health-score');
    return res.data;
  },

  getInsights: async () => {
    const res = await api.get('/insights');
    return res.data;
  },

  getAnomalies: async () => {
    const res = await api.get('/insights/anomalies');
    return res.data;
  },

  updateAnomalyStatus: async (id, status) => {
    const res = await api.patch(`/insights/anomalies/${id}`, { status });
    return res.data;
  },

  getRecurring: async () => {
    const res = await api.get('/insights/recurring');
    return res.data;
  },
};
