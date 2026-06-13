import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, deleteProduct } from '../../api/products.api';
import { getCustomers } from '../../api/customers.api';
import { getVendors } from '../../api/vendors.api';
import { getWorkCenters } from '../../api/workcenters.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { SquarePen, Trash2, CheckCircle2, Archive, Zap, Package, LayoutList } from 'lucide-react';

const ProductListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'products';
  });
  const [deleteError, setDeleteError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');   // 'all' | 'active' | 'archived'
  const [sourceFilter, setSourceFilter] = useState('all');   // 'all' | 'mto' | 'mts'

  // ─── QUERY CALLS ────────────────────────────────────────────────────────────
  const { data: products = [], isLoading: isLoadingProd } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: activeTab === 'products',
  });

  const { data: customers = [], isLoading: isLoadingCust } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: activeTab === 'customers',
  });

  const { data: vendors = [], isLoading: isLoadingVend } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
    enabled: activeTab === 'vendors',
  });

  const { data: workcenters = [], isLoading: isLoadingWc } = useQuery({
    queryKey: ['workcenters'],
    queryFn: getWorkCenters,
    enabled: activeTab === 'workcenters',
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const deleteProdMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.message || 'Failed to delete product.');
    },
  });

  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      deleteProdMutation.mutate(id);
    }
  };

  // ─── ROLE GUARDS ───
  const canManageProducts = ['ADMIN', 'BUSINESS_OWNER'].includes(userRole);
  const canDeleteProduct = userRole === 'ADMIN';
  const canManageCustomers = ['ADMIN', 'SALES_USER'].includes(userRole);
  const canManageVendors = ['ADMIN', 'PURCHASE_USER'].includes(userRole);
  const canManageWc = userRole === 'ADMIN';

  // Stock Badge Class helper
  const getStockBadgeClass = (qty) => {
    if (qty < 10) return 'badge-danger';
    if (qty <= 50) return 'badge-warning';
    return 'badge-success';
  };

  // ─── FILTERED PRODUCTS ──────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const isActive = p.isActive !== false;
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'archived' && isActive) return false;
    const isMTO = p.procureOnDemand === true;
    if (sourceFilter === 'mto' && !isMTO) return false;
    if (sourceFilter === 'mts' && isMTO) return false;
    return true;
  });

  // ─── CHIP STYLE HELPER ──────────────────────────────────────────────────────
  const chipStyle = (active, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '9999px',
    border: active ? `1.5px solid ${color}` : '1.5px solid rgba(0,0,0,0.08)',
    background: active ? `${color}18` : 'rgba(0,0,0,0.03)',
    color: active ? color : 'var(--text-secondary)',
    fontSize: '12.5px',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  });

  const dotStyle = (color) => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  });

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)' }}>
      {/* Tab Menu Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
        gap: '28px',
        overflowX: 'auto',
      }}>
        {[
          { id: 'products', label: 'Products', count: products.length, visible: true },
          { id: 'customers', label: 'Customers', count: customers.length, visible: true },
          { id: 'vendors', label: 'Vendors', count: vendors.length, visible: true },
          { id: 'workcenters', label: 'Work Centers', count: workcenters.length, visible: true },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setDeleteError('');
              const url = new URL(window.location);
              url.searchParams.set('tab', tab.id);
              window.history.pushState({}, '', url);
            }}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #FF540E' : '2px solid transparent',
              color: activeTab === tab.id ? '#FF540E' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Delete product error banner */}
      {deleteError && (
        <div style={{
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
          <span>{deleteError}</span>
        </div>
      )}

      {/* ─── TAB 1: PRODUCTS ────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Product Catalog</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage item specifications, prices, and stock counts.</p>
            </div>
            {canManageProducts && (
              <Button
                id="btn-create-product"
                onClick={() => navigate('/products/new')}
                style={{ background: '#FF540E' }}
              >
                + Add Product
              </Button>
            )}
          </div>

          {/* ── Filter Chips ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>

            {/* Status chips */}
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '2px' }}>Status</span>

            <button style={chipStyle(statusFilter === 'all', '#6B7280')} onClick={() => setStatusFilter('all')}>
              <LayoutList size={13} strokeWidth={2.5} />
              All
            </button>
            <button style={chipStyle(statusFilter === 'active', '#10B981')} onClick={() => setStatusFilter('active')}>
              <CheckCircle2 size={13} strokeWidth={2.5} />
              Active
            </button>
            <button style={chipStyle(statusFilter === 'archived', '#EF4444')} onClick={() => setStatusFilter('archived')}>
              <Archive size={13} strokeWidth={2.5} />
              Archived
            </button>

            {/* Separator */}
            <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

            {/* Source chips */}
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '2px' }}>Source</span>

            <button style={chipStyle(sourceFilter === 'all', '#6B7280')} onClick={() => setSourceFilter('all')}>
              <LayoutList size={13} strokeWidth={2.5} />
              All
            </button>
            <button style={chipStyle(sourceFilter === 'mto', '#3B82F6')} onClick={() => setSourceFilter('mto')}>
              <Zap size={13} strokeWidth={2.5} />
              Make to Order
            </button>
            <button style={chipStyle(sourceFilter === 'mts', '#8B5CF6')} onClick={() => setSourceFilter('mts')}>
              <Package size={13} strokeWidth={2.5} />
              Make to Stock
            </button>

            {/* Clear filters */}
            {(statusFilter !== 'all' || sourceFilter !== 'all') && (
              <button
                onClick={() => { setStatusFilter('all'); setSourceFilter('all'); }}
                style={{ marginLeft: 'auto', fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '9999px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {isLoadingProd ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '28px' }}>📦</span>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>No products found. Click "Add Product" to create one.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Sales Price</th>
                    <th>Cost Price</th>
                    <th>On Hand</th>
                    <th>Reserved</th>
                    <th>Free to Use</th>
                    <th>Source</th>
                    <th>Status</th>
                    {(canManageProducts || canDeleteProduct) && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                        No products match the selected filters.
                      </td>
                    </tr>
                  ) : filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#FF540E' }}>{p.sku}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.description}</div>}
                      </td>
                      <td>${p.salesPrice.toFixed(2)}</td>
                      <td>${p.costPrice.toFixed(2)}</td>
                      <td>{p.onHandQty}</td>
                      <td>{p.reservedQty}</td>
                      <td>
                        <span className={`badge ${getStockBadgeClass(p.freeToUseQty)}`}>
                          {p.freeToUseQty}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ fontSize: '10px' }}>
                          {p.procurementType} {p.procureOnDemand ? '(MTO)' : '(MTS)'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.isActive !== false ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                          {p.isActive !== false ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      {(canManageProducts || canDeleteProduct) && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {canManageProducts && (
                              <button
                                onClick={() => navigate(`/products/edit/${p.id}`)}
                                title="Edit product"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  background: 'rgba(59,130,246,0.08)',
                                  color: '#3B82F6',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(59,130,246,0.18)';
                                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(59,130,246,0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <SquarePen size={14} strokeWidth={2} />
                              </button>
                            )}
                            {canDeleteProduct && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Delete product"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <Trash2 size={14} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length > 0 && (
                <div style={{ paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CUSTOMERS ───────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Customer Directory</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered commercial partners and customers.</p>
            </div>
            {canManageCustomers && (
              <Button
                id="btn-create-customer"
                onClick={() => navigate('/customers/new')}
                style={{ background: '#FF540E' }}
              >
                + Add Customer
              </Button>
            )}
          </div>

          {isLoadingCust ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading customers...</div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '28px' }}>👤</span>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>No customers configured yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{c.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: VENDORS ─────────────────────────────────────────────────── */}
      {activeTab === 'vendors' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Vendor Directory</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supplier and raw material partner records.</p>
            </div>
            {canManageVendors && (
              <Button
                id="btn-create-vendor"
                onClick={() => navigate('/vendors/new')}
                style={{ background: '#FF540E' }}
              >
                + Add Vendor
              </Button>
            )}
          </div>

          {isLoadingVend ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '28px' }}>🏢</span>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>No suppliers configured yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</td>
                      <td>{v.email || '—'}</td>
                      <td>{v.phone || '—'}</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{v.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: WORK CENTERS ────────────────────────────────────────────── */}
      {activeTab === 'workcenters' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Work Centers</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manufacturing production floors and assembly lines.</p>
            </div>
            {canManageWc && (
              <Button
                id="btn-create-wc"
                onClick={() => navigate('/workcenters/new')}
                style={{ background: '#FF540E' }}
              >
                + Add Work Center
              </Button>
            )}
          </div>

          {isLoadingWc ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading work centers...</div>
          ) : workcenters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '28px' }}>⚙️</span>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>No work centers configured yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {workcenters.map((w) => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{w.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
