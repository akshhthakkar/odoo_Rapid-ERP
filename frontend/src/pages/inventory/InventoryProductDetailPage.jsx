import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductInventoryDetails } from "../../api/inventory.api.js";
import Button from "../../components/ui/Button";
import { ArrowLeft, TrendingUp, Layers, CheckCircle } from "lucide-react";
import Loader from "../../components/ui/Loader";

const InventoryProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ─── QUERY DATA ─────────────────────────────────────────────────────────────
  const { data: details, isLoading, error } = useQuery({
    queryKey: ["productInventoryDetails", id],
    queryFn: () => getProductInventoryDetails(id),
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading product details: {error.message}</div>;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate("/inventory")}
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
          marginBottom: "16px",
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Back to Inventory Hub
      </button>

      {/* Header Info */}
      <div className="glass-card" style={{ padding: "24px 32px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#FF540E", textTransform: "uppercase", letterSpacing: "0.5px" }}>{details.sku}</span>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{details.name}</h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "600px" }}>{details.description || "No description provided."}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Unit Cost</span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>{formatCurrency(details.cost)}</div>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {[
          { title: "Current Stock", value: `${details.onHand} Units`, color: "var(--text-primary)", icon: Layers },
          { title: "Reserved Stock", value: `${details.reserved} Units`, color: "var(--accent)", icon: CheckCircle },
          { title: "Free To Use", value: `${details.freeToUse} Units`, color: "#10B981", icon: CheckCircle },
          { title: "Total Valuation", value: formatCurrency(details.valuation), color: "#FF540E", icon: TrendingUp },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{card.title}</span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Reorder settings */}
      <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>⚙️ Reorder Settings</h3>
        <div style={{ display: "flex", gap: "32px", fontSize: "13.5px" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Reorder Level:</span>
            <strong style={{ marginLeft: "6px", color: "var(--text-primary)" }}>{details.reorderLevel} Units</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Preferred Stock Balance:</span>
            <strong style={{ marginLeft: "6px", color: "var(--text-primary)" }}>{details.preferredStock} Units</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Current Alert Status:</span>
            {details.freeToUse < details.reorderLevel ? (
              <span className="badge badge-warning" style={{ marginLeft: "8px" }}>Low Stock Alert</span>
            ) : (
              <span className="badge badge-success" style={{ marginLeft: "8px" }}>Optimal</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Warehouse Breakdown & Movements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        {/* Warehouse breakdown */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>🏢 Warehouse Stock Levels</h3>
          {details.breakdown?.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>No warehouse balance logs generated yet.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Warehouse</th>
                  <th>On Hand</th>
                </tr>
              </thead>
              <tbody>
                {details.breakdown.map((b, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "#FF540E" }}>{b.warehouseCode}</td>
                    <td>{b.warehouseName}</td>
                    <td style={{ fontWeight: 600 }}>{b.onHandQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Movements */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>📋 Last 20 Stock Movements</h3>
          {details.movements?.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No inventory movements logged for this product.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Warehouse</th>
                    <th>Movement Type</th>
                    <th>Quantity</th>
                    <th>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {details.movements.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{m.reason || "Adjustment"}</td>
                      <td>{m.warehouseName}</td>
                      <td>
                        <span style={{ fontSize: "11px", fontWeight: 500 }}>
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
      </div>
    </div>
  );
};

export default InventoryProductDetailPage;
