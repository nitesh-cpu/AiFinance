import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for initial auth session
    const savedUser = localStorage.getItem('spendsense_user') || sessionStorage.getItem('spendsense_user');
    const savedToken = localStorage.getItem('spendsense_token') || sessionStorage.getItem('spendsense_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('spendsense_user');
        localStorage.removeItem('spendsense_token');
        sessionStorage.removeItem('spendsense_user');
        sessionStorage.removeItem('spendsense_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, rememberMe) => {
    const res = await authService.login(email, password, rememberMe);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const register = async (fullName, email, password) => {
    const res = await authService.register(fullName, email, password);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUserProfile = (updatedFields) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedFields };
      localStorage.setItem('spendsense_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
