import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { changePassword } from '../../api/users.api';
import rapidLogo from '../../assets/rapid-logo.png';

const ROLE_HOME = {
  ADMIN:               '/dashboard',
  BUSINESS_OWNER:      '/dashboard',
  INVENTORY_MANAGER:   '/dashboard',
  SALES_USER:          '/sales',
  PURCHASE_USER:       '/purchase',
  MANUFACTURING_USER:  '/manufacturing',
};

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess('Password changed successfully! Redirecting...');
      updateUser({ mustChangePassword: false });
      setTimeout(() => {
        navigate(ROLE_HOME[user?.role] || '/dashboard', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
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

        .grid-h-line {
          position: absolute;
          left: -100vw;
          right: -100vw;
          height: 1px;
          background-color: #E2E8F0;
          pointer-events: none;
        }

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
      `}</style>

      <div className="auth-page-container">
        <div className="grid-v-line grid-v-line-left" />
        <div className="grid-v-line grid-v-line-right" />

        <div className="auth-center-column">
          {/* Logo */}
          <div className="auth-row" style={{ padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="grid-h-line" style={{ top: 0 }} />
            <div className="grid-plus grid-plus-tl">+</div>
            <div className="grid-plus grid-plus-tr">+</div>

             <div style={{ display: 'flex', alignItems: 'center' }}>
               <img src={rapidLogo} alt="RAPID" style={{ height: '130px', objectFit: 'contain' }} />
             </div>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Title Header */}
          <div className="auth-row" style={{ padding: '24px 40px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Set a New Password</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              For security, you must update your password before proceeding.
            </p>
            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>

          {/* Form */}
          <div className="auth-row" style={{ padding: '36px 40px' }}>
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

            {error && (
              <div style={{
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

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label className="auth-label">Current / Temporary Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="auth-label">New Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="auth-label">Confirm New Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="auth-button-submit"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>

            <div className="grid-h-line" style={{ bottom: 0 }} />
            <div className="grid-plus grid-plus-bl">+</div>
            <div className="grid-plus grid-plus-br">+</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangePasswordPage;
