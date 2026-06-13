import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkCenter } from '../../api/workcenters.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const WorkCenterFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createMutation = useMutation({
    mutationFn: createWorkCenter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workcenters'] });
      setSuccess(`Work Center "${data.workCenter.name}" created successfully.`);
      setTimeout(() => {
        navigate('/products?tab=workcenters');
      }, 1000);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to create work center.');
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
      description: form.description.trim() || undefined
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Add New Work Center
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
              Configure basic details and description for the assembly line or work floor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/products?tab=workcenters')}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
          >
            ← Back
          </button>
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            {error}
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            id="wc-name"
            label="Work Center Name"
            type="text"
            placeholder="Assembly Line 1"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Description</label>
            <textarea
              id="wc-desc"
              className="erp-input"
              placeholder="Primary work center for assembling component components."
              rows="4"
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              id="btn-save-wc"
              type="submit"
              loading={createMutation.isPending}
              style={{ flex: 1, background: '#FF540E' }}
            >
              Save Work Center
            </Button>
            <Button
              id="btn-cancel-wc"
              type="button"
              variant="secondary"
              onClick={() => navigate('/products?tab=workcenters')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkCenterFormPage;
