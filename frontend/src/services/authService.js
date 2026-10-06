import api from './api';

const saveSession = (token, user, rememberMe = true) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem('spendsense_token');
  otherStorage.removeItem('spendsense_user');
  storage.setItem('spendsense_token', token);
  storage.setItem('spendsense_user', JSON.stringify(user));
};

export const authService = {
  login: async (email, password, rememberMe = true) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    saveSession(token, user, rememberMe);
    return { success: true, user, token };
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token, user } = res.data;
    saveSession(token, user);
    return { success: true, user, token };
  },

  forgotPassword: async () => {
    throw new Error('Password reset is not available yet.');
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('spendsense_user') || sessionStorage.getItem('spendsense_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout: async () => {
    localStorage.removeItem('spendsense_token');
    localStorage.removeItem('spendsense_user');
    sessionStorage.removeItem('spendsense_token');
    sessionStorage.removeItem('spendsense_user');
    return { success: true };
  },
};
