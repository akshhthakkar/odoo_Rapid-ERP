import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesAnalytics } from "../../api/analytics.api";
import { DollarSign, FileText, ShoppingBag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/ui/Loader";

const SalesAnalyticsPage = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["salesAnalytics", startDate, endDate],
    queryFn: () => getSalesAnalytics({ startDate, endDate }),
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    refetch();
  };

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading sales analytics: {error.message}</div>;

  const { kpis, salesTrends, topProducts, topCustomers } = data;

  // Max value for CSS chart scaling
  const maxRevenue = salesTrends.length > 0 ? Math.max(...salesTrends.map(t => t.revenue)) : 1;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <button
            onClick={() => navigate("/analytics")}
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
              marginBottom: "8px",
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
            Sales & Revenue Analytics
          </h2>
        </div>

        {/* Date Filter Form */}
        <form onSubmit={handleApplyFilters} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              background: "#FF540E",
              color: "white",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* KPI summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {[
          { label: "Total Revenue (Delivered)", value: formatCurrency(kpis.totalRevenue), icon: DollarSign, color: "var(--success)" },
          { label: "Total Sales Orders", value: `${kpis.salesCount} Orders`, icon: FileText, color: "var(--accent)" },
          { label: "Avg. Order Value", value: formatCurrency(kpis.averageOrderValue), icon: ShoppingBag, color: "#10B981" },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{kpi.label}</span>
                <Icon size={16} style={{ color: kpi.color }} />
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Sales trends bar chart */}
      <div className="glass-card" style={{ padding: "24px", marginBottom: "28px" }}>
        <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
          Monthly Revenue Trend (Delivered Qty)
        </h3>
        {salesTrends.length === 0 ? (
          <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13.5px" }}>
            No sales movements logged in this date range.
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "180px", gap: "24px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              {salesTrends.map((t, idx) => {
                const percent = (t.revenue / maxRevenue) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(5, percent)}%`,
                          background: "linear-gradient(to top, rgba(255,84,14,0.3) 0%, #FF540E 100%)",
                          borderRadius: "4px 4px 0 0",
                          position: "relative",
                        }}
                        title={formatCurrency(t.revenue)}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", fontWeight: 600 }}>{t.month}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
              * Hover over bars to view revenue totals.
            </div>
          </div>
        )}
      </div>

      {/* Tables grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Top products */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>🏆 Top 5 Selling Products</h3>
          {topProducts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No product sales logged.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.product}</td>
                    <td>{p.qty}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Customers */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>🤝 Top 5 Customers</h3>
          {topCustomers.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No customer sales logged.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders Count</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.customer}</td>
                    <td>{c.orders}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesAnalyticsPage;
