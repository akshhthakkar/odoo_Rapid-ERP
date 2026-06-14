import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoms, deleteBom } from '../../api/bom.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { Edit2, Trash2, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/ui/Pagination';

const BomListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── QUERY: GET BOMS ────────────────────────────────────────────────────────
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['boms', page, includeInactive, searchQuery],
    queryFn: () => getBoms({
      page,
      limit: 10,
      includeInactive,
      search: searchQuery,
    }),
  });

  const boms = responseData?.data || [];
  const pagination = responseData?.pagination;

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

  const [bomToDeactivate, setBomToDeactivate] = useState(null);

  const handleDelete = (id, productName) => {
    setBomToDeactivate({ id, productName });
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage);
    setSearchParams(params);
  };

  const handleIncludeInactiveChange = (checked) => {
    const params = new URLSearchParams(window.location.search);
    params.set('includeInactive', checked);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    setSearchParams(params);
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
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} />
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
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Content Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Search & Toggle Option */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Input Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search by product SKU or name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF540E';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,84,14,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              id="toggle-inactive-boms"
              checked={includeInactive}
              onChange={(e) => handleIncludeInactiveChange(e.target.checked)}
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
          <Loader padding="120px 0" size={36} />
        ) : boms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <ClipboardList size={32} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
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
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/bom/edit/${bom.id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(37, 99, 235, 0.06)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                              color: '#2563EB',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.12)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Edit BoM"
                          >
                            <Edit2 size={14} strokeWidth={2.5} />
                          </button>
                          {bom.isActive && (
                            <button
                              onClick={() => handleDelete(bom.id, bom.product?.name)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(220, 38, 38, 0.06)',
                                border: '1px solid rgba(220, 38, 38, 0.2)',
                                color: '#DC2626',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                              title="Deactivate BoM"
                            >
                              <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>

      {/* ─── DEACTIVATE CONFIRMATION MODAL ────────────────────────────────────── */}
      {bomToDeactivate && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => e.target === e.currentTarget && setBomToDeactivate(null)}
        >
          <div 
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '28px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              fontFamily: 'var(--font-family)',
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Deactivate Bill of Materials
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Are you sure you want to deactivate the Bill of Materials for <strong>{bomToDeactivate.productName}</strong>? 
              This will disable it for future Manufacturing Orders.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button
                id="btn-confirm-deactivate"
                variant="danger"
                onClick={() => {
                  deleteMutation.mutate(bomToDeactivate.id, {
                    onSuccess: () => {
                      setBomToDeactivate(null);
                    }
                  });
                }}
                loading={deleteMutation.isPending}
              >
                Yes, Deactivate
              </Button>
              <Button
                id="btn-cancel-deactivate"
                variant="secondary"
                onClick={() => setBomToDeactivate(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BomListPage;
