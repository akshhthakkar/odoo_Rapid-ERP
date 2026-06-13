import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { getExecutiveDashboard } from "../../api/dashboard.api";
import Loader from "../../components/ui/Loader";

// Import custom dashboard panels
import DashboardKPI from "../../components/dashboard/DashboardKPI";
import ActionCenter from "../../components/dashboard/ActionCenter";
import AlertPanel from "../../components/dashboard/AlertPanel";
import RecentActivityPanel from "../../components/dashboard/RecentActivityPanel";
import RevenueSpendChart from "../../components/dashboard/RevenueSpendChart";
import WarehouseValueChart from "../../components/dashboard/WarehouseValueChart";

import { 
  BarChart3, 
  Calendar, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Factory,
  BadgeDollarSign
} from "lucide-react";

const ExecutiveDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Role redirect guard: only ADMIN and BUSINESS_OWNER see the executive dashboard.
  // Others redirect to department-specific analytics.
  useEffect(() => {
    if (user && user.role !== "ADMIN" && user.role !== "BUSINESS_OWNER") {
      if (user.role === "SALES_USER") navigate("/analytics/sales");
      else if (user.role === "PURCHASE_USER") navigate("/analytics/purchase");
      else if (user.role === "MANUFACTURING_USER") navigate("/analytics/manufacturing");
      else if (user.role === "INVENTORY_MANAGER") navigate("/analytics/inventory");
      else navigate("/unauthorized");
    }
  }, [user, navigate]);

  // Compute startDate & endDate params based on selected range preset
  const getParams = () => {
    if (range === "custom") {
      return { startDate: customStart, endDate: customEnd };
    }
    const end = new Date();
    const start = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    start.setDate(end.getDate() - days);
    
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0]
    };
  };

  const queryParams = getParams();

  // Load dashboard data with React Query
  // Automatically refetches every 60s when the window has active focus
  const { data, isLoading, error } = useQuery({
    queryKey: ["executiveDashboardData", queryParams.startDate, queryParams.endDate],
    queryFn: () => getExecutiveDashboard(queryParams),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    enabled: !!user && (user.role === "ADMIN" || user.role === "BUSINESS_OWNER")
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  
  if (error) {
    return (
      <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>
        <h3>Error Loading Dashboard</h3>
        <p>{error.message || "An unexpected error occurred."}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)", display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* Header and Controls */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid var(--border)"
      }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <BarChart3 size={24} style={{ color: "var(--accent)" }} />
            Executive Command Center
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time operational monitoring & business intelligence controls.
          </p>
        </div>

        {/* Date Filter Toolbar */}
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>PRESET RANGE</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {range === "custom" && (
            <>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>START</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "13px"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 700 }}>END</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "13px"
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Morning Brief Card & Smart Insights */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "20px",
        alignItems: "stretch"
      }}>
        {/* Morning Brief */}
        <div className="glass-card" style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, #1E1B4B 0%, #311005 100%)",
          color: "#FFFFFF",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>
              {data.morningBrief?.greeting}
            </h3>
            <p style={{ fontSize: "12.5px", color: "#E0E7FF", lineHeight: 1.5 }}>
              Here is your executive operational updates summary.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
              <span style={{ color: "#C7D2FE" }}>Revenue Logged Today:</span>
              <span style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(data.morningBrief?.revenueToday)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
              <span style={{ color: "#C7D2FE" }}>Pending Deliveries:</span>
              <span style={{ fontWeight: 700 }}>{data.morningBrief?.pendingDeliveriesCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
              <span style={{ color: "#C7D2FE" }}>Delayed MOs:</span>
              <span style={{ fontWeight: 700, color: "var(--danger)" }}>{data.morningBrief?.delayedMOsCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#C7D2FE" }}>Low Stock Alerts:</span>
              <span style={{ fontWeight: 700, color: "#FBBF24" }}>{data.morningBrief?.lowStockCount}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/audit")}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
          >
            Review System Audit Trail
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Smart Insights */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              Period-Over-Period Smart Insights
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.insights?.map((insight, idx) => (
                <div key={idx} style={{ 
                  fontSize: "13px", 
                  color: "var(--text-secondary)", 
                  padding: "10px 14px", 
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  borderLeft: "3px solid var(--accent)"
                }}>
                  {insight}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px" }}>
            * Analytics are derived by comparing the current date range against the prior matching window.
          </div>
        </div>
      </div>

      {/* Financial KPIs Row */}
      <DashboardKPI financials={data.financials} />

      {/* Charts Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px"
      }}>
        <RevenueSpendChart trend={data.revenueSpendTrend} />
        <WarehouseValueChart warehouseHeatMap={data.inventory?.warehouseHeatMap} />
      </div>

      {/* Today's Inventory Ledger Summary Card */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Boxes size={18} style={{ color: "var(--accent)" }} />
          Today's Stock Ledger Activity Summary
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          <div style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.1)", padding: "14px 16px", borderRadius: "10px" }}>
            <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PURCHASES INWARD</span>
            <h4 style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px", color: "#3B82F6" }}>
              +{data.inventory?.todaySummary?.purchases || 0} units
            </h4>
          </div>
          <div style={{ background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.1)", padding: "14px 16px", borderRadius: "10px" }}>
            <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>SALES OUTWARD</span>
            <h4 style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px", color: "#F97316" }}>
              -{data.inventory?.todaySummary?.sales || 0} units
            </h4>
          </div>
          <div style={{ background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.1)", padding: "14px 16px", borderRadius: "10px" }}>
            <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PRODUCTION PRODUCED</span>
            <h4 style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px", color: "#A855F7" }}>
              +{data.inventory?.todaySummary?.production || 0} units
            </h4>
          </div>
          <div style={{ background: "rgba(236,72,153,0.03)", border: "1px solid rgba(236,72,153,0.1)", padding: "14px 16px", borderRadius: "10px" }}>
            <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>COMPONENTS CONSUMED</span>
            <h4 style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px", color: "#EC4899" }}>
              -{data.inventory?.todaySummary?.consumption || 0} units
            </h4>
          </div>
        </div>
      </div>

      {/* Command Centers Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px"
      }}>
        {/* Sales Command Center */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BadgeDollarSign size={16} style={{ color: "var(--success)" }} />
            Sales Control Panel
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>New Orders Today</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.sales?.salesOrdersToday}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Pending Deliveries</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.sales?.pendingDeliveries}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Partially Delivered</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#F59E0B" }}>{data.sales?.partiallyDelivered}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Cancelled (Period)</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--danger)" }}>{data.sales?.cancelledOrders}</span>
            </div>
            <button 
              onClick={() => navigate("/sales")}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "8px"
              }}
            >
              Go to Sales
            </button>
          </div>
        </div>

        {/* Procurement Command Center */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ShoppingCart size={16} style={{ color: "#6366F1" }} />
            Procurement Panel
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Open Purchase Orders</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.purchasing?.openPOs}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Partial Receipts</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#F59E0B" }}>{data.purchasing?.partialReceipts}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Delayed Receipts</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--danger)" }}>{data.purchasing?.delayedPOs}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Pending Replenishments</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.purchasing?.pendingReplenishments}</span>
            </div>
            <button 
              onClick={() => navigate("/purchase")}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "8px"
              }}
            >
              Go to Procurement
            </button>
          </div>
        </div>

        {/* Manufacturing Command Center */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Factory size={16} style={{ color: "var(--accent)" }} />
            Manufacturing Panel
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Active Production orders</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.manufacturing?.activeMOs}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Completed MOs</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--success)" }}>{data.manufacturing?.completedMOs}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Delayed Production orders</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--danger)" }}>{data.manufacturing?.delayedMOs}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Work Orders In Progress</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{data.manufacturing?.workOrdersInProgress}</span>
            </div>
            <button 
              onClick={() => navigate("/manufacturing")}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "8px"
              }}
            >
              Go to Manufacturing
            </button>
          </div>
        </div>
      </div>

      {/* Action Center Widget */}
      <ActionCenter 
        sales={data.sales} 
        purchasing={data.purchasing} 
        manufacturing={data.manufacturing} 
        inventory={data.inventory} 
      />

      {/* Top Performers Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px"
      }}>
        {/* Top Products */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>Top Selling Products</h3>
          {data.topProducts?.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>No product sales logged.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.topProducts?.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.product}</span>
                  <div style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>{item.qty} units</span>
                    <span style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>Top Customers</h3>
          {data.topCustomers?.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>No customer transactions.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.topCustomers?.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.customer}</span>
                  <div style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>{item.orders} orders</span>
                    <span style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>Top Procurement Vendors</h3>
          {data.topVendors?.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>No vendor procurement spend.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.topVendors?.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.vendor}</span>
                  <div style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>{item.poCount} POs</span>
                    <span style={{ fontWeight: 700, color: "var(--danger)" }}>{formatCurrency(item.spend)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts and Activity Logs Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        marginBottom: "20px"
      }}>
        <AlertPanel alerts={data.alerts} />
        <RecentActivityPanel recentActivity={data.recentActivity} />
      </div>

    </div>
  );
};

export default ExecutiveDashboardPage;
