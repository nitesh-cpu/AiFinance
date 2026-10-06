import api from './api';

export const userService = {
  updateProfile: async (data) => {
    const res = await api.put('/user/profile', data);
    return res.data;
  },
  updatePreferences: async (data) => {
    const res = await api.put('/user/preferences', data);
    return res.data;
  },
  updateNotifications: async (data) => {
    const res = await api.put('/user/notifications', data);
    return res.data;
  },
  deleteAccount: async () => {
    const res = await api.delete('/user/account');
    return res.data;
  },
};
