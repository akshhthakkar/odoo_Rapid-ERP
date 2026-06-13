import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { register } from '../../api/auth.api';

const ROLE_HOME = {
  ADMIN:               '/dashboard',
  BUSINESS_OWNER:      '/dashboard',
  INVENTORY_MANAGER:   '/dashboard',
  SALES_USER:          '/sales',
  PURCHASE_USER:       '/purchase',
  MANUFACTURING_USER:  '/manufacturing',
};

const SignupPage = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to the role's home page
  if (token) {
    const user = useAuthStore.getState().user;
    return <Navigate to={ROLE_HOME[user?.role] || '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const name = email.split('@')[0];
      await register({ name, email: email.trim(), password, role: 'SALES_USER' });
      setSuccess('Account created successfully! Redirecting to Log In...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Public registration is restricted on this ERP. Please contact your system Administrator.');
      } else {
        setError(err.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-page-container {
          min-height: 100vh;
          background-color: #F9FAFB;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-x: hidden;
          position: relative;
          padding: 60px 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Vertical grid lines extending through the full screen height */
        .grid-v-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background-color: #E2E8F0;
          pointer-events: none;
        }
        .grid-v-line-left {
          left: calc(50% - 230px);
        }
        .grid-v-line-right {
          left: calc(50% + 230px);
        }

        .auth-center-column {
          width: 460px;
          position: relative;
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .auth-row {
          width: 100%;
          position: relative;
          box-sizing: border-box;
        }

        /* Horizontal grid lines extending screen-wide */
        .grid-h-line {
          position: absolute;
          left: -100vw;
          right: -100vw;
          height: 1px;
          background-color: #E2E8F0;
          pointer-events: none;
        }

        /* Monospace intersection plus symbol style */
        .grid-plus {
          position: absolute;
          font-size: 13px;
          color: #94A3B8;
          background-color: #F9FAFB;
          width: 11px;
          height: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          line-height: 1;
          z-index: 20;
          pointer-events: none;
          user-select: none;
        }

        .grid-plus-tl { top: -6px; left: -5px; }
        .grid-plus-tr { top: -6px; right: -5px; }
        .grid-plus-bl { bottom: -6px; left: -5px; }
        .grid-plus-br { bottom: -6px; right: -5px; }

        /* Form styling */
        .auth-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .auth-input {
          width: 100%;
          border: 1px solid #D1D5DB;
          border-radius: 9999px;
          padding: 11px 20px;
          background: #FFFFFF;
          color: #0F172A;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .auth-input:focus {
          border-color: #FF540E;
          box-shadow: 0 0 0 3px rgba(255, 84, 14, 0.15);
        }

        .auth-input::placeholder {
          color: #9CA3AF;
        }

        .auth-button-submit {
          width: 100%;
          background: #FF540E;
          color: #FFFFFF;
          border-radius: 9999px;
          border: none;
          padding: 12.5px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          margin-top: 8px;
        }

        .auth-button-submit:hover:not(:disabled) {
          background: #E04300;
        }

        .auth-button-submit:active:not(:disabled) {
          transform: scale(0.98);
        }

        .auth-button-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-footnote {
          font-size: 11.5px;
          color: #94A3B8;
          text-align: center;
          line-height: 1.5;
        }

        .auth-footnote a {
          color: #64748B;
          text-decoration: underline;
          transition: color 0.15s;
        }

        .auth-footnote a:hover {
          color: #0F172A;
        }
      `}</style>

      <div className="auth-page-container">
        {/* Full-height vertical grid lines */}
        <div className="grid-v-line grid-v-line-left" />
        <div className="grid-v-line grid-v-line-right" />

        <div className="auth-center-column">
          {/* Row 1: Logo */}
          <div className="auth-row" style={{ padding: '36px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="grid-h-line" style={{ top: 0 }} />
            <div className="grid-plus grid-plus-tl">+</div>
            <div className="grid-plus grid-plus-tr">+</div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <img src="/logo.png" alt="Rapid Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
               <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Rapid</span>
             </div>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Row 2: Title Header */}
          <div className="auth-row" style={{ padding: '24px 40px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Sign Up</h2>
            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Row 3: Credentials Form */}
          <div className="auth-row" style={{ padding: '36px 40px' }}>
            {/* Success message */}
            {success && (
              <div style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#10B981',
              }}>
                {success}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="animate-shake" style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <span style={{ marginTop: '1.5px' }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} id="auth-form">
              <div style={{ marginBottom: '18px' }}>
                <label className="auth-label">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="auth-label">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="auth-button-submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </form>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Row 4: Redirect Option */}
          <div className="auth-row" style={{ padding: '24px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              Already have an account?{' '}
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                style={{
                  color: '#FF540E',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#E04300'}
                onMouseLeave={(e) => e.target.style.color = '#FF540E'}
              >
                Log In
              </a>
            </div>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Row 5: Footer */}
          <div className="auth-row" style={{ padding: '20px 40px' }}>
            <div className="auth-footnote">
              By signing up, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
            </div>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;

