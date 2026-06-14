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
  Sparkles,
  ArrowRight,
  Boxes,
  ShoppingCart,
  Factory,
  BadgeDollarSign,
  RefreshCw,
  CalendarDays,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

const RANGE_OPTIONS = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "Custom", value: "custom" },
];

const ExecutiveDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (user && user.role !== "ADMIN" && user.role !== "BUSINESS_OWNER") {
      if (user.role === "SALES_USER") navigate("/analytics/sales");
      else if (user.role === "PURCHASE_USER") navigate("/analytics/purchase");
      else if (user.role === "MANUFACTURING_USER") navigate("/analytics/manufacturing");
      else if (user.role === "INVENTORY_MANAGER") navigate("/analytics/inventory");
      else navigate("/unauthorized");
    }
  }, [user, navigate]);

  const getParams = () => {
    if (range === "custom") return { startDate: customStart, endDate: customEnd };
    const end = new Date();
    const start = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    start.setDate(end.getDate() - days);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const queryParams = getParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["executiveDashboardData", queryParams.startDate, queryParams.endDate],
    queryFn: () => getExecutiveDashboard(queryParams),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    enabled: !!user && (user.role === "ADMIN" || user.role === "BUSINESS_OWNER"),
  });

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

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

  const greeting = data.morningBrief?.greeting || `Good morning, ${user?.name}`;

  return (
    <div
      className="animate-fade-in"
      style={{ fontFamily: "var(--font-family)", display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #FF540E, #CC3300)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(255,84,14,0.35)",
              }}
            >
              <BarChart3 size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {data?.companyName || "Executive Command Center"}
            </h1>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "46px" }}>
            Real-time operational intelligence · Auto-refresh every 60s
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Pill-style range switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "3px",
              gap: "2px",
            }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  background: range === opt.value ? "linear-gradient(135deg, #FF540E, #CC3300)" : "transparent",
                  color: range === opt.value ? "#fff" : "var(--text-muted)",
                  boxShadow: range === opt.value ? "0 2px 8px rgba(255,84,14,0.3)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          <button
            onClick={() => refetch()}
            title="Refresh data"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "inherit"; }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── TOP ROW: Morning Brief + Smart Insights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "stretch" }}>
        {/* Morning Brief */}
        <div
          style={{
            borderRadius: "16px",
            background: "#FF540E",
            color: "#fff",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(255,84,14,0.3)",
          }}
        >
          {/* decorative orbs */}
          <div style={{ position: "absolute", width: "180px", height: "180px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)", top: "-60px", right: "-50px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: "120px", height: "120px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,200,100,0.15) 0%, transparent 70%)", bottom: "10px", left: "-20px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)", bottom: "60px", right: "20px", pointerEvents: "none" }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "8px" }}>
              EXECUTIVE BRIEF
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "6px", lineHeight: 1.25 }}>{greeting}</h3>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Here is your real-time operational summary.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0px", margin: "20px 0", position: "relative" }}>
            {[
              { label: "Revenue Today", value: formatCurrency(data.morningBrief?.revenueToday), color: "#86EFAC" },
              { label: "Pending Deliveries", value: data.morningBrief?.pendingDeliveriesCount, color: "rgba(255,255,255,0.9)" },
              { label: "Delayed MOs", value: data.morningBrief?.delayedMOsCount, color: "#FCA5A5" },
              { label: "Low Stock Alerts", value: data.morningBrief?.lowStockCount, color: "#FED7AA" },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}>{row.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/audit")}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontFamily: "inherit",
              transition: "all 0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
          >
            Review System Audit Trail <ArrowRight size={13} />
          </button>
        </div>

        {/* Smart Insights */}
        <div
          className="glass-card"
          style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, rgba(255,84,14,0.15), rgba(255,84,14,0.05))",
                border: "1px solid rgba(255,84,14,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={15} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Period-Over-Period Smart Insights
              </h3>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>AI-derived business observations</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
            {data.insights?.map((insight, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 14px",
                  background: "var(--bg-primary)",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,84,14,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    marginTop: "6px",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>{insight}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "10.5px", color: "var(--text-muted)", margin: 0 }}>
            * Derived by comparing current range against the prior matching window.
          </p>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <DashboardKPI financials={data.financials} />

      {/* ── CHARTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <RevenueSpendChart trend={data.revenueSpendTrend} />
        <WarehouseValueChart warehouseHeatMap={data.inventory?.warehouseHeatMap} />
      </div>

      {/* ── TODAY'S LEDGER ── */}
      <div
        className="glass-card"
        style={{ padding: "24px 28px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
            <Boxes size={15} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Today's Stock Ledger Activity
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Live unit movements across all warehouses</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          {[
            { label: "Purchases Inward", value: `+${data.inventory?.todaySummary?.purchases || 0}`, unit: "units", color: "#FF540E", bg: "rgba(255,84,14,0.06)", border: "rgba(255,84,14,0.15)", grad: "rgba(255,84,14,0.9)" },
            { label: "Sales Outward", value: `-${data.inventory?.todaySummary?.sales || 0}`, unit: "units", color: "#CC3300", bg: "rgba(204,51,0,0.06)", border: "rgba(204,51,0,0.15)", grad: "rgba(204,51,0,0.9)" },
            { label: "Production Output", value: `+${data.inventory?.todaySummary?.production || 0}`, unit: "units", color: "#E04300", bg: "rgba(224,67,0,0.06)", border: "rgba(224,67,0,0.15)", grad: "rgba(224,67,0,0.9)" },
            { label: "Components Used", value: `-${data.inventory?.todaySummary?.consumption || 0}`, unit: "units", color: "#FF8C42", bg: "rgba(255,140,66,0.06)", border: "rgba(255,140,66,0.15)", grad: "rgba(255,140,66,0.9)" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: "16px 18px",
                borderRadius: "12px",
                background: item.bg,
                border: `1px solid ${item.border}`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(to right, transparent, ${item.grad}, transparent)` }} />
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: item.color, letterSpacing: "-0.5px" }}>
                {item.value}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMMAND CENTERS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px" }}>
        {[
          {
            title: "Sales Control",
            icon: BadgeDollarSign,
            iconColor: "#FF540E",
            iconBg: "rgba(255,84,14,0.08)",
            path: "/sales",
            rows: [
              { label: "New Orders Today", value: data.sales?.salesOrdersToday, color: "var(--text-primary)" },
              { label: "Pending Deliveries", value: data.sales?.pendingDeliveries, color: "var(--text-primary)" },
              { label: "Partially Delivered", value: data.sales?.partiallyDelivered, color: "#FF8C42" },
              { label: "Cancelled (Period)", value: data.sales?.cancelledOrders, color: "#CC3300" },
            ],
            btnLabel: "Go to Sales",
          },
          {
            title: "Procurement",
            icon: ShoppingCart,
            iconColor: "#FF540E",
            iconBg: "rgba(255,84,14,0.08)",
            path: "/purchase",
            rows: [
              { label: "Open Purchase Orders", value: data.purchasing?.openPOs, color: "var(--text-primary)" },
              { label: "Partial Receipts", value: data.purchasing?.partialReceipts, color: "#FF8C42" },
              { label: "Delayed Receipts", value: data.purchasing?.delayedPOs, color: "#CC3300" },
              { label: "Pending Replenishments", value: data.purchasing?.pendingReplenishments, color: "var(--text-primary)" },
            ],
            btnLabel: "Go to Procurement",
          },
          {
            title: "Manufacturing",
            icon: Factory,
            iconColor: "#FF540E",
            iconBg: "rgba(255,84,14,0.08)",
            path: "/manufacturing",
            rows: [
              { label: "Active Production Orders", value: data.manufacturing?.activeMOs, color: "var(--text-primary)" },
              { label: "Completed MOs", value: data.manufacturing?.completedMOs, color: "#FF540E" },
              { label: "Delayed MOs", value: data.manufacturing?.delayedMOs, color: "#CC3300" },
              { label: "Work Orders In Progress", value: data.manufacturing?.workOrdersInProgress, color: "var(--text-primary)" },
            ],
            btnLabel: "Go to Manufacturing",
          },
        ].map((panel, pi) => {
          const Icon = panel.icon;
          return (
            <div
              key={pi}
              className="glass-card"
              style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "0" }}
            >
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "9px",
                    background: panel.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={15} style={{ color: panel.iconColor }} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{panel.title}</span>
              </div>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0", flex: 1 }}>
                {panel.rows.map((row, ri) => (
                  <div
                    key={ri}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 0",
                      borderBottom: ri < panel.rows.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>{row.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: row.color }}>{row.value ?? "—"}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate(panel.path)}
                style={{
                  marginTop: "14px",
                  width: "100%",
                  padding: "9px",
                  borderRadius: "9px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {panel.btnLabel} <ChevronRight size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── ACTION CENTER ── */}
      <ActionCenter
        sales={data.sales}
        purchasing={data.purchasing}
        manufacturing={data.manufacturing}
        inventory={data.inventory}
      />

      {/* ── TOP PERFORMERS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px" }}>
        {[
          {
            title: "Top Selling Products",
            icon: TrendingUp,
            iconColor: "#FF540E",
            emptyMsg: "No product sales logged.",
            items: data.topProducts?.slice(0, 4).map((item) => ({
              primary: item.product,
              secondary: `${item.qty} units`,
              value: formatCurrency(item.revenue),
              valueColor: "#10B981",  // green = profit/income
            })),
          },
          {
            title: "Top Customers",
            icon: BadgeDollarSign,
            iconColor: "#FF540E",
            emptyMsg: "No customer transactions.",
            items: data.topCustomers?.slice(0, 4).map((item) => ({
              primary: item.customer,
              secondary: `${item.orders} orders`,
              value: formatCurrency(item.revenue),
              valueColor: "#10B981",  // green = revenue in
            })),
          },
          {
            title: "Top Vendors by Spend",
            icon: ShoppingCart,
            iconColor: "#FF540E",
            emptyMsg: "No vendor procurement spend.",
            items: data.topVendors?.slice(0, 4).map((item) => ({
              primary: item.vendor,
              secondary: `${item.poCount} POs`,
              value: formatCurrency(item.spend),
              valueColor: "#DC2626",  // red = spend/expense
            })),
          },
        ].map((section, si) => {
          const Icon = section.icon;
          return (
            <div key={si} className="glass-card" style={{ padding: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(255,84,14,0.08)",
                  border: "1px solid rgba(255,84,14,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={13} style={{ color: "#FF540E" }} />
                </div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {section.title}
                </h3>
              </div>
              {!section.items?.length ? (
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px", textAlign: "center", padding: "20px 0" }}>
                  {section.emptyMsg}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {section.items.map((item, ii) => (
                    <div
                      key={ii}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 0",
                        borderBottom: ii < section.items.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>{item.primary}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.secondary}</div>
                      </div>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: item.valueColor }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── ALERTS + ACTIVITY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "8px" }}>
        <AlertPanel alerts={data.alerts} />
        <RecentActivityPanel recentActivity={data.recentActivity} />
      </div>
    </div>
  );
};

export default ExecutiveDashboardPage;
