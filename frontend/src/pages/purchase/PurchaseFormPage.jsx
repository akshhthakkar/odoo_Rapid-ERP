import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPurchaseOrder } from '../../api/purchase.api';
import { getVendors } from '../../api/vendors.api';
import { getProducts } from '../../api/products.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, Phone } from 'lucide-react';

const PurchaseFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [lines, setLines] = useState([{ productId: '', qty: '1', unitCost: '0' }]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const selectedVendor = vendors.find((v) => v.id === Number(vendorId));

  const saveMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setSuccessMessage('Purchase Order draft created successfully.');
      setErrorMessage('');
      setTimeout(() => navigate(`/purchase/${res.purchaseOrder.id}`), 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Purchase Order.');
      setSuccessMessage('');
    },
  });

  const handleAddLine = () => setLines((prev) => [...prev, { productId: '', qty: '1', unitCost: '0' }]);

  const handleRemoveLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId' && value) {
          const prod = products.find((p) => p.id === Number(value));
          if (prod && prod.lastPurchaseCost) updated.unitCost = prod.lastPurchaseCost.toString();
        }
        return updated;
      })
    );
  };

  const lineTotal = (line) => (Number(line.qty) || 0) * (Number(line.unitCost) || 0);
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vendorId) { setErrorMessage('Please select a vendor.'); return; }
    if (lines.some((l) => !l.productId)) { setErrorMessage('Please select a product for every line.'); return; }
    const payload = {
      vendorId: Number(vendorId),
      notes,
      expectedDeliveryDate: expectedDeliveryDate || null,
      lines: lines.map((l) => ({ productId: Number(l.productId), qty: Number(l.qty), unitCost: Number(l.unitCost) })),
    };
    saveMutation.mutate(payload);
  };

  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', letterSpacing: '0.04em' };
  const selectStyle = { width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none' };
  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' };

  return (
    <div className="animate-fade-in" style={{ fontFamily: 'var(--font-family)', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            New Purchase Order
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Create a draft PO. Confirm it before receiving goods.
          </p>
        </div>
        <button
          onClick={() => navigate('/purchase')}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Back
        </button>
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', color: '#F87171', fontSize: '13px' }}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', color: '#4ADE80', fontSize: '13px' }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Vendor & Header Fields */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
          <p style={sectionTitle}>Vendor & Order Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Vendor */}
            <div>
              <label style={labelStyle}>Vendor *</label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required style={selectStyle}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {selectedVendor && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255, 84, 14, 0.06)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedVendor.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {selectedVendor.email}</div>}
                  {selectedVendor.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}><Phone size={12} /> {selectedVendor.phone}</div>}
                </div>
              )}
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label style={labelStyle}>Expected Delivery Date</label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Notes — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes for this purchase order…"
                style={{ ...selectStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
          <p style={sectionTitle}>Line Items</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em' }}>PRODUCT</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', width: '80px' }}>SKU</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', width: '100px' }}>QTY</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', width: '120px' }}>UNIT COST (₹)</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', width: '110px' }}>TOTAL</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const selProd = products.find((p) => p.id === Number(line.productId));
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 6px' }}>
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineChange(i, 'productId', e.target.value)}
                          required
                          style={{ ...selectStyle, padding: '7px 8px' }}
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {selProd?.sku || '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="number"
                          min="1"
                          step="0.001"
                          value={line.qty}
                          onChange={(e) => handleLineChange(i, 'qty', e.target.value)}
                          required
                          style={{ ...selectStyle, textAlign: 'right', padding: '7px 8px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) => handleLineChange(i, 'unitCost', e.target.value)}
                          required
                          style={{ ...selectStyle, textAlign: 'right', padding: '7px 8px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{lineTotal(line).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: '16px', lineHeight: 1 }}
                          >×</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleAddLine}
              style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}
            >
              + Add Line
            </button>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Grand Total: <span style={{ color: 'var(--accent)' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/purchase')}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', fontSize: '13px' }}
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Draft'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseFormPage;
