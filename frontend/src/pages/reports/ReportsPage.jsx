import React, { useState } from "react";
import { exportReport } from "../../api/analytics.api";
import { useAuthStore } from "../../store/authStore";
import { Download, FileSpreadsheet, FileText, FileBarChart } from "lucide-react";

const ReportsPage = () => {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDownload = async (format) => {
    try {
      const blob = await exportReport({
        type: reportType,
        format,
        startDate,
        endDate,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;

      let fileExtension = format;
      link.setAttribute("download", `${reportType}_report_${Date.now()}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Export failed: ${err.message || "You do not have access permissions for this report."}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
          <FileBarChart size={24} style={{ color: "var(--accent)" }} />
          Enterprise Reports Center
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
          Configure filters and download verified business intelligence reports in standard formats.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Controls Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Report Selection Card */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>1. Report Category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { type: "sales", label: "Sales & Delivered Revenue" },
                { type: "purchase", label: "Purchase & Spend Analytics" },
                { type: "inventory", label: "Inventory Valuation Details" },
                { type: "manufacturing", label: "Manufacturing Execution & MOs" },
              ].map((item) => {
                const active = reportType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => setReportType(item.type)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: active ? "1px solid #FF540E" : "1px solid var(--border)",
                      background: active ? "rgba(255,84,14,0.08)" : "var(--bg-card)",
                      color: active ? "#FF540E" : "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {item.label}
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF540E" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Filters Card */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>2. Report Filters</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
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
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>3. Export Formats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              <button
                onClick={() => handleDownload("csv")}
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
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                <Download size={16} />
                Export CSV List
              </button>
              <button
                onClick={() => handleDownload("xlsx")}
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
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                <FileSpreadsheet size={16} />
                Export Excel (.xlsx)
              </button>
              <button
                onClick={() => handleDownload("pdf")}
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
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                <FileText size={16} />
                Export PDF Document
              </button>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            className="glass-card"
            style={{
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13.5px",
              flex: 1,
            }}
          >
            <FileText size={48} style={{ color: "var(--accent)", marginBottom: "16px" }} />
            <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", fontSize: "15px" }}>
              Report Exporter Ready
            </h4>
            <p style={{ maxWidth: "300px", lineHeight: 1.5 }}>
              Select a report type and click one of the download buttons to trigger a live data aggregation and compile the spreadsheet or PDF file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
