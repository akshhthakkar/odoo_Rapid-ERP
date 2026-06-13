import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { getDashboard } from "../../api/analytics.api";
import Loader from "../../components/ui/Loader";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  DollarSign,
  ShoppingCart,
  Users,
  Settings,
} from "lucide-react";

const AnalyticsDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Role redirect guard
  useEffect(() => {
    if (user?.role === "SALES_USER") navigate("/analytics/sales");
    else if (user?.role === "PURCHASE_USER") navigate("/analytics/purchase");
    else if (user?.role === "MANUFACTURING_USER") navigate("/analytics/manufacturing");
    else if (user?.role === "INVENTORY_MANAGER") navigate("/analytics/inventory");
  }, [user, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["executiveDashboard"],
    queryFn: getDashboard,
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading executive analytics: {error.message}</div>;

  const cardList = [
    {
      title: "Delivered Revenue",
      value: formatCurrency(data.revenue),
      trend: data.revenueTrend,
      icon: DollarSign,
      color: "var(--success)",
      path: "/analytics/sales",
    },
    {
      title: "Purchase Spend",
      value: formatCurrency(data.purchaseSpend),
      trend: data.spendTrend,
      icon: ShoppingCart,
      color: "var(--danger)",
      path: "/analytics/purchase",
    },
    {
      title: "Inventory Value",
      value: formatCurrency(data.inventoryValue),
      trend: null,
      icon: Layers,
      color: "#FF540E",
      path: "/analytics/inventory",
    },
    {
      title: "Sales Orders",
      value: `${data.salesOrders} Orders`,
      trend: null,
      icon: FileText,
      color: "var(--accent)",
      path: "/sales",
    },
    {
      title: "Purchase Orders",
      value: `${data.purchaseOrders} Orders`,
      trend: null,
      icon: FileText,
      color: "#A855F7",
      path: "/purchase",
    },
    {
      title: "Manufacturing Orders",
      value: `${data.manufacturingOrders} MOs`,
      trend: null,
      icon: Settings,
      color: "#10B981",
      path: "/manufacturing",
    },
    {
      title: "Active Products",
      value: `${data.activeProducts} Items`,
      trend: null,
      icon: Layers,
      color: "#6366F1",
      path: "/products",
    },
    {
      title: "Registered Contacts",
      value: `${data.customers} Customers / ${data.vendors} Vendors`,
      trend: null,
      icon: Users,
      color: "#EC4899",
      path: "/dashboard",
    },
  ];

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
          Executive Intelligence Hub
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
          Real-time enterprise metrics and performance indicators across all operations.
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        {cardList.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="glass-card"
              onClick={() => navigate(card.path)}
              style={{
                padding: "24px",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {card.title}
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} style={{ color: card.color }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {card.value}
                </div>
                {card.trend !== null && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: card.trend >= 0 ? "var(--success)" : "var(--danger)",
                      background: card.trend >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {card.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {card.trend >= 0 ? "+" : ""}
                    {card.trend}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overview Charts Section / Future Planning info */}
      <div className="glass-card" style={{ padding: "24px 32px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
          Enterprise Reporting Options
        </h3>
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Select specific departments in the sidebar to view detailed analytics. Navigate to the <strong>Reports</strong> tab to configure custom exports as PDF documents, binary Excel workbooks, or CSV lists.
        </p>
        <div
          style={{
            marginTop: "16px",
            fontSize: "12px",
            color: "var(--accent)",
            fontWeight: 600,
            display: "inline-block",
            padding: "4px 10px",
            background: "rgba(255, 84, 14, 0.1)",
            borderRadius: "6px",
            border: "1px solid rgba(255, 84, 14, 0.2)",
          }}
        >
          Future Scalability: Cache integration with Redis (Phase 8.5) scheduled for high-load analytics stability.
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
