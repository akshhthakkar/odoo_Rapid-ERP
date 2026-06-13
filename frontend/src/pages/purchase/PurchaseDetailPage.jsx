import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrder,
  confirmPurchaseOrder,
  receiveGoods,
  cancelPurchaseOrder,
} from '../../api/purchase.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT:              { label: 'Draft',              bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
  SENT:               { label: 'Confirmed',          bg: 'rgba(255,84,14,0.08)',   color: '#FF8A58', border: 'rgba(255,84,14,0.25)' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', bg: 'rgba(251,146,60,0.12)', color: '#FB923C', border: 'rgba(251,146,60,0.3)' },
  RECEIVED:           { label: 'Fully Received',     bg: 'rgba(34,197,94,0.12)',  color: '#4ADE80', border: 'rgba(34,197,94,0.3)' },
  CANCELLED:          { label: 'Cancelled',          bg: 'rgba(239,68,68,0.1)',   color: '#F87171', border: 'rgba(239,68,68,0.2)' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' };
  return (
    <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.03em' }}>
      {cfg.label}
    </span>
  );
};

// ─── RECEIPT PROGRESS BAR ─────────────────────────────────────────────────────
const ProgressBar = ({ progress }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#4ADE80' : '#FB923C', borderRadius: '99px', transition: 'width 0.4s ease' }} />
    </div>
    <span style={{ fontSize: '11px', fontWeight: 600, color: progress === 100 ? '#4ADE80' : '#FB923C', minWidth: '32px' }}>
      {progress}%
    </span>
  </div>
);

// ─── AUDIT TIMELINE ───────────────────────────────────────────────────────────
const AUDIT_ICONS = {
  PURCHASE_ORDER_CREATED:  { icon: '📄', color: '#818CF8' },
  PURCHASE_ORDER_SENT:     { icon: '✅', color: '#60A5FA' },
  PURCHASE_RECEIPT_CREATED:{ icon: '📥', color: '#FB923C' },
  PURCHASE_ORDER_RECEIVED: { icon: '🎉', color: '#4ADE80' },
  PURCHASE_ORDER_CANCELLED:{ icon: '❌', color: '#F87171' },
};

const AuditTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;
  return (
    <div>
      {timeline.map((entry, idx) => {
        const cfg = AUDIT_ICONS[entry.action] || { icon: '📋', color: '#94A3B8' };
        return (
          <div key={entry.id} style={{ display: 'flex', gap: '12px', marginBottom: idx < timeline.length - 1 ? '12px' : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                {cfg.icon}
              </div>
              {idx < timeline.length - 1 && (
                <div style={{ width: '1px', flex: 1, background: 'var(--border)', marginTop: '4px', marginBottom: '4px' }} />
              )}
            </div>
            <div style={{ paddingTop: '4px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{entry.description}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {entry.user?.name} · {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── RECEIVE GOODS MODAL ──────────────────────────────────────────────────────
const ReceiveModal = ({ po, onClose, onSubmit, isLoading }) => {
  const [receiptLines, setReceiptLines] = useState(
    (po.lines || [])
      .filter((l) => l.remainingQty > 0)
      .map((l) => ({ lineId: l.id, productName: l.name, sku: l.sku, remaining: l.remainingQty, receivedQty: '' }))
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleQtyChange = (idx, val) => {
    setReceiptLines((prev) => prev.map((r, i) => i === idx ? { ...r, receivedQty: val } : r));
  };

  const handleSubmit = () => {
    const filtered = receiptLines.filter((r) => Number(r.receivedQty) > 0);
    if (filtered.length === 0) { setError('Enter at least one received quantity.'); return; }
    for (const r of filtered) {
      if (Number(r.receivedQty) > r.remaining) {
        setError(`Cannot receive ${r.receivedQty} for "${r.productName}" — only ${r.remaining} remaining.`);
        return;
      }
    }
    onSubmit({ receipts: filtered.map((r) => ({ lineId: r.lineId, receivedQty: Number(r.receivedQty) })), notes });
  };

  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
  const modalStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' };
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', width: '90px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            📥 Receive Goods — {po.orderRef}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#F87171', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>PRODUCT</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>REMAINING</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>RECEIVE NOW</th>
            </tr>
          </thead>
          <tbody>
            {receiptLines.map((r, idx) => (
              <tr key={r.lineId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 4px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.productName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.sku}</div>
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#FB923C', fontWeight: 600 }}>{r.remaining}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    max={r.remaining}
                    step="0.001"
                    placeholder="0"
                    value={r.receivedQty}
                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery reference, condition notes…"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px' }}>
            Cancel
          </button>
          <Button onClick={handleSubmit} disabled={isLoading} style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            {isLoading ? 'Processing…' : 'Confirm Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const PurchaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => getPurchaseOrder(Number(id)),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['purchaseOrder', id] });
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  };

  const confirmMutation = useMutation({
    mutationFn: () => confirmPurchaseOrder(Number(id)),
    onSuccess: () => { invalidate(); setActionSuccess('Purchase Order confirmed.'); setActionError(''); },
    onError: (err) => { setActionError(err.response?.data?.message || 'Failed to confirm.'); },
  });

  const receiveMutation = useMutation({
    mutationFn: (payload) => receiveGoods(Number(id), payload),
    onSuccess: () => { invalidate(); setShowReceiveModal(false); setActionSuccess('Goods received successfully.'); setActionError(''); },
    onError: (err) => { setActionError(err.response?.data?.message || 'Failed to receive goods.'); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchaseOrder(Number(id)),
    onSuccess: () => { invalidate(); setActionSuccess('Purchase Order cancelled.'); setActionError(''); },
    onError: (err) => { setActionError(err.response?.data?.message || 'Failed to cancel.'); },
  });

  const canConfirm = ['ADMIN', 'PURCHASE_USER'].includes(userRole);
  const canReceive = ['ADMIN', 'PURCHASE_USER', 'INVENTORY_MANAGER'].includes(userRole);
  const canCancel  = ['ADMIN', 'PURCHASE_USER'].includes(userRole);

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' };
  const metaLabel = { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 600, letterSpacing: '0.04em' };
  const metaValue = { fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>Loading…</div>;
  if (error || !po) return <div style={{ textAlign: 'center', padding: '80px', color: '#F87171', fontFamily: 'var(--font-family)' }}>Purchase Order not found.</div>;

  const hasRemainingLines = (po.lines || []).some((l) => l.remainingQty > 0);

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)', maxWidth: '1040px', margin: '0 auto' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#818CF8', margin: 0 }}>{po.orderRef}</h2>
            <StatusBadge status={po.status} />
            {po.isAutoGenerated && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                ⚡ Auto-Generated
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Created by {po.createdByName} · {new Date(po.orderDate).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => navigate('/purchase')}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Back
        </button>
      </div>

      {/* ── SO TRACEABILITY BANNER ── */}
      {po.salesOrderId && po.salesOrderRef && (
        <div
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate(`/sales/${po.salesOrderId}`)}
        >
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            AUTO GENERATED — Created from Sales Order{' '}
            <span style={{ fontWeight: 700, color: '#818CF8', textDecoration: 'underline' }}>
              {po.salesOrderRef}
            </span>
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#818CF8' }}>View SO →</span>
        </div>
      )}

      {/* ── ALERTS ── */}
      {actionError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '14px', color: '#F87171', fontSize: '13px' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '14px', color: '#4ADE80', fontSize: '13px' }}>
          {actionSuccess}
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Meta */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={sectionTitle}>Order Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <p style={metaLabel}>VENDOR</p>
                <p style={{ ...metaValue, fontWeight: 700 }}>{po.vendorName}</p>
                {po.vendorEmail && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>✉ {po.vendorEmail}</p>}
                {po.vendorPhone && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>📞 {po.vendorPhone}</p>}
              </div>
              <div>
                <p style={metaLabel}>EXPECTED DELIVERY</p>
                <p style={metaValue}>{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '—'}</p>
                {po.receivedDate && <>
                  <p style={{ ...metaLabel, marginTop: '10px' }}>RECEIVED ON</p>
                  <p style={{ ...metaValue, color: '#4ADE80' }}>{new Date(po.receivedDate).toLocaleDateString()}</p>
                </>}
              </div>
              <div>
                <p style={metaLabel}>TOTAL COST</p>
                <p style={{ ...metaValue, fontWeight: 700, color: '#818CF8', fontSize: '18px' }}>₹{(po.totalCost || 0).toFixed(2)}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {po.totalReceived} / {po.totalOrdered} units received
                </p>
              </div>
              {po.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={metaLabel}>NOTES</p>
                  <p style={{ ...metaValue, color: 'var(--text-secondary)' }}>{po.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={sectionTitle}>Order Lines</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>PRODUCT</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>ORDERED</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>RECEIVED</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>REMAINING</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>UNIT COST</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>TOTAL</th>
                    <th style={{ padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', minWidth: '120px' }}>RECEIPT PROGRESS</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.lines || []).map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{line.sku}</div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{line.qty}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: '#4ADE80', fontWeight: 600 }}>{line.receivedQty}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: line.remainingQty > 0 ? '#FB923C' : '#94A3B8', fontWeight: 600 }}>{line.remainingQty}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>₹{line.unitCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>₹{line.totalCost.toFixed(2)}</td>
                      <td style={{ padding: '10px 6px' }}>
                        <ProgressBar progress={line.receiptProgress} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt History */}
          {po.receipts && po.receipts.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={sectionTitle}>Receipt History ({po.receipts.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {po.receipts.map((r, idx) => (
                  <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                          Receipt #{idx + 1}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(r.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      {r.receivedBy && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>by {r.receivedBy.name}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {r.lines.map((rl) => (
                        <div key={rl.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{rl.name}</span>
                          <span style={{ color: '#4ADE80', fontWeight: 700, marginLeft: '6px' }}>+{rl.qty}</span>
                        </div>
                      ))}
                    </div>
                    {r.notes && <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{r.notes}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {po.timeline && po.timeline.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <p style={sectionTitle}>Audit Trail</p>
              <AuditTimeline timeline={po.timeline} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={{ ...sectionTitle, marginBottom: '16px' }}>Actions</p>

            {po.status === 'DRAFT' && canConfirm && (
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                style={{ width: '100%', marginBottom: '8px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
              >
                {confirmMutation.isPending ? 'Confirming…' : '✅ Confirm Order'}
              </Button>
            )}

            {['SENT', 'PARTIALLY_RECEIVED'].includes(po.status) && canReceive && hasRemainingLines && (
              <Button
                onClick={() => setShowReceiveModal(true)}
                style={{ width: '100%', marginBottom: '8px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
              >
                📥 Receive Goods
              </Button>
            )}

            {['DRAFT', 'SENT'].includes(po.status) && canCancel && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this Purchase Order?')) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
                style={{ width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {cancelMutation.isPending ? 'Cancelling…' : '✕ Cancel Order'}
              </button>
            )}

            {po.status === 'RECEIVED' && (
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎉</div>
                <p style={{ fontSize: '13px', color: '#4ADE80', margin: 0, fontWeight: 600 }}>Fully Received</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {po.receivedDate ? new Date(po.receivedDate).toLocaleDateString() : ''}
                </p>
              </div>
            )}

            {po.status === 'CANCELLED' && (
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: '#F87171', margin: 0, fontWeight: 600 }}>Order Cancelled</p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={sectionTitle}>Status Timeline</p>
            {['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'].map((s, i) => {
              const labels = { DRAFT: 'Draft Created', SENT: 'Confirmed', PARTIALLY_RECEIVED: 'Partially Received', RECEIVED: 'Fully Received' };
              const statusOrder = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'];
              const currentIdx = statusOrder.indexOf(po.status);
              const isDone = i <= currentIdx && po.status !== 'CANCELLED';
              const isCurrent = po.status === s;

              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: i < 3 ? '10px' : 0 }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: isDone ? (isCurrent ? 'rgba(99,102,241,0.2)' : 'rgba(34,197,94,0.15)') : 'rgba(255,255,255,0.04)', border: `2px solid ${isDone ? (isCurrent ? '#818CF8' : '#4ADE80') : 'var(--border)'}`, color: isDone ? (isCurrent ? '#818CF8' : '#4ADE80') : 'var(--text-muted)' }}>
                    {isDone && !isCurrent ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 400, color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {labels[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <ReceiveModal
          po={po}
          onClose={() => setShowReceiveModal(false)}
          onSubmit={(payload) => receiveMutation.mutate(payload)}
          isLoading={receiveMutation.isPending}
        />
      )}
    </div>
  );
};

export default PurchaseDetailPage;
