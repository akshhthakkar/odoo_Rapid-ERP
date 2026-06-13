import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, exportAuditLogs } from "../../api/audit.api";
import { getCompanyUsers } from "../../api/users.api";
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
  ArrowRight,
  Search,
  User,
  Activity,
  Layers,
  LayoutGrid,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Terminal,
} from "lucide-react";

const AuditLogPage = () => {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'timeline'
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch users for filtering
  const { data: users = [] } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
    enabled: !!user,
  });

  // Fetch audit logs with current filters
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "auditLogs",
      page,
      limit,
      startDate,
      endDate,
      entityType,
      userId,
      action,
      searchText,
    ],
    queryFn: () =>
      getAuditLogs({
        page,
        limit,
        startDate,
        endDate,
        entityType: entityType || undefined,
        userId: userId || undefined,
        action: action || undefined,
        searchText: searchText || undefined,
      }),
    enabled:
      user?.role === "ADMIN" ||
      user?.role === "BUSINESS_OWNER" ||
      user?.role === "INVENTORY_MANAGER",
  });

  const responseData = data || { logs: [], total: 0, totalPages: 1 };
  const logs = responseData.logs || [];
  const totalPages = responseData.totalPages || 1;

  const handleExport = async (format) => {
    try {
      const blob = await exportAuditLogs({
        format,
        startDate,
        endDate,
        entityType: entityType || undefined,
        userId: userId || undefined,
        action: action || undefined,
        searchText: searchText || undefined,
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

  const isAuthorized =
    user?.role === "ADMIN" ||
    user?.role === "BUSINESS_OWNER" ||
    user?.role === "INVENTORY_MANAGER";

  if (!isAuthorized) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>
        <h3>Unauthorized</h3>
        <p>You do not have access to view system audit logs.</p>
      </div>
    );
  }

  const renderDiff = (oldVals, newVals) => {
    if (!oldVals && !newVals) return <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No detailed values modified.</span>;

    const keys = new Set([...Object.keys(oldVals || {}), ...Object.keys(newVals || {})]);
    if (keys.size === 0) return <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No changes detected.</span>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
        {[...keys].map((key) => {
          const oldVal = oldVals ? oldVals[key] : null;
          const newVal = newVals ? newVals[key] : null;

          return (
            <div
              key={key}
              style={{
                background: "rgba(255,255,255,0.02)",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "11px", color: "var(--accent)", textTransform: "uppercase", marginBottom: "4px" }}>
                {key}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "12px",
                    background: "rgba(239,68,68,0.1)",
                    color: "#EF4444",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textDecoration: "line-through",
                  }}
                >
                  {oldVal === null || oldVal === undefined ? "null" : String(oldVal)}
                </span>
                <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />
                <span
                  style={{
                    fontSize: "12px",
                    background: "rgba(16,185,129,0.1)",
                    color: "#10B981",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  {newVal === null || newVal === undefined ? "null" : String(newVal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)", position: "relative" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <History size={24} style={{ color: "var(--accent)" }} />
            System Audit Trail
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
            Track, search, and verify all system activities, entity modifications, and operation histories.
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "4px", borderRadius: "8px" }}>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "table" ? "var(--accent)" : "transparent",
              color: viewMode === "table" ? "#FFF" : "var(--text-primary)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LayoutGrid size={15} />
            Table
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "timeline" ? "var(--accent)" : "transparent",
              color: viewMode === "timeline" ? "#FFF" : "var(--text-primary)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Clock size={15} />
            Timeline
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "18rem 1fr", gap: "24px" }}>
        {/* Left column: Filters & Exports */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Search Bar */}
          <div className="glass-card" style={{ padding: "16px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700 }}>FREE TEXT SEARCH</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search reference, description..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
              />
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }} />
            </div>
          </div>

          {/* Filters Card */}
          <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={15} style={{ color: "var(--accent)" }} />
              Filters
            </h3>

            {/* Entity Category Dropdown */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>MODULE / CATEGORY</label>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
              >
                <option value="">All Categories</option>
                <option value="SalesOrder">Sales Orders</option>
                <option value="PurchaseOrder">Purchase Orders</option>
                <option value="ManufacturingOrder">Manufacturing Orders</option>
                <option value="Product">Products</option>
                <option value="Customer">Customers</option>
                <option value="Vendor">Vendors</option>
                <option value="BoM">Bill of Materials</option>
                <option value="User">Users</option>
              </select>
            </div>

            {/* Action Select */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>ACTION TYPE</label>
              <input
                type="text"
                placeholder="e.g. PRODUCT_UPDATED"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
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

            {/* User Dropdown */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>PERFORMED BY</label>
              <select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filters */}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>START DATE</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
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

          {/* Export Options */}
          <div className="glass-card" style={{ padding: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Export Options</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => handleExport("csv")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <Download size={14} />
                Export CSV List
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#10B981",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <FileSpreadsheet size={14} />
                Export Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport("pdf")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--danger)",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <FileText size={14} />
                Export PDF Document
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Results View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", minHeight: "550px" }}>
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
            ) : logs.length === 0 ? (
              <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No matching activity logs found.
              </div>
            ) : viewMode === "table" ? (
              /* TABLE VIEW */
              <div style={{ overflowX: "auto" }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ width: "18%" }}>Timestamp</th>
                      <th style={{ width: "15%" }}>User</th>
                      <th style={{ width: "15%" }}>Action</th>
                      <th style={{ width: "12%" }}>Reference</th>
                      <th style={{ width: "40%" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        style={{ cursor: "pointer" }}
                        className="hover-row"
                      >
                        <td style={{ fontSize: "11.5px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {log.user?.name || "System"}
                          {log.user?.email && (
                            <span style={{ display: "block", fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>
                              {log.user.email}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "rgba(255, 84, 14, 0.08)",
                              color: "#FF540E",
                              textTransform: "uppercase",
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "12px" }}>
                          {log.entityRef || "-"}
                        </td>
                        <td style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TIMELINE VIEW */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingLeft: "12px", borderLeft: "2px solid var(--border)", position: "relative" }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      position: "relative",
                      padding: "16px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    className="hover-card"
                  >
                    {/* timeline marker dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: "-21px",
                        top: "22px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        border: "2px solid var(--bg-card)",
                      }}
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255, 84, 14, 0.08)",
                            color: "#FF540E",
                          }}
                        >
                          {log.action}
                        </span>
                        {log.entityRef && (
                          <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-primary)" }}>
                            {log.entityRef}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0 }}>
                      {log.description}
                    </p>

                    <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                      <span>BY: {log.user?.name || "System"}</span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Showing page {page} of {totalPages}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: page === 1 ? "rgba(0,0,0,0.05)" : "var(--bg-card)",
                      color: page === 1 ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: page === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: page === totalPages ? "rgba(0,0,0,0.05)" : "var(--bg-card)",
                      color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Drawer Details View */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            width: "450px",
            background: "var(--bg-card)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            animation: "slide-in 0.2s ease-out",
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
                Audit Record Details
              </h3>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                ID: {selectedLog.id} • {new Date(selectedLog.createdAt).toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Summary Block */}
            <div style={{ background: "rgba(255,84,14,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,84,14,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "11px",
                    background: "rgba(255,84,14,0.08)",
                    color: "#FF540E",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {selectedLog.action}
                </span>
                {selectedLog.entityRef && (
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                    {selectedLog.entityRef}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "13.5px", color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
                {selectedLog.description}
              </p>
            </div>

            {/* General Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                RECORD METADATA
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>ENTITY TYPE</span>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedLog.entityType}</span>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>ENTITY ID</span>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedLog.entityId}</span>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>PERFORMED BY</span>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedLog.user?.name || "System"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>USER EMAIL</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", wordBreak: "break-all" }}>{selectedLog.user?.email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Changed Fields Diff */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                FIELD MODIFICATIONS
              </h4>
              {renderDiff(selectedLog.oldValues, selectedLog.newValues)}
            </div>

            {/* Network / Client Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                CLIENT CONTEXT
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Globe size={14} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: "12.5px" }}>IP: {selectedLog.ipAddress || "Unknown / Local"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Terminal size={14} style={{ color: "var(--text-muted)", marginTop: "2px" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                    UA: {selectedLog.userAgent || "Unknown User Agent"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
