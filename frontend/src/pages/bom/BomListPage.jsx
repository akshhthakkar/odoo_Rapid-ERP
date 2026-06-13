import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoms, deleteBom } from '../../api/bom.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';

const BomListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [includeInactive, setIncludeInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── QUERY: GET BOMS ────────────────────────────────────────────────────────
  const { data: boms = [], isLoading } = useQuery({
    queryKey: ['boms', includeInactive],
    queryFn: () => getBoms({ includeInactive }),
  });

  // ─── MUTATION: SOFT DELETE (DEACTIVATE) ──────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteBom,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setSuccessMessage(res.message || 'Bill of Materials deactivated successfully.');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to deactivate Bill of Materials.');
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 6000);
    },
  });

  // ─── ROLE GUARDS ───────────────────────────────────────────────────────────
  const canManageBom = ['ADMIN', 'MANUFACTURING_USER'].includes(userRole);

  const handleDelete = (id, productName) => {
    if (window.confirm(`Are you sure you want to deactivate the Bill of Materials for "${productName}"? This will disable it for future Manufacturing Orders.`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDuration = (mins) => {
    if (!mins) return '0 mins';
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs} hr${hrs > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}` : `${hrs} hr${hrs > 1 ? 's' : ''}`;
  };

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Bill of Materials</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure product assembly component lists and manufacturing process operations.</p>
        </div>
        {canManageBom && (
          <Button
            id="btn-create-bom"
            onClick={() => navigate('/bom/new')}
            style={{ background: '#FF540E' }}
          >
            + Add BoM
          </Button>
        )}
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="animate-shake" style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: 'var(--danger)',
          fontSize: '13.5px',
          display: 'flex',
          gap: '8px',
        }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: 'var(--success)',
          fontSize: '13.5px',
          display: 'flex',
          gap: '8px',
        }}>
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Content Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Toggle option */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              id="toggle-inactive-boms"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#FF540E',
                cursor: 'pointer',
              }}
            />
            Show Inactive BoMs
          </label>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading Bills of Materials...</div>
        ) : boms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '28px' }}>📋</span>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>No Bills of Materials found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Finished Product SKU</th>
                  <th>Finished Product Name</th>
                  <th>Version</th>
                  <th>Components</th>
                  <th>Operations</th>
                  <th>Total Duration</th>
                  <th>Status</th>
                  {canManageBom && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {boms.map((bom) => (
                  <tr key={bom.id}>
                    <td style={{ fontWeight: 600, color: '#FF8A58' }}>{bom.product?.sku}</td>
                    <td>{bom.product?.name}</td>
                    <td>{bom.version}</td>
                    <td>
                      <span className="badge badge-muted" style={{ fontWeight: 600 }}>
                        {bom.componentCount} component{bom.componentCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontWeight: 600 }}>
                        {bom.operationCount} step{bom.operationCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>{formatDuration(bom.totalOperationTime)}</td>
                    <td>
                      {bom.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger" style={{ opacity: 0.7 }}>Inactive</span>
                      )}
                    </td>
                    {canManageBom && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(`/bom/edit/${bom.id}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '13px',
                              padding: '4px 8px',
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#FF8A58'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                          >
                            Edit
                          </button>
                          {bom.isActive && (
                            <button
                              onClick={() => handleDelete(bom.id, bom.product?.name)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                padding: '4px 8px',
                              }}
                              onMouseEnter={(e) => e.target.style.color = 'var(--danger)'}
                              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BomListPage;
