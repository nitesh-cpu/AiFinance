import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Dashboard Pages
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Analysis } from './pages/Analysis';
import { AIInsights } from './pages/AIInsights';
import { Anomalies } from './pages/Anomalies';
import { Recurring } from './pages/Recurring';
import { Budgets } from './pages/Budgets';
import { CashFlow } from './pages/CashFlow';
import { Forecast } from './pages/Forecast';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner label="Authenticating session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

// Public Only Route Wrapper (Redirects logged-in users away from /login)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner label="Checking session..." />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            {/* Protected Dashboard Layout & Pages */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="analysis" element={<Analysis />} />
              <Route path="ai-insights" element={<AIInsights />} />
              <Route path="anomalies" element={<Anomalies />} />
              <Route path="recurring" element={<Recurring />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="cash-flow" element={<CashFlow />} />
              <Route path="forecast" element={<Forecast />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
