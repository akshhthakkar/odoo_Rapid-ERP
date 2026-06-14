import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import {
  getInventoryDashboard,
  getStockLedger,
  getInventoryValuation,
  getWarehouses,
  createWarehouse,
  getStockTransfers,
  createStockTransfer,
  getInventoryAdjustments,
  createInventoryAdjustment,
  deactivateWarehouse,
} from "../../api/inventory.api.js";
import { getProducts } from "../../api/products.api.js";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowLeftRight,
  PlusCircle,
  FileText,
  Warehouse as WhIcon,
  Search,
  CheckCircle,
} from "lucide-react";

const InventoryHubPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, ledger, adjustments, valuation, warehouses
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Modals state
  const [showWhModal, setShowWhModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Form states
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");

  const [transferSource, setTransferSource] = useState("");
  const [transferDest, setTransferDest] = useState("");
  const [transferLines, setTransferLines] = useState([{ productId: "", qty: "" }]);
  const [transferNotes, setTransferNotes] = useState("");

  const [adjWarehouse, setAdjWarehouse] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjLines, setAdjLines] = useState([{ productId: "", qty: "" }]);

  // Ledger filters state
  const [filterProduct, setFilterProduct] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterMovementType, setFilterMovementType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Role permissions
  const canManageInventory = ["ADMIN", "INVENTORY_MANAGER", "BUSINESS_OWNER"].includes(userRole);

  // ─── QUERY DATA ─────────────────────────────────────────────────────────────
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["inventoryDashboard"],
    queryFn: getInventoryDashboard,
    refetchInterval: 10000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: warehouses = [], isLoading: isWhLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  const { data: valuationData, isLoading: isValuationLoading } = useQuery({
    queryKey: ["inventoryValuation"],
    queryFn: getInventoryValuation,
  });

  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: getStockTransfers,
  });

  const { data: adjustments = [], isLoading: isAdjustmentsLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: getInventoryAdjustments,
  });

  const { data: ledger = [], isLoading: isLedgerLoading } = useQuery({
    queryKey: ["ledger", filterProduct, filterWarehouse, filterMovementType, filterStartDate, filterEndDate],
    queryFn: () => getStockLedger({
      productId: filterProduct,
      warehouseId: filterWarehouse,
      movementType: filterMovementType,
      startDate: filterStartDate,
      endDate: filterEndDate,
    }),
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────────────
  const createWhMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setWhCode("");
      setWhName("");
      setShowWhModal(false);
      triggerAlert("Warehouse created successfully.");
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to create warehouse.");
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: createStockTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryValuation"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setTransferSource("");
      setTransferDest("");
      setTransferLines([{ productId: "", qty: "" }]);
      setTransferNotes("");
      setShowTransferModal(false);
      triggerAlert("Stock transfer completed successfully.");
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to complete transfer.");
    },
  });

  const createAdjMutation = useMutation({
    mutationFn: createInventoryAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryValuation"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setAdjWarehouse("");
      setAdjReason("");
      setAdjLines([{ productId: "", qty: "" }]);
      setShowAdjustmentModal(false);
      triggerAlert("Inventory adjustment logged successfully.");
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to complete adjustment.");
    },
  });

  const deactivateWhMutation = useMutation({
    mutationFn: deactivateWarehouse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      triggerAlert(data.message || "Warehouse deactivated.");
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to deactivate warehouse.");
    },
  });

  const triggerAlert = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage("");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const handleCreateWh = (e) => {
    e.preventDefault();
    createWhMutation.mutate({ code: whCode, name: whName });
  };

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    createTransferMutation.mutate({
      sourceWarehouseId: transferSource,
      destinationWarehouseId: transferDest,
      notes: transferNotes,
      lines: transferLines.map(l => ({ productId: l.productId, qty: l.qty })),
    });
  };

  const handleCreateAdjustment = (e) => {
    e.preventDefault();
    createAdjMutation.mutate({
      warehouseId: adjWarehouse,
      reason: adjReason,
      lines: adjLines.map(l => ({ productId: l.productId, qty: l.qty })),
    });
  };

  const handleAddTransferLine = () => {
    setTransferLines([...transferLines, { productId: "", qty: "" }]);
  };

  const handleRemoveTransferLine = (index) => {
    setTransferLines(transferLines.filter((_, i) => i !== index));
  };

  const handleAddAdjLine = () => {
    setAdjLines([...adjLines, { productId: "", qty: "" }]);
  };

  const handleRemoveAdjLine = (index) => {
    setAdjLines(adjLines.filter((_, i) => i !== index));
  };

  // Helper formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>Inventory & Warehouses</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Monitor stocks, log adjustments, transfer raw materials, and track asset valuations.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {canManageInventory && (
            <>
              <Button onClick={() => { setErrorMessage(""); setShowWhModal(true); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                + Add Warehouse
              </Button>
              <Button onClick={() => { setErrorMessage(""); setShowTransferModal(true); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                ⇄ Transfer Stock
              </Button>
              <Button onClick={() => { setErrorMessage(""); setShowAdjustmentModal(true); }} style={{ background: "#FF540E" }}>
                ⚙️ Adjust Stock
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--success)", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
          ✅ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)", padding: "12px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
        {[
          { id: "dashboard", label: "Overview", icon: Layers },
          { id: "ledger", label: "Stock Ledger", icon: FileText },
          { id: "valuation", label: "Inventory Valuation", icon: TrendingUp },
          { id: "adjustments", label: "Manual Adjustments", icon: PlusCircle },
          { id: "warehouses", label: "Warehouse Control", icon: WhIcon },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setErrorMessage("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                border: "none",
                background: "none",
                fontSize: "13.5px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FF540E" : "var(--text-muted)",
                borderBottom: active ? "2px solid #FF540E" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "dashboard" && (
        <div className="animate-fade-in">
          {isDashboardLoading ? (
            <Loader size={24} padding="24px 0" />
          ) : (
            <>
              {/* Widgets Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {[
                  { title: "Inventory Value", value: formatCurrency(dashboardData?.metrics?.totalValue || 0), color: "#FF540E", icon: TrendingUp },
                  { title: "Low Stock Items", value: `${Math.round(dashboardData?.metrics?.lowStockCount || 0)} Products`, color: "var(--warning)", icon: AlertTriangle },
                  { title: "Out Of Stock", value: `${Math.round(dashboardData?.metrics?.outOfStockCount || 0)} Products`, color: "var(--danger)", icon: AlertTriangle },
                  { title: "Reserved Stock", value: `${Math.round(dashboardData?.metrics?.reservedStock || 0)} Units`, color: "var(--accent)", icon: CheckCircle },
                  { title: "Open Manufacturing Demand", value: `${Math.round(dashboardData?.metrics?.openMoDemand || 0)} Units`, color: "#10B981", icon: Layers },
                  { title: "Open PO Replenishments", value: `${Math.round(dashboardData?.metrics?.openPoDemand || 0)} Units`, color: "#8B5CF6", icon: ArrowLeftRight },
                ].map((w, i) => {
                  const Icon = w.icon;
                  return (
                    <div key={i} className="glass-card" style={{ padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{w.title}</span>
                        <Icon size={18} style={{ color: w.color }} />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{w.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Alert Tables */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px" }}>
                {/* Low Stock Alerts */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "var(--warning)" }}>⚠️ Low Stock Warnings</h3>
                  {dashboardData?.lowStockProducts?.length === 0 ? (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>All product inventory balances are above reorder levels.</div>
                  ) : (
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product</th>
                          <th>On Hand</th>
                          <th>Reorder Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.lowStockProducts.map(p => (
                          <tr key={p.id} onClick={() => navigate(`/inventory/product/${p.id}`)} style={{ cursor: "pointer" }}>
                            <td style={{ fontWeight: 600, color: "#FF540E" }}>{p.sku}</td>
                            <td>{p.name}</td>
                            <td>{p.onHand}</td>
                            <td style={{ fontWeight: 600 }}>{p.reorderLevel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Out of Stock Alerts */}
                <div className="glass-card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "var(--danger)" }}>🚨 Out Of Stock Alerts</h3>
                  {dashboardData?.outOfStockProducts?.length === 0 ? (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>No products are currently out of stock.</div>
                  ) : (
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product</th>
                          <th>On Hand</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.outOfStockProducts.map(p => (
                          <tr key={p.id} onClick={() => navigate(`/inventory/product/${p.id}`)} style={{ cursor: "pointer" }}>
                            <td style={{ fontWeight: 600, color: "var(--danger)" }}>{p.sku}</td>
                            <td>{p.name}</td>
                            <td style={{ color: "var(--danger)", fontWeight: 600 }}>{p.onHand}</td>
                            <td>
                              <span className="badge badge-danger">Out of Stock</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Top 5 Most Valuable Products */}
              {dashboardData?.topValued?.length > 0 && (
                <div className="glass-card" style={{ padding: "20px", marginTop: "20px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>
                    🏆 Top 5 Most Valuable Products
                  </h3>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>On Hand</th>
                        <th>Unit Cost</th>
                        <th>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topValued.map((p, idx) => (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/inventory/product/${p.id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ fontWeight: 700, color: idx === 0 ? "#FFB800" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "var(--text-muted)" }}>
                            #{idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: "#FF540E" }}>{p.sku}</td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td>{p.onHand}</td>
                          <td>{formatCurrency(p.cost)}</td>
                          <td style={{ fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(p.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="glass-card" style={{ padding: "24px" }}>
          {/* Filters Form */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Product Filter</label>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                <option value="">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Warehouse Filter</label>
              <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                <option value="">All Warehouses (Global)</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Movement Type</label>
              <select value={filterMovementType} onChange={e => setFilterMovementType(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                <option value="">All Movements</option>
                <option value="SALE_DELIVERY">Sales Delivery</option>
                <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
                <option value="MANUFACTURING_CONSUME">MFG Consume</option>
                <option value="MANUFACTURING_PRODUCE">MFG Produce</option>
                <option value="STOCK_ADJUSTMENT">Stock Correction</option>
                <option value="WAREHOUSE_TRANSFER_OUT">Transfer Outbound</option>
                <option value="WAREHOUSE_TRANSFER_IN">Transfer Inbound</option>
                <option value="INVENTORY_ADJUSTMENT">Manual Adjustment</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Start Date</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>End Date</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
            </div>
          </div>

          {/* Ledger Table */}
          {isLedgerLoading ? (
            <Loader size={24} padding="24px 0" />
          ) : ledger.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No matching inventory movements found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Movement Type</th>
                    <th>Quantity</th>
                    <th>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{m.reason || "Adjustment"}</td>
                      <td onClick={() => navigate(`/inventory/product/${m.productId}`)} style={{ cursor: "pointer", color: "#FF540E", fontWeight: 500 }}>{m.productName} ({m.productSku})</td>
                      <td>{m.warehouseName}</td>
                      <td>
                        <span style={{ fontSize: "11.5px", fontWeight: 500 }}>
                          {m.movementType?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: m.qty > 0 ? "var(--success)" : "var(--danger)" }}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td style={{ fontWeight: 600, background: "rgba(0,0,0,0.02)" }}>{m.runningBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "valuation" && (
        <div className="glass-card" style={{ padding: "24px" }}>
          {isValuationLoading ? (
            <Loader size={24} padding="24px 0" />
          ) : (
            <>
              {/* Grand Total Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Total Valuation Worth</span>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(valuationData?.totalValue || 0)}</div>
                </div>
              </div>

              {/* Valuation breakdown table */}
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Available On Hand</th>
                    <th>Cost Price (Last Cost)</th>
                    <th>Total Inventory Value</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData?.products?.map(p => (
                    <tr key={p.productId} onClick={() => navigate(`/inventory/product/${p.productId}`)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 600, color: "#FF540E" }}>{p.sku}</td>
                      <td style={{ fontWeight: 500 }}>{p.productName}</td>
                      <td>{p.qty}</td>
                      <td>{formatCurrency(p.cost)}</td>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {activeTab === "adjustments" && (
        <div className="glass-card" style={{ padding: "24px" }}>
          {isAdjustmentsLoading ? (
            <Loader size={24} padding="24px 0" />
          ) : adjustments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No manual stock adjustments logged yet.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Reason/Note</th>
                  <th>Created By</th>
                  <th>Timestamp</th>
                  <th>Lines Adjusted</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.adjustmentRef}</td>
                    <td>{a.reason}</td>
                    <td>{a.createdBy?.name}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {a.lines?.map((line, idx) => (
                          <span key={idx} style={{ fontSize: "12.5px" }}>
                            {line.product?.sku}: <strong style={{ color: line.qtyChange > 0 ? "var(--success)" : "var(--danger)" }}>
                              {line.qtyChange > 0 ? `+${line.qtyChange}` : line.qtyChange}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "warehouses" && (
        <div className="animate-fade-in">
          {/* Warehouses list */}
          <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>🏢 Active Warehouses</h3>
            {isWhLoading ? (
              <Loader size={24} padding="24px 0" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {warehouses.map(w => (
                  <div key={w.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", background: "var(--bg-card)" }}>
                    <div style={{ fontSize: "12px", color: "#FF540E", fontWeight: 700, textTransform: "uppercase" }}>{w.code}</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>{w.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "12.5px", color: "var(--text-muted)" }}>
                      <span>Active Status</span>
                      <span className="badge badge-success">Online</span>
                    </div>
                    {canManageInventory && w.code !== "MAIN" && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Deactivate warehouse "${w.name}"? This will fail if it holds any stock.`)) {
                            deactivateWhMutation.mutate(w.id);
                          }
                        }}
                        disabled={deactivateWhMutation.isPending}
                        style={{
                          marginTop: "10px",
                          width: "100%",
                          padding: "6px 0",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "var(--danger)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Deactivate Warehouse
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transfers list */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>⇄ Warehouse Stock Transfers</h3>
            {isTransfersLoading ? (
              <Loader size={24} padding="24px 0" />
            ) : transfers.length === 0 ? (
              <div style={{ textSecondary: "center", color: "var(--text-muted)", fontSize: "13px" }}>No warehouse stock transfers registered.</div>
            ) : (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Transferred By</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.transferRef}</td>
                      <td>{t.sourceWarehouse?.name} ({t.sourceWarehouse?.code})</td>
                      <td>{t.destinationWarehouse?.name} ({t.destinationWarehouse?.code})</td>
                      <td>
                        <span className="badge badge-success">Completed</span>
                      </td>
                      <td>{t.createdBy?.name}</td>
                      <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {t.lines?.map((line, idx) => (
                            <span key={idx} style={{ fontSize: "12.5px" }}>
                              {line.product?.sku}: <strong>{Number(line.qty)}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD WAREHOUSE ───────────────────────────────────────────── */}
      {showWhModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="glass-card" style={{ width: "400px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Register Warehouse</h3>
            <form onSubmit={handleCreateWh}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Warehouse Code (e.g. WH-B)</label>
                <input required type="text" value={whCode} onChange={e => setWhCode(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Warehouse Name</label>
                <input required type="text" value={whName} onChange={e => setWhName(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button type="button" onClick={() => setShowWhModal(false)} style={{ background: "none", color: "var(--text-primary)" }}>
                  Cancel
                </Button>
                <Button type="submit" style={{ background: "#FF540E" }}>
                  Save Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TRANSFER STOCK ─────────────────────────────────────────── */}
      {showTransferModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="glass-card" style={{ width: "550px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Transfer Warehouse Stock</h3>
            <form onSubmit={handleCreateTransfer}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Source Warehouse</label>
                  <select required value={transferSource} onChange={e => setTransferSource(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Destination Warehouse</label>
                  <select required value={transferDest} onChange={e => setTransferDest(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Transfer Items</label>
                {transferLines.map((line, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                    <select
                      required
                      value={line.productId}
                      onChange={e => {
                        const newLines = [...transferLines];
                        newLines[idx].productId = e.target.value;
                        setTransferLines(newLines);
                      }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={e => {
                        const newLines = [...transferLines];
                        newLines[idx].qty = e.target.value;
                        setTransferLines(newLines);
                      }}
                      style={{ width: "90px", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    />
                    {transferLines.length > 1 && (
                      <Button type="button" onClick={() => handleRemoveTransferLine(idx)} style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", padding: "8px" }}>
                        X
                      </Button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddTransferLine} style={{ background: "none", border: "none", color: "#FF540E", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
                  + Add Line
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600 }}>Notes</label>
                <input type="text" value={transferNotes} onChange={e => setTransferNotes(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button type="button" onClick={() => setShowTransferModal(false)} style={{ background: "none", color: "var(--text-primary)" }}>
                  Cancel
                </Button>
                <Button type="submit" style={{ background: "#FF540E" }}>
                  Confirm Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADJUST STOCK ───────────────────────────────────────────── */}
      {showAdjustmentModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="glass-card" style={{ width: "550px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Manual Stock Adjustment</h3>
            <form onSubmit={handleCreateAdjustment}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Select Warehouse</label>
                  <select required value={adjWarehouse} onChange={e => setAdjWarehouse(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Adjustment Reason</label>
                  <input required placeholder="e.g. Damage/Shrinkage" type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }} />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Adjust Items (Use negative qty to reduce)</label>
                {adjLines.map((line, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                    <select
                      required
                      value={line.productId}
                      onChange={e => {
                        const newLines = [...adjLines];
                        newLines[idx].productId = e.target.value;
                        setAdjLines(newLines);
                      }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      placeholder="Qty Change"
                      value={line.qty}
                      onChange={e => {
                        const newLines = [...adjLines];
                        newLines[idx].qty = e.target.value;
                        setAdjLines(newLines);
                      }}
                      style={{ width: "100px", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    />
                    {adjLines.length > 1 && (
                      <Button type="button" onClick={() => handleRemoveAdjLine(idx)} style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", padding: "8px" }}>
                        X
                      </Button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddAdjLine} style={{ background: "none", border: "none", color: "#FF540E", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
                  + Add Line
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button type="button" onClick={() => setShowAdjustmentModal(false)} style={{ background: "none", color: "var(--text-primary)" }}>
                  Cancel
                </Button>
                <Button type="submit" style={{ background: "#FF540E" }}>
                  Log Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryHubPage;
