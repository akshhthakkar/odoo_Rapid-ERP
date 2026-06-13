import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSalesOrders } from '../../api/sales.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { LayoutList, FileText, CheckCircle2, Truck, XCircle } from 'lucide-react';

const SalesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [statusFilter, setStatusFilter] = useState('all');

  // ─── QUERY: GET SALES ORDERS ──────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: getSalesOrders
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

  // ─── ACCESS CONTROL ────────────────────────────────────────────────────────
  const canCreateSales = ['ADMIN', 'SALES_USER'].includes(userRole);

  // ─── FILTERED ORDERS ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft', class: 'badge-muted' },
      CONFIRMED: { label: 'Confirmed', class: 'badge-accent', style: { border: '1px solid rgba(255, 84, 14, 0.25)' } },
      PARTIALLY_DELIVERED: { label: 'Partially Delivered', class: 'badge-warning' },
      FULLY_DELIVERED: { label: 'Fully Delivered', class: 'badge-success' },
      CANCELLED: { label: 'Cancelled', class: 'badge-danger', style: { opacity: 0.6 } }
    };

    const cfg = statusMap[status] || { label: status, class: 'badge-muted' };

    return (
      <span className={`badge ${cfg.class}`} style={cfg.style || {}}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Sales Orders</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage customer order demands, check stock allocations, and dispatch shipments.</p>
        </div>
        {canCreateSales && (
          <Button
            id="btn-create-sales-order"
            onClick={() => navigate('/sales/new')}
            style={{ background: '#FF540E' }}
          >
            + Create Sales Order
          </Button>
        )}
      </div>

      {/* Main List Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* ── Filter Chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '2px' }}>Status</span>

          <button style={chipStyle(statusFilter === 'all', '#6B7280')} onClick={() => setStatusFilter('all')}>
            <LayoutList size={13} strokeWidth={2.5} />
            All
          </button>
          <button style={chipStyle(statusFilter === 'DRAFT', '#94A3B8')} onClick={() => setStatusFilter('DRAFT')}>
            <FileText size={13} strokeWidth={2.5} />
            Draft
          </button>
          <button style={chipStyle(statusFilter === 'CONFIRMED', '#3B82F6')} onClick={() => setStatusFilter('CONFIRMED')}>
            <CheckCircle2 size={13} strokeWidth={2.5} />
            Confirmed
          </button>
          <button style={chipStyle(statusFilter === 'PARTIALLY_DELIVERED', '#F59E0B')} onClick={() => setStatusFilter('PARTIALLY_DELIVERED')}>
            <Truck size={13} strokeWidth={2.5} style={{ transform: 'scaleX(-1)' }} />
            Partially Delivered
          </button>
          <button style={chipStyle(statusFilter === 'FULLY_DELIVERED', '#10B981')} onClick={() => setStatusFilter('FULLY_DELIVERED')}>
            <CheckCircle2 size={13} strokeWidth={2.5} />
            Fully Delivered
          </button>
          <button style={chipStyle(statusFilter === 'CANCELLED', '#EF4444')} onClick={() => setStatusFilter('CANCELLED')}>
            <XCircle size={13} strokeWidth={2.5} />
            Cancelled
          </button>

          {/* Clear filters */}
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              style={{ marginLeft: 'auto', fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '9999px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading Sales Orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '28px' }}>📈</span>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>No sales orders found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th style={{ textAlign: 'right' }}>Total Quantity</th>
                  <th style={{ textAlign: 'right' }}>Delivered</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                      No sales orders match the selected filters.
                    </td>
                  </tr>
                ) : filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: '#FF8A58' }}>{o.orderRef}</td>
                    <td>{o.customerName}</td>
                    <td>{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td>{o.requestedDeliveryDate ? new Date(o.requestedDeliveryDate).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{o.totalQty}</td>
                    <td style={{ textAlign: 'right' }}>{o.totalDelivered}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${o.totalAmount.toFixed(2)}</td>
                    <td>{getStatusBadge(o.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/sales/${o.id}`)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 0 && (
              <div style={{ paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filteredOrders.length} of {orders.length} sales order{orders.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesListPage;
