import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPurchaseAnalytics, getVendorsAnalytics } from "../../api/analytics.api";
import { DollarSign, FileText, Award, ArrowLeft, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/ui/Loader";

const PurchaseAnalyticsPage = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: purchaseData, isLoading: purLoading, error: purError, refetch } = useQuery({
    queryKey: ["purchaseAnalytics", startDate, endDate],
    queryFn: () => getPurchaseAnalytics({ startDate, endDate }),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const { data: vendorData, isLoading: venLoading, error: venError } = useQuery({
    queryKey: ["vendorPerformance"],
    queryFn: getVendorsAnalytics,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    refetch();
  };

  const isLoading = purLoading || venLoading;
  const error = purError || venError;

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading purchase analytics: {error.message}</div>;

  const { kpis, purchaseTrends, vendorSpend } = purchaseData;
  const maxSpend = purchaseTrends.length > 0 ? Math.max(...purchaseTrends.map(t => t.spend)) : 1;

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
            Purchase & Spend Analytics
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

      {/* KPIs Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {[
          { label: "Total Spend (Received)", value: formatCurrency(kpis.totalSpend), icon: DollarSign, color: "var(--success)" },
          { label: "Total POs Created", value: `${kpis.purchaseCount} POs`, icon: FileText, color: "var(--accent)" },
          { label: "Open POs", value: `${kpis.openPurchaseOrders} POs`, icon: Award, color: "#F59E0B" },
          { label: "Received POs", value: `${kpis.receivedPurchaseOrders} POs`, icon: Truck, color: "#10B981" },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{kpi.label}</span>
                <Icon size={16} style={{ color: kpi.color }} />
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Spend Trend Chart */}
      <div className="glass-card" style={{ padding: "24px", marginBottom: "28px" }}>
        <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
          Monthly Spend Trend (Received Qty)
        </h3>
        {purchaseTrends.length === 0 ? (
          <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13.5px" }}>
            No purchase receipts logged in this date range.
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "180px", gap: "24px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              {purchaseTrends.map((t, idx) => {
                const percent = (t.spend / maxSpend) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(5, percent)}%`,
                          background: "linear-gradient(to top, rgba(168,85,247,0.3) 0%, #A855F7 100%)",
                          borderRadius: "4px 4px 0 0",
                          position: "relative",
                        }}
                        title={formatCurrency(t.spend)}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", fontWeight: 600 }}>{t.month}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
              * Hover over bars to view spend totals.
            </div>
          </div>
        )}
      </div>

      {/* Vendor Analysis Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Spend by Vendor */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>🏢 Spend by Vendor</h3>
          {vendorSpend.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No vendor spend records.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {vendorSpend.map((v, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.vendor}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatCurrency(v.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Vendor Lead Time Performance */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>⏱️ Vendor Lead Delivery times</h3>
          {vendorData.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No vendor delivery history logged.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Received POs</th>
                  <th>Avg. Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                {vendorData.map((v, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{v.vendor}</td>
                    <td>{v.orders} Orders</td>
                    <td style={{ fontWeight: 700, color: "#FF540E" }}>
                      {v.averageDeliveryTimeDays} days
                    </td>
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

export default PurchaseAnalyticsPage;
