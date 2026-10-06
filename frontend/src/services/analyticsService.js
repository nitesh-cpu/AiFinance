import api from './api';

export const analyticsService = {
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
  },

  getCategoryBreakdown: async () => {
    const res = await api.get('/analytics/categories');
    return res.data;
  },

  getSpendingTrend: async () => {
    const res = await api.get('/analytics/spending-trend');
    return res.data;
  },

  getCashFlow: async () => {
    const res = await api.get('/analytics/cash-flow');
    return res.data;
  },
};
