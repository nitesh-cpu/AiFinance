import api from './api';

export const reportService = {
  getMonthlyReport: async () => {
    const res = await api.get('/reports/monthly');
    return res.data;
  },
};
