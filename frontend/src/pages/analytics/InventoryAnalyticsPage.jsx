import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getInventoryAnalytics } from "../../api/analytics.api";
import { DollarSign, Layers, AlertTriangle, HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/ui/Loader";

const InventoryAnalyticsPage = () => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventoryAnalytics"],
    queryFn: getInventoryAnalytics,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading inventory analytics: {error.message}</div>;

  const { kpis, warehouseValuation, aging, lowStockProducts, outOfStockProducts } = data;

  // Compute Total Aging Units to calculate percentages
  const totalAgingUnits = aging.reduce((s, a) => s + a.qty, 0) || 1;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/analytics")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-muted)",
            cursor: "pointer",
            marginBottom: "8px",
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
          Inventory Valuation & Stock Analytics
        </h2>
      </div>

      {/* KPI summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {[
          { label: "Grand Inventory Value", value: formatCurrency(kpis.totalValue), icon: DollarSign, color: "var(--success)" },
          { label: "Total Hand Qty", value: `${kpis.totalUnits} Units`, icon: Layers, color: "var(--text-primary)" },
          { label: "Reserved Stock", value: `${kpis.reservedStock} Units`, icon: HelpCircle, color: "var(--accent)" },
          { label: "Available Stock", value: `${kpis.availableStock} Units`, icon: Layers, color: "#10B981" },
          { label: "Low Stock Products", value: `${kpis.lowStockProductsCount} items`, icon: AlertTriangle, color: "#F59E0B" },
          { label: "Out of Stock Products", value: `${kpis.outOfStockProductsCount} items`, icon: AlertTriangle, color: "var(--danger)" },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{kpi.label}</span>
                <Icon size={14} style={{ color: kpi.color }} />
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Aging & Warehouse Value Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
        {/* Aging Distribution */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Approximate Inventory Age (Last Inbound Stock Date)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {aging.map((age, idx) => {
              const percentage = (age.qty / totalAgingUnits) * 100;
              return (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{age.bucket}</span>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{age.qty} Units ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percentage}%`,
                        background: "linear-gradient(to right, rgba(255,84,14,0.4) 0%, #FF540E 100%)",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warehouse Valuation */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Warehouse Value & Stock Count
          </h3>
          {warehouseValuation.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No warehouse balances found.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Stock Quantity</th>
                  <th>Inventory Value</th>
                </tr>
              </thead>
              <tbody>
                {warehouseValuation.map((wh, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wh.warehouse}</td>
                    <td>{wh.qty} Units</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(wh.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alerts lists grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Low Stock Alerts */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Low Stock Alert Details (Top 10)
          </h3>
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13.5px" }}>No low stock alerts. All items optimal.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>On Hand</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                    <td style={{ color: "#FF540E", fontWeight: 700 }}>{p.sku}</td>
                    <td>{p.onHand}</td>
                    <td style={{ fontWeight: 600 }}>{p.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Out Of Stock Alerts */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Out of Stock Products (Top 10)
          </h3>
          {outOfStockProducts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13.5px" }}>No products currently out of stock.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                    <td style={{ color: "var(--danger)", fontWeight: 700 }}>{p.sku}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalyticsPage;
