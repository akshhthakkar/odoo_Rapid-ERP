import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ROLES = [
  { value: 'SALES_USER',          label: 'Sales User',          desc: 'Create & manage sales orders' },
  { value: 'PURCHASE_USER',       label: 'Purchase User',       desc: 'Create & manage purchase orders' },
  { value: 'MANUFACTURING_USER',  label: 'Manufacturing User',  desc: 'Manage production & work orders' },
  { value: 'INVENTORY_MANAGER',   label: 'Inventory Manager',   desc: 'Full inventory & stock visibility' },
  { value: 'BUSINESS_OWNER',      label: 'Business Owner',      desc: 'Read access to all modules + audit' },
  { value: 'ADMIN',               label: 'Admin',               desc: 'Full access to everything' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES_USER' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      setSuccess(`User "${form.name}" created successfully with role ${form.role.replace(/_/g, ' ')}.`);
      setForm({ name: '', email: '', password: '', role: 'SALES_USER' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Create Team Member
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Add a new user with a specific role. They can log in immediately after creation.
          </p>
        </div>

        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--danger)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--success)',
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form">
          <Input
            id="register-name"
            label="Full Name"
            type="text"
            placeholder="Sarah Johnson"
            value={form.name}
            onChange={handleChange('name')}
          />

          <Input
            id="register-email"
            label="Email Address"
            type="email"
            placeholder="sarah@company.com"
            value={form.email}
            onChange={handleChange('email')}
          />

          <Input
            id="register-password"
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={form.password}
            onChange={handleChange('password')}
          />

          {/* Role selector */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: r.value }))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${form.role === r.value ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                    background: form.role === r.value ? 'var(--accent-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: form.role === r.value ? '#A78BFA' : 'var(--text-primary)',
                    marginBottom: '2px',
                  }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              id="btn-register-submit"
              type="submit"
              loading={loading}
              style={{ flex: 1 }}
            >
              Create User
            </Button>
            <Button
              id="btn-register-cancel"
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
