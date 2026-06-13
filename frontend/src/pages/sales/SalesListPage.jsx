import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSalesOrders } from '../../api/sales.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';

const SalesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role;

  // ─── QUERY: GET SALES ORDERS ──────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: getSalesOrders
  });

  // ─── ACCESS CONTROL ────────────────────────────────────────────────────────
  const canCreateSales = ['ADMIN', 'SALES_USER'].includes(userRole);

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
                {orders.map((o) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesListPage;
