import React from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";

const RevenueSpendChart = ({ trend = [] }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  // Compute maximum value for scaling
  const maxVal = trend.reduce((acc, t) => {
    return Math.max(acc, Number(t.revenue || 0), Number(t.spend || 0));
  }, 0) || 1;

  return (
    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header & Legend */}
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
          <DollarSign size={16} style={{ color: "var(--accent)" }} />
          Money In vs. Money Out (Revenue & Spend Trend)
        </h3>

        {/* Legend */}
        <div style={{ display: "flex", gap: "16px", fontSize: "11px", fontWeight: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)" }} />
            <span style={{ color: "var(--text-muted)" }}>Revenue</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--danger)" }} />
            <span style={{ color: "var(--text-muted)" }}>Spend</span>
          </div>
        </div>
      </div>

      {/* Chart visualization */}
      {trend.length === 0 ? (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "var(--text-muted)",
          fontSize: "13px"
        }}>
          No transaction history recorded in this period.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Main Bar Columns Area */}
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            height: "220px",
            gap: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
            justifyContent: "space-around"
          }}>
            {trend.map((t, idx) => {
              const revPercent = (Number(t.revenue || 0) / maxVal) * 100;
              const spendPercent = (Number(t.spend || 0) / maxVal) * 100;

              return (
                <div key={idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  flex: 1,
                  maxWidth: "80px"
                }}>
                  {/* Two adjacent bars */}
                  <div style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "4px",
                    height: "100%",
                    width: "100%",
                    justifyContent: "center"
                  }}>
                    {/* Revenue Bar */}
                    <div
                      style={{
                        width: "14px",
                        height: `${Math.max(4, revPercent)}%`,
                        background: "linear-gradient(to top, rgba(16,185,129,0.2) 0%, var(--success) 100%)",
                        borderRadius: "2px 2px 0 0",
                        transition: "all 0.3s ease",
                        position: "relative"
                      }}
                      title={`Revenue: ${formatCurrency(t.revenue)}`}
                    />

                    {/* Spend Bar */}
                    <div
                      style={{
                        width: "14px",
                        height: `${Math.max(4, spendPercent)}%`,
                        background: "linear-gradient(to top, rgba(239,68,68,0.2) 0%, var(--danger) 100%)",
                        borderRadius: "2px 2px 0 0",
                        transition: "all 0.3s ease",
                        position: "relative"
                      }}
                      title={`Spend: ${formatCurrency(t.spend)}`}
                    />
                  </div>

                  {/* Month Label */}
                  <span style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "8px",
                    fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {t.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Prompt/Info */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "12px",
            fontSize: "11px",
            color: "var(--text-muted)"
          }}>
            <span>* Values represent delivered transactions in date range</span>
            <span>Hover on bars to view details</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueSpendChart;
