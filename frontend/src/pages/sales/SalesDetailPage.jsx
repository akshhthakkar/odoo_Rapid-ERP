import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesOrderById, confirmSalesOrder, deliverSalesOrder, cancelSalesOrder } from '../../api/sales.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { Calendar, AlertTriangle, CheckCircle2, Package, Ban, Link, ArrowDownToLine, Settings } from 'lucide-react';
import Loader from '../../components/ui/Loader';

const SalesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryQuantities, setDeliveryQuantities] = useState({}); // lineId -> qty
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [triggeredProcurements, setTriggeredProcurements] = useState([]);

  // ─── QUERY: GET SALES ORDER DETAILS ─────────────────────────────────────────
  const { data: order, isLoading } = useQuery({
    queryKey: ['salesOrder', id],
    queryFn: () => getSalesOrderById(id)
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () => confirmSalesOrder(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrder', id] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setSuccessMessage('Sales Order confirmed successfully.');
      setErrorMessage('');
      if (res.triggeredProcurements && res.triggeredProcurements.length > 0) {
        setTriggeredProcurements(res.triggeredProcurements);
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to confirm Sales Order.');
      setSuccessMessage('');
    }
  });

  const deliverMutation = useMutation({
    mutationFn: (payload) => deliverSalesOrder(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrder', id] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setSuccessMessage('Delivery recorded successfully.');
      setErrorMessage('');
      setShowDeliveryModal(false);
      setDeliveryQuantities({});
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to record delivery.');
      setSuccessMessage('');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSalesOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrder', id] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setSuccessMessage('Sales Order cancelled successfully.');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel Sales Order.');
      setSuccessMessage('');
    }
  });

  // ─── ACCESS CONTROL ────────────────────────────────────────────────────────
  const canManageSales = ['ADMIN', 'SALES_USER'].includes(userRole);

  // ─── EVENT HANDLERS ─────────────────────────────────────────────────────────
  const handleConfirm = () => {
    setTriggeredProcurements([]);
    if (window.confirm('Are you sure you want to confirm this Sales Order? This will reserve available inventory and trigger MTO replenishments for shortages.')) {
      confirmMutation.mutate();
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this Sales Order? This will release all currently reserved stock.')) {
      cancelMutation.mutate();
    }
  };

  const handleOpenDeliveryModal = () => {
    if (!order) return;
    const initialQtys = {};
    order.lines.forEach(l => {
      if (l.remainingQty > 0) {
        initialQtys[l.id] = l.remainingQty.toString();
      }
    });
    setDeliveryQuantities(initialQtys);
    setErrorMessage('');
    setShowDeliveryModal(true);
  };

  const handleDeliveryQtyChange = (lineId, val) => {
    setDeliveryQuantities(prev => ({
      ...prev,
      [lineId]: val
    }));
  };

  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const payload = [];
    const keys = Object.keys(deliveryQuantities);

    for (const lineIdKey of keys) {
      const lineId = Number(lineIdKey);
      const qtyStr = deliveryQuantities[lineIdKey];
      const qty = Number(qtyStr);

      if (!qtyStr || isNaN(qty) || qty <= 0) {
        // Skip zero or empty items if they just want to deliver some, but validate format if filled
        if (qtyStr === '0' || qtyStr === '') continue;
        setErrorMessage('Delivery quantities must be positive numbers.');
        return;
      }

      const line = order.lines.find(l => l.id === lineId);
      if (qty > line.remainingQty) {
        setErrorMessage(`Over-delivery blocked: Cannot deliver more than remaining quantity (${line.remainingQty}) for product ${line.sku}.`);
        return;
      }

      payload.push({ lineId, qty });
    }

    if (payload.length === 0) {
      setErrorMessage('Please enter at least one item quantity to deliver.');
      return;
    }

    deliverMutation.mutate(payload);
  };

  if (isLoading) {
    return <Loader padding="120px 0" size={36} />;
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Sales Order not found.
      </div>
    );
  }

  // Determine active steps for the timeline visualization
  const getTimelineStatusStep = (status) => {
    const states = ['DRAFT', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED'];
    if (status === 'CANCELLED') return -1;
    return states.indexOf(status);
  };

  const currentStep = getTimelineStatusStep(order.status);

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)' }}>
      {/* Detail Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Sales Order Details</h2>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>({order.orderRef})</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Quote Date: {new Date(order.orderDate).toLocaleString()}</span>
            {order.requestedDeliveryDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                <Calendar size={14} /> Requested Delivery: <strong>{new Date(order.requestedDeliveryDate).toLocaleDateString()}</strong>
              </span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        {canManageSales && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {order.status === 'DRAFT' && (
              <Button
                id="btn-confirm-so"
                onClick={handleConfirm}
                style={{ background: '#FF540E' }}
                loading={confirmMutation.isPending}
              >
                Confirm Order
              </Button>
            )}

            {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED') && (
              <Button
                id="btn-record-delivery"
                onClick={handleOpenDeliveryModal}
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)' }}
              >
                Record Delivery
              </Button>
            )}

            {order.status !== 'CANCELLED' && order.status !== 'FULLY_DELIVERED' && (
              <Button
                id="btn-cancel-so"
                onClick={handleCancel}
                variant="secondary"
                style={{ color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                loading={cancelMutation.isPending}
              >
                Cancel Order
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/sales')}
            >
              Back to List
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
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
          gap: '8px'
        }}>
          <AlertTriangle size={16} />
          {errorMessage}
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
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}

      {/* MTO Triggers Alert Box */}
      {(triggeredProcurements.length > 0 || order.replenishments?.length > 0) && (
        <div style={{
          background: 'rgba(255, 84, 14, 0.08)',
          border: '1px solid rgba(255, 84, 14, 0.25)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px',
          fontSize: '13.5px'
        }}>
          <h4 style={{ fontWeight: 700, color: '#FF8A58', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} /> MTO Replenishment Actions Triggered
          </h4>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(triggeredProcurements.length > 0 ? triggeredProcurements : order.replenishments).map((rep, idx) => {
              const shortage = rep.qty;
              const action = rep.type === 'PO' ? 'Purchase Order Created' : 'Manufacturing Order Created';
              const ref = rep.ref || rep.description.match(/[A-Z]+-\d+/)?.[0] || 'Pending';
              const prodName = rep.name || (rep.metadata && (rep.metadata.productSku || rep.metadata.productId)) || 'Product';

              return (
                <li key={idx} style={{
                  color: 'var(--text-primary)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 2fr 1fr',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Product SKU</span>
                    <strong style={{ color: '#FF8A58' }}>{prodName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Procurement Action</span>
                    <strong>{action} (Shortage: {shortage})</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Reference</span>
                    <strong>{ref}</strong>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Status Timeline */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        {order.status === 'CANCELLED' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700 }}>
            <Ban size={16} /> THIS SALES ORDER HAS BEEN CANCELLED
          </div>
        ) : (() => {
          const hasProcurement = order.replenishments?.length > 0 || order.purchaseOrders?.length > 0 || order.manufacturingOrders?.length > 0;
          
          const getTimelineSteps = (hasProc) => {
            if (hasProc) {
              return [
                { label: 'Draft', index: 0 },
                { label: 'Confirmed', index: 1 },
                { label: 'Procurement Triggered', index: 2 },
                { label: 'Partially Dispatched', index: 3 },
                { label: 'Fully Dispatched', index: 4 }
              ];
            } else {
              return [
                { label: 'Draft', index: 0 },
                { label: 'Confirmed', index: 1 },
                { label: 'Partially Dispatched', index: 3 },
                { label: 'Fully Dispatched', index: 4 }
              ];
            }
          };

          const currentStepIndex = (() => {
            if (order.status === 'DRAFT') return 0;
            if (order.status === 'CONFIRMED') {
              return hasProcurement ? 2 : 1;
            }
            if (order.status === 'PARTIALLY_DELIVERED') return 3;
            if (order.status === 'FULLY_DELIVERED') return 4;
            return 0;
          })();

          const steps = getTimelineSteps(hasProcurement);
          const maxStepVal = steps[steps.length - 1].index;

          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflowX: 'auto', padding: '10px 0' }}>
              {/* Timeline Line */}
              <div style={{
                position: 'absolute',
                top: '28px',
                left: '5%',
                right: '5%',
                height: '3px',
                background: 'var(--border)',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                top: '28px',
                left: '5%',
                width: `${(currentStepIndex / maxStepVal) * 90}%`,
                height: '3px',
                background: '#FF540E',
                zIndex: 2,
                transition: 'width 0.4s ease'
              }} />

              {/* Steps */}
              {steps.map((step, idx) => {
                const isPassed = step.index <= currentStepIndex;
                const isActive = step.index === currentStepIndex;

                return (
                  <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, flex: 1, minWidth: 120 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isPassed ? '#FF540E' : 'var(--bg-secondary)',
                      border: `3px solid ${isActive ? '#FFFFFF' : 'var(--border)'}`,
                      boxShadow: isActive ? '0 0 0 3px #FF540E' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: isPassed ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.3s'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      fontWeight: isPassed ? 600 : 400,
                      color: isPassed ? 'var(--text-primary)' : 'var(--text-muted)',
                      textAlign: 'center'
                    }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Main Info Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
        {/* Customer & Quote details */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Customer Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
            <div><strong style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Name:</strong> {order.customerName}</div>
            <div><strong style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Email:</strong> {order.customerEmail || '—'}</div>
            <div><strong style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Phone:</strong> {order.customerPhone || '—'}</div>
            <div><strong style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Delivery Address:</strong> {order.customerAddress || '—'}</div>
          </div>
        </div>

        {/* Internal notes */}
        <div className="glass-card" style={{ padding: '24px', height: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Notes / Terms</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
            {order.notes || 'No internal notes specified.'}
          </p>
        </div>
      </div>

      {/* Linked Documents Section */}
      {(order.purchaseOrders?.length > 0 || order.manufacturingOrders?.length > 0) && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link size={16} style={{ color: 'var(--text-primary)' }} /> Linked Procurement Documents
          </h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {order.purchaseOrders?.map(po => (
              <div key={po.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ArrowDownToLine size={16} style={{ color: 'var(--success)' }} />
                <span><strong>{po.orderRef}</strong> (Purchase - <span style={{ color: 'var(--text-muted)' }}>{po.status}</span>)</span>
              </div>
            ))}
            {order.manufacturingOrders?.map(mo => (
              <div key={mo.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Settings size={16} style={{ color: '#FF8A58' }} />
                <span><strong>{mo.moRef}</strong> (Manufacture - <span style={{ color: 'var(--text-muted)' }}>{mo.status}</span>)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Lines table */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Products Ordered</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Source</th>
                <th>Stock Status</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Delivered</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th>Replenishment</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => {
                const freeQty = Number(line.freeToUseQty || 0);
                const qty = Number(line.qty);
                
                let stockBadge = { label: 'Out of Stock', color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)' };
                if (freeQty >= qty) {
                  stockBadge = { label: 'In Stock', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' };
                } else if (freeQty > 0) {
                  stockBadge = { label: 'Partial Stock', color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)' };
                }

                return (
                  <tr key={line.id}>
                    <td style={{ fontWeight: 600, color: '#FF8A58' }}>{line.sku}</td>
                    <td>{line.name}</td>
                    <td>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 700,
                        background: line.procureOnDemand ? 'rgba(255, 84, 14, 0.1)' : 'rgba(16,185,129,0.1)',
                        color: line.procureOnDemand ? '#FF8A58' : 'var(--success)'
                      }}>
                        {line.procureOnDemand ? 'MTO' : 'MTS'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: stockBadge.bg,
                        color: stockBadge.color
                      }}>
                        {stockBadge.label} ({freeQty} Avail)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{line.qty}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={line.shortageQty > 0 && order.status === 'CONFIRMED' ? 'badge badge-warning' : ''} style={{ fontSize: '13px' }}>
                        {line.reservedQty}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{line.deliveredQty}</td>
                    <td style={{ textAlign: 'right', fontWeight: line.remainingQty > 0 ? 600 : 400 }}>{line.remainingQty}</td>
                    <td>
                      {line.shortageQty > 0 ? (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: line.replenishmentStatus === 'TRIGGERED' ? 'rgba(255,84,14,0.1)' : 'rgba(255,255,255,0.05)',
                          color: line.replenishmentStatus === 'TRIGGERED' ? '#FF8A58' : 'var(--text-muted)'
                        }}>
                          {line.replenishmentStatus.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>${line.unitPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${line.totalPrice.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', marginTop: '20px', paddingRight: '20px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Order Total:</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#FF8A58' }}>${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>


      {/* Timeline Section */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>Sales Order Audit Trail</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border)' }}>
          {order.timeline?.map((log, idx) => (
            <div key={log.id} style={{ position: 'relative' }}>
              {/* Bullet Node */}
              <div style={{
                position: 'absolute',
                left: '-27px',
                top: '4px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#FF540E',
                border: '2px solid var(--bg-primary)'
              }} />

              <div>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginRight: '10px' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <span className="badge badge-muted" style={{ marginRight: '10px', fontSize: '10px', fontWeight: 700 }}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                {log.user && (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginRight: '10px' }}>
                    by {log.user.name} ({log.user.role.replace(/_/g, ' ').toLowerCase()})
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                {log.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RECORD DELIVERY MODAL ────────────────────────────────────────── */}
      {showDeliveryModal && (
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
        onClick={() => setShowDeliveryModal(false)}
        >
          <div className="glass-card animate-fade-in" style={{
            width: '600px',
            padding: '28px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Record Goods Delivery
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enter product quantities shipped to the customer. Stocks will be decremented physically.
              </p>
            </div>

            <form onSubmit={handleDeliverySubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {order.lines.filter(l => l.remainingQty > 0).map((line) => (
                  <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.sku}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Ordered: {line.qty} | Delivered: {line.deliveredQty}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      OnHand: <strong style={{ color: line.freeToUseQty <= 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {line.freeToUseQty + line.reservedQty}
                      </strong>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Qty to Deliver"
                        value={deliveryQuantities[line.id] || ''}
                        onChange={(e) => handleDeliveryQtyChange(line.id, e.target.value)}
                        className="erp-input"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Button
                  id="btn-modal-delivery-submit"
                  type="submit"
                  style={{ flex: 1, background: '#FF540E' }}
                  loading={deliverMutation.isPending}
                >
                  Validate Delivery
                </Button>
                <Button
                  id="btn-modal-delivery-cancel"
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeliveryModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDetailPage;
