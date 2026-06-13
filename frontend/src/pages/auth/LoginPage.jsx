import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ROLE_HOME = {
  ADMIN:               '/dashboard',
  BUSINESS_OWNER:      '/dashboard',
  INVENTORY_MANAGER:   '/dashboard',
  SALES_USER:          '/sales',
  PURCHASE_USER:       '/purchase',
  MANUFACTURING_USER:  '/manufacturing',
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth, token } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Already logged in → redirect
  if (token) {
    const user = useAuthStore.getState().user;
    return <Navigate to={ROLE_HOME[user?.role] || '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { token: jwt, user } = await login({ email: email.trim(), password });
      setAuth(user, jwt);
      navigate(ROLE_HOME[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        top: '-200px',
        right: '-200px',
        animation: 'pulse-glow 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(91,33,182,0.1) 0%, transparent 70%)',
        bottom: '-100px',
        left: '-100px',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: 420,
        padding: '40px 36px',
        margin: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
            marginBottom: '16px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Mini ERP
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} id="login-form">
          <Input
            id="login-email"
            label="Email Address"
            type="email"
            placeholder="admin@erp.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />

          <div style={{ position: 'relative' }}>
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '34px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <Button
            id="btn-login-submit"
            type="submit"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px', padding: '13px', fontSize: '15px', letterSpacing: '0.2px' }}
          >
            Sign In
          </Button>
        </form>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: '24px',
          padding: '14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Demo Credentials
          </p>
          {[
            { label: 'Admin', email: 'admin@erp.com', pass: 'Admin@123' },
            { label: 'Sales', email: 'sarah@erp.com', pass: 'Pass@123' },
          ].map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => { setEmail(d.email); setPassword(d.pass); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '5px 8px',
                marginBottom: '3px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-light)';
                e.currentTarget.style.color = '#A78BFA';
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <span style={{ fontWeight: 600 }}>{d.label}:</span> {d.email} / {d.pass}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
