import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBomById, createBom, updateBom } from '../../api/bom.api';
import { getProducts } from '../../api/products.api';
import { getWorkCenters } from '../../api/workcenters.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const BomFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── STATE MANAGEMENT ───────────────────────────────────────────────────────
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState([]);
  const [operations, setOperations] = useState([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── QUERY CALLS ────────────────────────────────────────────────────────────
  const { data: products = [], isLoading: isLoadingProd } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: workCenters = [], isLoading: isLoadingWc } = useQuery({
    queryKey: ['workcenters'],
    queryFn: getWorkCenters,
  });

  const { data: initialBom, isLoading: isLoadingBom } = useQuery({
    queryKey: ['bom', id],
    queryFn: () => getBomById(id),
    enabled: isEdit,
  });

  // Hydrate form in edit mode
  useEffect(() => {
    if (isEdit && initialBom) {
      setProductId(initialBom.productId);
      setVersion(initialBom.version);
      setIsActive(initialBom.isActive);
      setNotes(initialBom.notes || '');
      setComponents(initialBom.components.map(c => ({
        productId: c.productId,
        qty: c.qty.toString()
      })));
      setOperations(initialBom.operations.map(o => ({
        workCenterId: o.workCenterId,
        name: o.name,
        durationMins: o.durationMins.toString(),
        sequence: o.sequence.toString()
      })));
    }
  }, [isEdit, initialBom]);

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (isEdit) {
        return updateBom(id, payload);
      }
      return createBom(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['bom', id] });
      }
      setSuccessMessage(res.message || 'Bill of Materials saved successfully.');
      setErrorMessage('');
      setTimeout(() => {
        navigate('/bom');
      }, 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to save Bill of Materials.');
      setSuccessMessage('');
    }
  });

  // ─── COMPONENT EVENT HANDLERS ───────────────────────────────────────────────
  const handleAddComponent = () => {
    setComponents(prev => [...prev, { productId: '', qty: '1' }]);
  };

  const handleRemoveComponent = (index) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index, field, value) => {
    setComponents(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // ─── OPERATION EVENT HANDLERS ────────────────────────────────────────────────
  const handleAddOperation = () => {
    const nextSequence = operations.length > 0 
      ? Math.max(...operations.map(o => parseInt(o.sequence, 10) || 0)) + 10 
      : 10;
    setOperations(prev => [...prev, { workCenterId: '', name: '', durationMins: '30', sequence: nextSequence.toString() }]);
  };

  const handleRemoveOperation = (index) => {
    setOperations(prev => prev.filter((_, i) => i !== index));
  };

  const handleOperationChange = (index, field, value) => {
    setOperations(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // ─── SUBMIT HANDLER ─────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!productId) {
      setErrorMessage('Please select a finished product.');
      return;
    }

    if (components.length === 0) {
      setErrorMessage('At least one component is required.');
      return;
    }

    if (operations.length === 0) {
      setErrorMessage('At least one manufacturing operation step is required.');
      return;
    }

    // Client-side validations
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      if (!comp.productId) {
        setErrorMessage(`Please select a product for component row ${i + 1}.`);
        return;
      }
      const qtyNum = Number(comp.qty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setErrorMessage(`Quantity must be a positive number for component row ${i + 1}.`);
        return;
      }
      if (comp.productId === productId.toString() || comp.productId === productId) {
        setErrorMessage(`Self-reference detected: The finished product cannot be a component of itself.`);
        return;
      }
    }

    const sequencesSet = new Set();
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op.workCenterId) {
        setErrorMessage(`Please select a work center for operation row ${i + 1}.`);
        return;
      }
      if (!op.name.trim()) {
        setErrorMessage(`Please enter a name for operation row ${i + 1}.`);
        return;
      }
      const durNum = parseInt(op.durationMins, 10);
      if (isNaN(durNum) || durNum <= 0) {
        setErrorMessage(`Duration must be a positive integer for operation row ${i + 1}.`);
        return;
      }
      const seqNum = parseInt(op.sequence, 10);
      if (isNaN(seqNum) || seqNum <= 0) {
        setErrorMessage(`Sequence must be a positive integer for operation row ${i + 1}.`);
        return;
      }
      if (sequencesSet.has(seqNum)) {
        setErrorMessage(`Duplicate sequence number detected: "${seqNum}". Operation sequences must be unique.`);
        return;
      }
      sequencesSet.add(seqNum);
    }

    const payload = {
      productId: Number(productId),
      version: version.trim(),
      isActive,
      notes: notes.trim() || null,
      components: components.map(c => ({
        productId: Number(c.productId),
        qty: Number(c.qty)
      })),
      operations: operations.map(o => ({
        workCenterId: Number(o.workCenterId),
        name: o.name.trim(),
        durationMins: Number(o.durationMins),
        sequence: Number(o.sequence)
      }))
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingBom) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading Bill of Materials details...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '32px' }}>
        {/* Title */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Bill of Materials' : 'Add New Bill of Materials'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isEdit 
              ? 'Modify recipe components and work center processing configurations.' 
              : 'Create a recipe structure matching component ingredients to operations for production.'
            }
          </p>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="animate-shake" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13.5px',
            color: 'var(--danger)',
          }}>
            ⚠️ {errorMessage}
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
          }}>
            ✅ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Finished Product Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Finished Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="erp-input erp-select"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                disabled={isEdit}
                required
              >
                <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  -- Select Finished Product --
                </option>
                {products.map(p => (
                  <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="bom-version"
              label="Version"
              type="text"
              placeholder="e.g. 1.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
          </div>

          {/* Active status & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  Active Status
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Activating this BoM will automatically deactivate other BoMs for this product.
                </span>
              </div>
              <button
                type="button"
                id="toggle-bom-active"
                onClick={() => setIsActive(!isActive)}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '9999px',
                  background: isActive ? '#FF540E' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: isActive ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Notes & Instructions</label>
              <textarea
                id="bom-notes"
                className="erp-input"
                placeholder="Recipe specifications or step instructions..."
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          {/* Components Section */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border)',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Components (Ingredients)</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add products required as raw materials in manufacturing.</p>
              </div>
              <Button
                type="button"
                id="btn-add-component-row"
                onClick={handleAddComponent}
                style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,84,14,0.1)', border: '1px solid rgba(255,84,14,0.3)', color: '#FF8A58' }}
              >
                + Add Component
              </Button>
            </div>

            {components.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No components added. Click "+ Add Component" to add materials.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {components.map((comp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 3 }}>
                      <select
                        value={comp.productId}
                        onChange={(e) => handleComponentChange(idx, 'productId', e.target.value)}
                        className="erp-input erp-select"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: 0 }}
                      >
                        <option value="">-- Choose Component Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1.2 }}>
                      <input
                        type="text"
                        placeholder="Qty"
                        value={comp.qty}
                        onChange={(e) => handleComponentChange(idx, 'qty', e.target.value)}
                        className="erp-input"
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '8px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operations Section */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border)',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Operations (Process Flow)</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Map the work center stages and time required for manufacturing.</p>
              </div>
              <Button
                type="button"
                id="btn-add-operation-row"
                onClick={handleAddOperation}
                style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,84,14,0.1)', border: '1px solid rgba(255,84,14,0.3)', color: '#FF8A58' }}
              >
                + Add Operation Step
              </Button>
            </div>

            {operations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No operation stages defined. Click "+ Add Operation Step" to map flow steps.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {operations.map((op, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1.8 }}>
                      <select
                        value={op.workCenterId}
                        onChange={(e) => handleOperationChange(idx, 'workCenterId', e.target.value)}
                        className="erp-input erp-select"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: 0 }}
                      >
                        <option value="">-- Choose Center --</option>
                        {workCenters.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 2.2 }}>
                      <input
                        type="text"
                        placeholder="Operation Name (e.g. Painting)"
                        value={op.name}
                        onChange={(e) => handleOperationChange(idx, 'name', e.target.value)}
                        className="erp-input"
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>

                    <div style={{ flex: 1.2 }}>
                      <input
                        type="text"
                        placeholder="Min"
                        value={op.durationMins}
                        onChange={(e) => handleOperationChange(idx, 'durationMins', e.target.value)}
                        className="erp-input"
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Seq"
                        value={op.sequence}
                        onChange={(e) => handleOperationChange(idx, 'sequence', e.target.value)}
                        className="erp-input"
                        style={{ marginBottom: 0 }}
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOperation(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '8px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              id="btn-save-bom"
              type="submit"
              loading={saveMutation.isPending}
              style={{ flex: 1, background: '#FF540E' }}
            >
              Save Bill of Materials
            </Button>
            <Button
              id="btn-cancel-bom"
              type="button"
              variant="secondary"
              onClick={() => navigate('/bom')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BomFormPage;
