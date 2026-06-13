import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getManufacturingAnalytics } from "../../api/analytics.api";
import { Settings, FileText, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/ui/Loader";

const ManufacturingAnalyticsPage = () => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["manufacturingAnalytics"],
    queryFn: getManufacturingAnalytics,
  });

  if (isLoading) return <Loader padding="120px 0" size={36} />;
  if (error) return <div style={{ padding: "40px", color: "var(--danger)", textAlign: "center" }}>Error loading manufacturing analytics: {error.message}</div>;

  const { kpis, workCenterThroughput, productionOutput } = data;

  // Max throughput for graph scaling
  const maxDuration = workCenterThroughput.length > 0 ? Math.max(...workCenterThroughput.map(w => w.durationMins)) : 1;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
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
          Manufacturing & Work Center Throughput
        </h2>
      </div>

      {/* KPI summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {[
          { label: "Completed MOs", value: `${kpis.completedMOs} Orders`, icon: CheckCircle2, color: "var(--success)" },
          { label: "Active (Confirmed/IP)", value: `${kpis.confirmedMOs + kpis.inProgressMOs} Orders`, icon: Settings, color: "var(--accent)" },
          { label: "Work Orders Completed", value: `${kpis.completedWorkOrdersCount} WOs`, icon: FileText, color: "#10B981" },
          { label: "Avg. MO Completion Time", value: `${Number(kpis.averageMOCompletionTimeHours).toFixed(1)} hrs`, icon: Clock, color: "#A855F7" },
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

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Work Center Throughput */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Work Center Throughput (Completed Operations Time)
          </h3>
          {workCenterThroughput.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No operations completed yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {workCenterThroughput.map((wc, idx) => {
                const percentage = (wc.durationMins / maxDuration) * 100;
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{wc.workCenter}</span>
                      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{wc.durationMins} mins</span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percentage}%`,
                          background: "linear-gradient(to right, rgba(16,185,129,0.4) 0%, #10B981 100%)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Finished Goods Produced */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Production Output (Finished Goods Completed)
          </h3>
          {productionOutput.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No products manufactured yet.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Manufactured</th>
                </tr>
              </thead>
              <tbody>
                {productionOutput.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.product}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>{p.produced} Units</td>
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

export default ManufacturingAnalyticsPage;
