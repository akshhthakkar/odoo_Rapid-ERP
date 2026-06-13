import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductById, createProduct, updateProduct } from '../../api/products.api';
import { getVendors } from '../../api/vendors.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ProductFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    salesPrice: '',
    costPrice: '',
    procureOnDemand: false,
    procurementType: 'PURCHASE',
    isActive: true, // Default to active
    vendors: [] // Array of { vendorId, name, unitPrice }
  });

  const [vendorSelect, setVendorSelect] = useState('');
  const [vendorCost, setVendorCost] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── QUERY: VENDORS ─────────────────────────────────────────────────────────
  const { data: availableVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors
  });

  // ─── QUERY: PRODUCT DETAIL (if in edit mode) ──────────────────────────────────
  const { data: initialProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id),
    enabled: isEdit,
  });

  // Hydrate form in edit mode
  useEffect(() => {
    if (isEdit && initialProduct) {
      setForm({
        name: initialProduct.name,
        sku: initialProduct.sku,
        description: initialProduct.description || '',
        salesPrice: initialProduct.salesPrice,
        costPrice: initialProduct.costPrice,
        procureOnDemand: initialProduct.procureOnDemand,
        procurementType: initialProduct.procurementType,
        isActive: initialProduct.isActive !== false,
        vendors: initialProduct.vendors || []
      });
    }
  }, [isEdit, initialProduct]);

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (isEdit) {
        return updateProduct(id, payload);
      }
      return createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['product', id] });
      }
      setSuccess(`Product saved successfully.`);
      setTimeout(() => {
        navigate('/products');
      }, 1000);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to save product.');
    }
  });

  // ─── VENDOR HELPERS ─────────────────────────────────────────────────────────
  const handleAddVendor = () => {
    setError('');
    if (!vendorSelect) {
      setError('Please select a vendor.');
      return;
    }
    if (!vendorCost || isNaN(Number(vendorCost)) || Number(vendorCost) < 0) {
      setError('Please enter a valid vendor cost.');
      return;
    }

    const selectedVendor = availableVendors.find(v => v.id === Number(vendorSelect));
    if (!selectedVendor) return;

    // Check if already added
    if (form.vendors.some(v => v.vendorId === selectedVendor.id)) {
      setError('This vendor is already added.');
      return;
    }

    setForm(prev => ({
      ...prev,
      vendors: [...prev.vendors, {
        vendorId: selectedVendor.id,
        name: selectedVendor.name,
        unitPrice: Number(vendorCost)
      }]
    }));

    setVendorSelect('');
    setVendorCost('');
  };

  const handleRemoveVendor = (vendorId) => {
    setForm(prev => ({
      ...prev,
      vendors: prev.vendors.filter(v => v.vendorId !== vendorId)
    }));
  };

  // ─── SUBMIT FORM ────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.sku.trim()) {
      setError('Product Name and SKU are required.');
      return;
    }

    if (form.salesPrice === '' || form.costPrice === '') {
      setError('Sales price and Cost price are required.');
      return;
    }

    if (isNaN(Number(form.salesPrice)) || Number(form.salesPrice) < 0) {
      setError('Sales price must be a positive number.');
      return;
    }

    if (isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) {
      setError('Cost price must be a positive number.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      description: form.description.trim() || null,
      salesPrice: Number(form.salesPrice),
      costPrice: Number(form.costPrice),
      procureOnDemand: form.procureOnDemand,
      procurementType: form.procurementType,
      isActive: form.isActive,
      vendors: form.vendors.map(v => ({
        vendorId: v.vendorId,
        unitPrice: v.unitPrice
      }))
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingProduct) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading product details...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Product Specification' : 'Add New Product'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isEdit ? 'Update prices, description, and procurement policies.' : 'Configure general details, supplier links, and stock rules.'}
          </p>
        </div>

        {error && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            color: 'var(--danger)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            color: 'var(--success)',
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section: Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              id="prod-name"
              label="Product Name"
              type="text"
              placeholder="e.g. Oak Office Desk"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />

            <Input
              id="prod-sku"
              label="SKU (Unique)"
              type="text"
              placeholder="e.g. OAK-DESK-01"
              value={form.sku}
              onChange={(e) => setForm(p => ({ ...p, sku: e.target.value }))}
              required
              disabled={isEdit} // SKU shouldn't be altered easily in edit
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Description</label>
            <textarea
              id="prod-desc"
              className="erp-input"
              placeholder="Product technical specifications or description..."
              rows="3"
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Section: Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <Input
              id="prod-sales-price"
              label="Sales Price ($)"
              type="text"
              placeholder="299.99"
              value={form.salesPrice}
              onChange={(e) => setForm(p => ({ ...p, salesPrice: e.target.value }))}
              required
            />

            <Input
              id="prod-cost-price"
              label="Standard Cost Price ($)"
              type="text"
              placeholder="150.00"
              value={form.costPrice}
              onChange={(e) => setForm(p => ({ ...p, costPrice: e.target.value }))}
              required
            />
          </div>

          {/* Section: Procurement Rules */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            marginBottom: '24px',
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Procurement & Inventory Rules
            </h4>

            {/* Active Status Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  Active Status
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Archived products cannot be selected for new Sales Orders.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '9999px',
                  background: form.isActive ? '#FF540E' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: form.isActive ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Procure On Demand */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  Procure on Demand (MTO)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  If active, confirming a Sales Order with a stock shortage will auto-trigger a PO or MO.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, procureOnDemand: !p.procureOnDemand }))}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '9999px',
                  background: form.procureOnDemand ? '#FF540E' : '#E5E7EB',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: form.procureOnDemand ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Procurement Type */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  Procurement Source
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Decides whether shortages will trigger a Purchase Order (PO) or a Manufacturing Order (MO).
                </span>
              </div>
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
                {[
                  { value: 'PURCHASE', label: 'Purchase' },
                  { value: 'MANUFACTURING', label: 'Manufacture' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, procurementType: opt.value }))}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '7px',
                      border: 'none',
                      background: form.procurementType === opt.value ? '#FF540E' : 'transparent',
                      color: form.procurementType === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Product Vendors */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            marginBottom: '28px',
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Linked Suppliers & Purchase Price
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Provide vendor sources for purchasing raw components. The first supplier listed will be used as the default for auto-POs.
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label">Select Vendor</label>
                <select
                  value={vendorSelect}
                  onChange={(e) => setVendorSelect(e.target.value)}
                  className="erp-input erp-select"
                  style={{ background: '#FFFFFF', color: 'var(--text-primary)' }}
                >
                  <option value="" style={{ background: '#FFFFFF', color: 'var(--text-muted)' }}>
                    -- Choose Vendor --
                  </option>
                  {availableVendors.map(v => (
                    <option key={v.id} value={v.id} style={{ background: '#FFFFFF', color: 'var(--text-primary)' }}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" htmlFor="vendor-unit-price">Purchase Price ($)</label>
                <input
                  id="vendor-unit-price"
                  type="text"
                  placeholder="120.00"
                  value={vendorCost}
                  onChange={(e) => setVendorCost(e.target.value)}
                  className="erp-input"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddVendor}
                style={{ padding: '11px 18px', border: '1px solid rgba(255, 84, 14, 0.2)', background: 'rgba(255, 84, 14, 0.08)', color: '#FF540E' }}
              >
                + Link
              </Button>
            </div>

            {form.vendors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No vendor associations added yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Vendor</th>
                      <th style={{ padding: '8px 12px' }}>Standard Cost</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.vendors.map((v) => (
                      <tr key={v.vendorId}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{v.name}</td>
                        <td style={{ padding: '10px 12px' }}>${v.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveVendor(v.vendorId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              id="btn-save-product"
              type="submit"
              loading={saveMutation.isPending}
              style={{ flex: 1, background: '#FF540E' }}
            >
              Save Product
            </Button>
            <Button
              id="btn-cancel-product"
              type="button"
              variant="secondary"
              onClick={() => navigate('/products')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormPage;
