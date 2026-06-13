import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer } from '../../api/customers.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const CustomerFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSuccess(`Customer "${data.customer.name}" created successfully.`);
      setTimeout(() => {
        navigate('/products?tab=customers');
      }, 1000);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to create customer.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Add New Customer
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Configure basic details and contact information for the customer.
          </p>
        </div>

        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            color: 'var(--danger)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            color: 'var(--success)',
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            id="cust-name"
            label="Customer Name"
            type="text"
            placeholder="Acme Corporation"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />

          <Input
            id="cust-email"
            label="Email Address"
            type="email"
            placeholder="contact@company.com"
            value={form.email}
            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
          />

          <Input
            id="cust-phone"
            label="Phone Number"
            type="text"
            placeholder="+1 (555) 019-2834"
            value={form.phone}
            onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
          />

          <Input
            id="cust-address"
            label="Address"
            type="text"
            placeholder="123 Industrial Rd, Austin TX"
            value={form.address}
            onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <Button
              id="btn-save-customer"
              type="submit"
              loading={createMutation.isPending}
              style={{ flex: 1, background: '#FF540E' }}
            >
              Save Customer
            </Button>
            <Button
              id="btn-cancel-customer"
              type="button"
              variant="secondary"
              onClick={() => navigate('/products?tab=customers')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormPage;
