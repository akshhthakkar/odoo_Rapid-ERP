import React from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  Layers, 
  TrendingUp, 
  Activity, 
  Heart, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

const DashboardKPI = ({ financials, morningBrief }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const getHealthColor = (score) => {
    if (score >= 90) return "var(--success)";
    if (score >= 70) return "#EAB308"; // Warning yellow
    return "var(--danger)";
  };

  const kpis = [
    {
      title: "Delivered Revenue",
      value: formatCurrency(financials?.revenue),
      subtext: "Delivered sales orders",
      icon: DollarSign,
      color: "var(--success)",
      bg: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.15)"
    },
    {
      title: "Purchase Spend",
      value: formatCurrency(financials?.purchaseSpend),
      subtext: "Received vendor orders",
      icon: ShoppingCart,
      color: "var(--danger)",
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.15)"
    },
    {
      title: "Profit Estimate",
      value: formatCurrency(financials?.profitEstimate),
      subtext: "Revenue minus Spend",
      icon: Activity,
      color: "var(--accent)",
      bg: "rgba(255, 84, 14, 0.08)",
      border: "rgba(255, 84, 14, 0.15)",
      isPositive: (financials?.profitEstimate || 0) >= 0
    },
    {
      title: "Inventory Value",
      value: formatCurrency(financials?.inventoryValue),
      subtext: "On-hand stock valuation",
      icon: Layers,
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.08)",
      border: "rgba(99, 102, 241, 0.15)"
    },
    {
      title: "Business Health Score",
      value: `${financials?.healthScore || 100}%`,
      subtext: "Deductions for delays & low stock",
      icon: Heart,
      color: getHealthColor(financials?.healthScore || 100),
      bg: `${getHealthColor(financials?.healthScore || 100)}15`,
      border: `${getHealthColor(financials?.healthScore || 100)}30`
    }
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      width: "100%"
    }}>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "12px",
              border: `1px solid ${kpi.border}`,
              background: "var(--bg-card)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {kpi.title}
                </span>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: kpi.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
              </div>

              <div style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.2
              }}>
                {kpi.value}
              </div>
            </div>

            <div style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "var(--text-muted)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              {kpi.isPositive !== undefined && (
                kpi.isPositive ? (
                  <ArrowUpRight size={12} style={{ color: "var(--success)" }} />
                ) : (
                  <ArrowDownRight size={12} style={{ color: "var(--danger)" }} />
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
