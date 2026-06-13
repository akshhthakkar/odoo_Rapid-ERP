import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, deleteProduct } from '../../api/products.api';
import { getCustomers, createCustomer } from '../../api/customers.api';
import { getVendors, createVendor } from '../../api/vendors.api';
import { getWorkCenters, createWorkCenter } from '../../api/workcenters.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ProductListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;

  const [activeTab, setActiveTab] = useState('products');
  const [showModal, setShowModal] = useState(null); // 'customer' | 'vendor' | 'workcenter' | null
  const [modalForm, setModalForm] = useState({ name: '', email: '', phone: '', address: '', description: '' });
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setModalSuccess(`Customer "${data.customer.name}" created successfully.`);
      setModalForm({ name: '', email: '', phone: '', address: '', description: '' });
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to create customer.');
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setModalSuccess(`Vendor "${data.vendor.name}" created successfully.`);
      setModalForm({ name: '', email: '', phone: '', address: '', description: '' });
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to create vendor.');
    },
  });

  const createWcMutation = useMutation({
    mutationFn: createWorkCenter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workcenters'] });
      setModalSuccess(`Work Center "${data.workCenter.name}" created successfully.`);
      setModalForm({ name: '', email: '', phone: '', address: '', description: '' });
    },
    onError: (err) => {
      setModalError(err.response?.data?.message || 'Failed to create work center.');
    },
  });

  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      deleteProdMutation.mutate(id);
    }
  };

  const handleOpenModal = (type) => {
    setShowModal(type);
    setModalForm({ name: '', email: '', phone: '', address: '', description: '' });
    setModalError('');
    setModalSuccess('');
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!modalForm.name.trim()) {
      setModalError('Name is required.');
      return;
    }

    if (showModal === 'customer') {
      createCustomerMutation.mutate({
        name: modalForm.name,
        email: modalForm.email || undefined,
        phone: modalForm.phone || undefined,
        address: modalForm.address || undefined
      });
    } else if (showModal === 'vendor') {
      createVendorMutation.mutate({
        name: modalForm.name,
        email: modalForm.email || undefined,
        phone: modalForm.phone || undefined,
        address: modalForm.address || undefined
      });
    } else if (showModal === 'workcenter') {
      createWcMutation.mutate({
        name: modalForm.name,
        description: modalForm.description || undefined
      });
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
            }}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #FF540E' : '2px solid transparent',
              color: activeTab === tab.id ? '#FF8A58' : 'var(--text-secondary)',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#FF8A58' }}>{p.sku}</td>
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
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {canManageProducts && (
                              <button
                                onClick={() => navigate(`/products/edit/${p.id}`)}
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
                            )}
                            {canDeleteProduct && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
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
                                Delete
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
                onClick={() => handleOpenModal('customer')}
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
                onClick={() => handleOpenModal('vendor')}
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
                onClick={() => handleOpenModal('workcenter')}
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

      {/* ─── CREATION MODALS (Customer, Vendor, Work Center) ───────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowModal(null)}
        >
          <div className="glass-card animate-fade-in" style={{
            width: '480px',
            padding: '28px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Create New {showModal.charAt(0).toUpperCase() + showModal.slice(1)}
              </h3>
            </div>

            {modalError && (
              <div className="animate-shake" style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                color: 'var(--danger)',
                fontSize: '12.5px'
              }}>
                ⚠️ {modalError}
              </div>
            )}

            {modalSuccess && (
              <div style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                color: 'var(--success)',
                fontSize: '12.5px'
              }}>
                ✅ {modalSuccess}
              </div>
            )}

            <form onSubmit={handleModalSubmit}>
              <Input
                id="modal-name"
                label="Name"
                type="text"
                placeholder={showModal === 'workcenter' ? 'Assembly Line 1' : 'Acme Corporation'}
                value={modalForm.name}
                onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />

              {showModal !== 'workcenter' ? (
                <>
                  <Input
                    id="modal-email"
                    label="Email Address"
                    type="email"
                    placeholder="contact@company.com"
                    value={modalForm.email}
                    onChange={(e) => setModalForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    id="modal-phone"
                    label="Phone"
                    type="text"
                    placeholder="+1 (555) 019-2834"
                    value={modalForm.phone}
                    onChange={(e) => setModalForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    id="modal-address"
                    label="Address"
                    type="text"
                    placeholder="123 Industrial Rd, Austin TX"
                    value={modalForm.address}
                    onChange={(e) => setModalForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    id="modal-description"
                    className="erp-input"
                    placeholder="Primary work center for assembling component components."
                    rows="3"
                    value={modalForm.description}
                    onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{ resize: 'none' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Button
                  id="btn-modal-submit"
                  type="submit"
                  style={{ flex: 1, background: '#FF540E' }}
                  loading={createCustomerMutation.isPending || createVendorMutation.isPending || createWcMutation.isPending}
                >
                  Create
                </Button>
                <Button
                  id="btn-modal-cancel"
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(null)}
                >
                  Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
