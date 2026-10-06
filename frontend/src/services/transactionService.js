import api from './api';

export const transactionService = {
  getTransactions: async (params = {}) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  createTransaction: async (data) => {
    const res = await api.post('/transactions', data);
    return res.data;
  },

  updateTransaction: async (id, data) => {
    const res = await api.put(`/transactions/${id}`, data);
    return res.data;
  },

  deleteTransaction: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
  },

  importCSV: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/transactions/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get('/transactions/categories');
    return res.data.categories;
  },
};
