import api from './api';

export const budgetService = {
  getBudgets: async () => {
    const res = await api.get('/budgets');
    return res.data;
  },

  createBudget: async (data) => {
    const res = await api.post('/budgets', data);
    return res.data;
  },

  updateBudget: async (id, data) => {
    const res = await api.put(`/budgets/${id}`, data);
    return res.data;
  },

  deleteBudget: async (id) => {
    const res = await api.delete(`/budgets/${id}`);
    return res.data;
  },
};
