import React from "react";
import { Boxes, LayoutGrid } from "lucide-react";

const WarehouseValueChart = ({ warehouseHeatMap = [] }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  // Calculate total value
  const totalValue = warehouseHeatMap.reduce((acc, w) => acc + Number(w.value || 0), 0) || 1;

  // Curated color themes for progress tracks
  const colors = [
    { fill: "linear-gradient(to right, #4F46E5, #6366F1)", border: "#4F46E5" }, // Indigo
    { fill: "linear-gradient(to right, #06B6D4, #0891B2)", border: "#06B6D4" }, // Cyan
    { fill: "linear-gradient(to right, #10B981, #059669)", border: "#10B981" }, // Emerald
    { fill: "linear-gradient(to right, #F59E0B, #D97706)", border: "#F59E0B" }  // Amber
  ];

  return (
    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h3 style={{
          fontSize: "14.5px",
          fontWeight: 700,
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Boxes size={16} style={{ color: "var(--accent)" }} />
          Inventory Distribution (Warehouse Valuation Allocation)
        </h3>
        <span style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          fontWeight: 600
        }}>
          Total: {formatCurrency(totalValue)}
        </span>
      </div>

      {warehouseHeatMap.length === 0 ? (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "var(--text-muted)",
          fontSize: "13px"
        }}>
          No warehouse inventory valuation details found.
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          flex: 1,
          justifyContent: "center"
        }}>
          {warehouseHeatMap.map((wh, idx) => {
            const percent = ((Number(wh.value || 0) / totalValue) * 100);
            const styleConfig = colors[idx % colors.length];

            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Labels row */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    Warehouse {wh.warehouseCode}
                  </span>
                  <div style={{ display: "flex", gap: "10px", fontWeight: 600 }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      {percent.toFixed(1)}%
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(wh.value)}
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div style={{
                  width: "100%",
                  height: "8px",
                  background: "var(--border)",
                  borderRadius: "9999px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: styleConfig.fill,
                    borderRadius: "9999px",
                    transition: "width 0.5s ease-out"
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WarehouseValueChart;
