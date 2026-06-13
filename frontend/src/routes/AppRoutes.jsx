import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import HomePage from '../pages/home/HomePage';

// Role redirect helper
import { useAuthStore } from '../store/authStore';

const ROLE_HOME = {
  ADMIN:               '/dashboard',
  BUSINESS_OWNER:      '/dashboard',
  INVENTORY_MANAGER:   '/dashboard',
  SALES_USER:          '/sales',
  PURCHASE_USER:       '/purchase',
  MANUFACTURING_USER:  '/manufacturing',
};

const RoleRedirect = () => {
  const user = useAuthStore((s) => s.user);
  const home = ROLE_HOME[user?.role] || '/dashboard';
  return <Navigate to={home} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Unauthorized page */}
      <Route path="/unauthorized" element={
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>You don't have permission to view this page.</p>
          <a href="/" style={{ color: '#FF540E', textDecoration: 'none', fontSize: 14 }}>← Go back home</a>
        </div>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* ADMIN-only: register new users */}
      <Route path="/register" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AppLayout><RegisterPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Placeholder routes — will be filled in subsequent phases */}
      <Route path="/products"      element={<ProtectedRoute><AppLayout><ComingSoon title="Products" /></AppLayout></ProtectedRoute>} />
      <Route path="/sales"         element={<ProtectedRoute><AppLayout><ComingSoon title="Sales" /></AppLayout></ProtectedRoute>} />
      <Route path="/purchase"      element={<ProtectedRoute><AppLayout><ComingSoon title="Purchase" /></AppLayout></ProtectedRoute>} />
      <Route path="/manufacturing" element={<ProtectedRoute><AppLayout><ComingSoon title="Manufacturing" /></AppLayout></ProtectedRoute>} />
      <Route path="/bom"           element={<ProtectedRoute><AppLayout><ComingSoon title="Bill of Materials" /></AppLayout></ProtectedRoute>} />
      <Route path="/inventory"     element={<ProtectedRoute><AppLayout><ComingSoon title="Inventory" /></AppLayout></ProtectedRoute>} />
      <Route path="/audit"         element={<ProtectedRoute><AppLayout><ComingSoon title="Audit Log" /></AppLayout></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Temporary placeholder for phases 2–8
const ComingSoon = ({ title }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 12,
  }}>
    <div style={{
      width: 64,
      height: 64,
      background: 'var(--accent-light)',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      marginBottom: 8,
    }}>🔨</div>
    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title} Module</h2>
    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Coming in the next phase — stay tuned!</p>
  </div>
);

export default AppRoutes;
