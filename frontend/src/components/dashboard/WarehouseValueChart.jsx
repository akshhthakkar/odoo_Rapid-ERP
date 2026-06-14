import React from "react";
import { Warehouse } from "lucide-react";

// Orange-family gradient palette for multiple warehouses
const PALETTE = [
  { fill: "linear-gradient(90deg, #FF540E, #FF8C42)", color: "#FF540E", glow: "rgba(255,84,14,0.35)" },
  { fill: "linear-gradient(90deg, #CC3300, #FF540E)", color: "#CC3300", glow: "rgba(204,51,0,0.30)" },
  { fill: "linear-gradient(90deg, #FF8C42, #FFB347)", color: "#FF8C42", glow: "rgba(255,140,66,0.30)" },
  { fill: "linear-gradient(90deg, #E04300, #FF6B2B)", color: "#E04300", glow: "rgba(224,67,0,0.30)" },
];

const WarehouseValueChart = ({ warehouseHeatMap = [] }) => {
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const totalValue = warehouseHeatMap.reduce((acc, w) => acc + Number(w.value || 0), 0) || 1;

  return (
    <div
      className="glass-card"
      style={{ padding: "24px", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "rgba(255,84,14,0.08)",
              border: "1px solid rgba(255,84,14,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Warehouse size={15} style={{ color: "#FF540E" }} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "13.5px",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Inventory Distribution
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
              Warehouse valuation allocation
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Total
          </div>
          <div
            style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}
          >
            {formatCurrency(totalValue)}
          </div>
        </div>
      </div>

      {/* Content */}
      {warehouseHeatMap.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          No warehouse inventory valuation details found.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {warehouseHeatMap.map((wh, idx) => {
            const percent = (Number(wh.value || 0) / totalValue) * 100;
            const palette = PALETTE[idx % PALETTE.length];

            return (
              <div key={idx}>
                {/* Labels */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: "7px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "2px",
                        background: palette.fill,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      Warehouse {wh.warehouseCode}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {percent.toFixed(1)}%
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: palette.color,
                      }}
                    >
                      {formatCurrency(wh.value)}
                    </span>
                  </div>
                </div>

                {/* Track */}
                <div
                  style={{
                    width: "100%",
                    height: "7px",
                    background: "rgba(255,84,14,0.08)",
                    borderRadius: "9999px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,84,14,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      background: palette.fill,
                      borderRadius: "9999px",
                      boxShadow: `0 0 8px ${palette.glow}`,
                      transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Stacked mini bar summary */}
          {warehouseHeatMap.length > 1 && (
            <div
              style={{
                marginTop: "6px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: "6px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  borderRadius: "9999px",
                  overflow: "hidden",
                  display: "flex",
                  background: "rgba(255,84,14,0.08)",
                }}
              >
                {warehouseHeatMap.map((wh, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${(Number(wh.value || 0) / totalValue) * 100}%`,
                      height: "100%",
                      background: PALETTE[idx % PALETTE.length].fill,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {warehouseHeatMap.length} warehouses
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WarehouseValueChart;
