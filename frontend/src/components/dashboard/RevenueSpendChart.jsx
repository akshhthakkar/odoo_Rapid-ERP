import React, { useState } from "react";
import { TrendingUp } from "lucide-react";

const RevenueSpendChart = ({ trend = [] }) => {
  const [hovered, setHovered] = useState(null);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const maxVal = trend.reduce((acc, t) => Math.max(acc, Number(t.revenue || 0), Number(t.spend || 0)), 0) || 1;

  return (
    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "rgba(255,84,14,0.1)",
              border: "1px solid rgba(255,84,14,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={15} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Revenue vs. Spend
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
              Monthly money-in vs. money-out trend
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "14px", fontSize: "11px", fontWeight: 600, alignSelf: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#10B981" }} />
            <span style={{ color: "var(--text-muted)" }}>Revenue</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#EF4444" }} />
            <span style={{ color: "var(--text-muted)" }}>Spend</span>
          </div>
        </div>
      </div>

      {trend.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "220px",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          No transaction history in this period.
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {/* Y-axis labels + bars */}
          <div style={{ display: "flex", height: "200px", gap: "0" }}>
            {/* Y-axis */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingRight: "8px",
                paddingBottom: "20px",
              }}
            >
              {[100, 75, 50, 25, 0].map((pct) => (
                <span key={pct} style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>
                  {pct === 0 ? "0" : `${Math.round((maxVal * pct) / 100 / 1000)}K`}
                </span>
              ))}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, position: "relative" }}>
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `calc(20px + ${pct}% * 0.82)`,
                    height: "1px",
                    background: "var(--border)",
                    opacity: 0.6,
                  }}
                />
              ))}

              {/* Bars */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  height: "100%",
                  paddingBottom: "20px",
                  justifyContent: "space-around",
                  gap: "4px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {trend.map((t, idx) => {
                  const revPct = Math.max(3, (Number(t.revenue || 0) / maxVal) * 100);
                  const spendPct = Math.max(3, (Number(t.spend || 0) / maxVal) * 100);
                  const isHovered = hovered === idx;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        flex: 1,
                        maxWidth: "56px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHovered(idx)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 4px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#1F2937",
                            color: "#fff",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            zIndex: 10,
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ color: "#34D399" }}>Rev: {formatCurrency(t.revenue)}</div>
                          <div style={{ color: "#F87171" }}>Spend: {formatCurrency(t.spend)}</div>
                        </div>
                      )}

                      {/* Bars row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          gap: "3px",
                          height: "100%",
                          width: "100%",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {/* Revenue bar */}
                        <div
                          style={{
                            width: "14px",
                            height: `${revPct}%`,
                            background: isHovered
                              ? "linear-gradient(to top, #059669, #34D399)"
                              : "linear-gradient(to top, rgba(16,185,129,0.4), #10B981)",
                            borderRadius: "3px 3px 0 0",
                            transition: "all 0.25s ease",
                          }}
                        />
                        {/* Spend bar */}
                        <div
                          style={{
                            width: "14px",
                            height: `${spendPct}%`,
                            background: isHovered
                              ? "linear-gradient(to top, #B91C1C, #F87171)"
                              : "linear-gradient(to top, rgba(239,68,68,0.4), #EF4444)",
                            borderRadius: "3px 3px 0 0",
                            transition: "all 0.25s ease",
                          }}
                        />
                      </div>

                      {/* Label */}
                      <span
                        style={{
                          fontSize: "10px",
                          color: isHovered ? "var(--accent)" : "var(--text-muted)",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          transition: "color 0.2s",
                        }}
                      >
                        {t.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "10px" }}>
            * Delivered transactions in selected date range. Hover bars for details.
          </p>
        </div>
      )}
    </div>
  );
};

export default RevenueSpendChart;
