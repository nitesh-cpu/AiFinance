import api from './api';

export const forecastService = {
  getForecast: async () => {
    const res = await api.get('/forecast');
    return res.data;
  },
};
