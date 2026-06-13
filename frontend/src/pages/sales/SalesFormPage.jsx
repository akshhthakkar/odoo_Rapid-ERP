import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSalesOrder } from '../../api/sales.api';
import { getCustomers } from '../../api/customers.api';
import { getProducts } from '../../api/products.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const SalesFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [lines, setLines] = useState([{ productId: '', qty: '1', unitPrice: '0' }]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── QUERY CALLS ────────────────────────────────────────────────────────────
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setSuccessMessage('Sales Order draft created successfully.');
      setErrorMessage('');
      setTimeout(() => {
        navigate(`/sales/${res.order.id}`);
      }, 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Sales Order.');
      setSuccessMessage('');
    }
  });

  // ─── EVENT HANDLERS ─────────────────────────────────────────────────────────
  const handleAddLine = () => {
    setLines(prev => [...prev, { productId: '', qty: '1', unitPrice: '0' }]);
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, value) => {
    setLines(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill price if product changes
        if (field === 'productId' && value) {
          const selectedProd = products.find(p => p.id === Number(value));
          if (selectedProd) {
            updated.unitPrice = selectedProd.salesPrice.toString();
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = (line) => {
    const qty = Number(line.qty) || 0;
    const price = Number(line.unitPrice) || 0;
    return qty * price;
  };

  const calculateTotal = () => {
    return lines.reduce((sum, l) => sum + calculateSubtotal(l), 0);
  };

  const getProductDetails = (productIdVal) => {
    if (!productIdVal) return null;
    return products.find(p => p.id === Number(productIdVal)) || null;
  };

  // ─── SUBMIT HANDLER ─────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!customerId) {
      setErrorMessage('Please select a customer.');
      return;
    }

    if (lines.length === 0) {
      setErrorMessage('Sales Order must have at least one line item.');
      return;
    }

    // 1. Duplicate Line Validation
    const productIds = lines.map(l => l.productId);
    const uniqueIds = new Set(productIds.filter(id => id !== ''));
    if (uniqueIds.size !== productIds.length) {
      setErrorMessage('Duplicate products detected. Please merge duplicate product line items.');
      return;
    }

    // 2. Row level validations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        setErrorMessage(`Please select a product for row ${i + 1}.`);
        return;
      }
      const qtyNum = Number(line.qty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setErrorMessage(`Quantity must be a positive number on row ${i + 1}.`);
        return;
      }
      const priceNum = Number(line.unitPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setErrorMessage(`Unit price must be a positive number or zero on row ${i + 1}.`);
        return;
      }
    }

    const payload = {
      customerId: Number(customerId),
      requestedDeliveryDate: requestedDeliveryDate || null,
      notes: notes.trim() || null,
      lines: lines.map(l => ({
        productId: Number(l.productId),
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice)
      }))
    };

    saveMutation.mutate(payload);
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create Sales Order</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>Draft a new sales quote for a customer. Stock will be reserved upon confirmation.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
          >
            ← Back
          </button>
        </div>

        {errorMessage && (
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
            fontSize: '13.5px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Selection & Date input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="form-label">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="erp-input erp-select"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: 0 }}
                required
              >
                <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  -- Choose Customer --
                </option>
                {customers.map(c => (
                  <option key={c.id} value={c.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Requested Delivery Date</label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                className="erp-input"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Internal Notes / Terms</label>
            <textarea
              id="so-notes"
              className="erp-input"
              placeholder="Delivery instructions, shipping terms, customer requests..."
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Product Lines Sub-form */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border)',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Order Lines</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add finished products, check stock, and verify pricing details.</p>
              </div>
              <Button
                type="button"
                id="btn-add-line-row"
                onClick={handleAddLine}
                style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,84,14,0.1)', border: '1px solid rgba(255,84,14,0.3)', color: '#FF8A58' }}
              >
                + Add Item
              </Button>
            </div>

            {lines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No product lines added. Click "+ Add Item" to populate customer demand.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lines.map((line, idx) => {
                  const pDetail = getProductDetails(line.productId);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Product Selector */}
                      <div style={{ flex: 3.5, minWidth: 200 }}>
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                          className="erp-input erp-select"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: 0 }}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.filter(p => p.isActive !== false).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name}
                            </option>
                          ))}
                        </select>

                        {/* Stock & MTO/MTS indicator */}
                        {pDetail && (() => {
                          const free = Number(pDetail.freeToUseQty || 0);
                          const needed = Number(line.qty) || 0;
                          
                          let stockStatus = { label: 'Out of Stock', color: 'var(--danger)' };
                          if (free >= needed && needed > 0) {
                            stockStatus = { label: 'In Stock', color: 'var(--success)' };
                          } else if (free > 0 && free < needed) {
                            stockStatus = { label: 'Partial Stock', color: 'var(--warning)' };
                          }

                          return (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', paddingLeft: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: stockStatus.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: stockStatus.color, display: 'inline-block' }} /> {stockStatus.label} (Avail: {free})
                              </span>
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                background: pDetail.procureOnDemand ? 'rgba(255, 84, 14, 0.1)' : 'rgba(16,185,129,0.1)',
                                color: pDetail.procureOnDemand ? '#FF8A58' : 'var(--success)'
                              }}>
                                {pDetail.procureOnDemand ? 'MTO' : 'MTS'}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                ({pDetail.procurementType})
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Qty Input */}
                      <div style={{ flex: 1, minWidth: 70 }}>
                        <input
                          type="text"
                          placeholder="Qty"
                          value={line.qty}
                          onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                          className="erp-input"
                          style={{ marginBottom: 0 }}
                          required
                        />
                      </div>

                      {/* Price Input */}
                      <div style={{ flex: 1.5, minWidth: 90 }}>
                        <input
                          type="text"
                          placeholder="Price"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                          className="erp-input"
                          style={{ marginBottom: 0 }}
                          required
                        />
                      </div>

                      {/* Row Total */}
                      <div style={{ flex: 1.5, minWidth: 90, textAlign: 'right', alignSelf: 'center', fontWeight: 600, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                        ${calculateSubtotal(line).toFixed(2)}
                      </div>

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '8px 4px',
                          alignSelf: 'center'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Estimated Order Total:</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#FF8A58' }}>${calculateTotal().toFixed(2)}</span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              id="btn-save-sales-order"
              type="submit"
              loading={saveMutation.isPending}
              style={{ flex: 1, background: '#FF540E' }}
            >
              Save Sales Order Draft
            </Button>
            <Button
              id="btn-cancel-sales-order"
              type="button"
              variant="secondary"
              onClick={() => navigate('/sales')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesFormPage;
