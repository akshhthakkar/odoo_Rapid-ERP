import React from "react";
import {
  DollarSign,
  ShoppingCart,
  Layers,
  Activity,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const DashboardKPI = ({ financials }) => {
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const getHealthColor = (score) => {
    if (score >= 90) return "#10B981";
    if (score >= 70) return "#F59E0B";
    return "#EF4444";
  };

  const healthScore = financials?.healthScore || 100;
  const profitPositive = (financials?.profitEstimate || 0) >= 0;

  const kpis = [
    {
      title: "Delivered Revenue",
      value: formatCurrency(financials?.revenue),
      subtext: "Delivered sales orders",
      icon: DollarSign,
      trend: null,
    },
    {
      title: "Purchase Spend",
      value: formatCurrency(financials?.purchaseSpend),
      subtext: "Received vendor orders",
      icon: ShoppingCart,
      trend: null,
    },
    {
      title: "Profit Estimate",
      value: formatCurrency(financials?.profitEstimate),
      subtext: "Revenue minus Spend",
      icon: Activity,
      trend: profitPositive,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(financials?.inventoryValue),
      subtext: "On-hand stock valuation",
      icon: Layers,
      trend: null,
    },
    {
      title: "Business Health",
      value: `${healthScore}%`,
      subtext: "Deductions for delays & low stock",
      icon: Heart,
      trend: null,
      isHealth: true,
      healthScore,
      healthColor: getHealthColor(healthScore),
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "16px",
        width: "100%",
      }}
    >
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const gridColumn = idx < 3 ? "span 2" : "span 3";
        return (
          <div
            key={idx}
            style={{
              gridColumn,
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid rgba(255,84,14,0.12)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              position: "relative",
              overflow: "hidden",
              cursor: "default",
              transition: "transform 0.22s ease, box-shadow 0.22s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 10px 28px rgba(255,84,14,0.14)";
              e.currentTarget.style.borderColor = "rgba(255,84,14,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(255,84,14,0.12)";
            }}
          >
            {/* Top orange accent line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "18px",
                right: "18px",
                height: "2px",
                background: "linear-gradient(to right, transparent, #FF540E, transparent)",
                borderRadius: "0 0 2px 2px",
              }}
            />

            {/* Subtle orange tint orb */}
            <div
              style={{
                position: "absolute",
                top: "-30px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,84,14,0.06) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                  lineHeight: 1.3,
                  maxWidth: "80px",
                }}
              >
                {kpi.title}
              </span>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "rgba(255,84,14,0.08)",
                  border: "1px solid rgba(255,84,14,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={14} style={{ color: "#FF540E" }} />
              </div>
            </div>

            {/* Value */}
            <div>
              <div
                style={{
                  fontSize: "21px",
                  fontWeight: 900,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                {kpi.value}
              </div>

              {/* Health score bar */}
              {kpi.isHealth && (
                <div
                  style={{
                    marginTop: "8px",
                    height: "4px",
                    background: "rgba(255,84,14,0.1)",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${kpi.healthScore}%`,
                      height: "100%",
                      background: "linear-gradient(to right, #FF540E, #CC3300)",
                      borderRadius: "9999px",
                      transition: "width 0.6s ease-out",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Subtext */}
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              {kpi.trend !== null && kpi.trend !== undefined && (
                kpi.trend ? (
                  <ArrowUpRight size={11} style={{ color: "#FF540E" }} />
                ) : (
                  <ArrowDownRight size={11} style={{ color: "#FF540E" }} />
                )
              )}
              {kpi.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardKPI;
