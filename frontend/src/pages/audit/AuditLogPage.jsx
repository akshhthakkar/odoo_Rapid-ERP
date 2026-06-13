import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, exportReport } from "../../api/analytics.api";
import { useAuthStore } from "../../store/authStore";
import Loader from "../../components/ui/Loader";
import { 
  History, 
  Calendar, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Database,
  ArrowRight
} from "lucide-react";

const AuditLogPage = () => {
  const { user } = useAuthStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entityType, setEntityType] = useState("");

  const { data: auditLogs, isLoading, error, refetch } = useQuery({
    queryKey: ["auditLogs", startDate, endDate, entityType],
    queryFn: () => getAuditLogs({ startDate, endDate, entityType }),
    enabled: user?.role === "ADMIN" || user?.role === "BUSINESS_OWNER" || user?.role === "INVENTORY_MANAGER",
  });

  const handleExport = async (format) => {
    try {
      const blob = await exportReport({
        type: "audit",
        format,
        startDate,
        endDate,
        entityType: entityType || undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;

      let fileExtension = format;
      link.setAttribute("download", `audit_report_${Date.now()}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Export failed: ${err.message || "Permissions denied or server error."}`);
    }
  };

  const isAuthorized = user?.role === "ADMIN" || user?.role === "BUSINESS_OWNER" || user?.role === "INVENTORY_MANAGER";

  if (!isAuthorized) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>
        <h3>Unauthorized</h3>
        <p>You do not have access to view system audit logs.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
          <History size={24} style={{ color: "var(--accent)" }} />
          System Audit Trail
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
          Track, search, and verify all system activities, entity modifications, and operation histories.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "24px" }}>
        {/* Left column: Filters & Exports */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Entity Type Filter */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={16} style={{ color: "var(--accent)" }} />
              Entity Category
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { type: "", label: "All Activities" },
                { type: "SalesOrder", label: "Sales Orders" },
                { type: "PurchaseOrder", label: "Purchase Orders" },
                { type: "ManufacturingOrder", label: "Manufacturing Orders" },
                { type: "Product", label: "Products" },
                { type: "BoM", label: "Bill of Materials" },
              ].map((item) => {
                const active = entityType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => setEntityType(item.type)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: active ? "1px solid #FF540E" : "1px solid var(--border)",
                      background: active ? "rgba(255,84,14,0.08)" : "var(--bg-card)",
                      color: active ? "#FF540E" : "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "13px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {item.label}
                    {active && <ArrowRight size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Filter Card */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={16} style={{ color: "var(--accent)" }} />
              Timeframe Filters
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>START DATE</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
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
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Download triggers */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Export Options</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              <button
                onClick={() => handleExport("csv")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px",
                  borderRadius: "8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <Download size={15} />
                Export CSV List
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px",
                  borderRadius: "8px",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#10B981",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <FileSpreadsheet size={15} />
                Export Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport("pdf")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px",
                  borderRadius: "8px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--danger)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <FileText size={15} />
                Export PDF Document
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Results Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", minHeight: "500px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={16} style={{ color: "var(--accent)" }} />
              Live Activity Trail Logs
            </h3>

            {isLoading ? (
              <Loader padding="120px 0" size={36} />
            ) : error ? (
              <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--danger)", fontSize: "14px" }}>
                Error loading audit trail data.
              </div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No matching activity logs found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Timestamp</th>
                      <th style={{ width: "20%" }}>User</th>
                      <th style={{ width: "20%" }}>Action</th>
                      <th style={{ width: "40%" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: "11.5px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {log.user?.name || "System"}
                          {log.user?.email && (
                            <span style={{ display: "block", fontSize: "10.5px", fontWeight: 400, color: "var(--text-muted)" }}>
                              {log.user.email}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ 
                            display: "inline-flex",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "rgba(255, 84, 14, 0.08)",
                            color: "#FF540E",
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
