import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getManufacturingOrder,
  confirmManufacturingOrder,
  startManufacturingOrder,
  startWorkOrder,
  completeWorkOrder,
  completeManufacturingOrder,
  cancelManufacturingOrder,
} from "../../api/manufacturing.api";
import {
  Factory,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Play,
  CheckCircle,
  Clock,
  User,
  History,
  FileText,
  Boxes,
  Activity,
  Loader2,
} from "lucide-react";

const ManufacturingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mo, setMo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchMoDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getManufacturingOrder(id);
      setMo(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load Manufacturing Order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoDetails();
  }, [id]);

  const handleConfirm = async () => {
    setActionError("");
    try {
      setActionLoading(true);
      await confirmManufacturingOrder(mo.id);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to confirm order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartProduction = async () => {
    setActionError("");
    try {
      setActionLoading(true);
      await startManufacturingOrder(mo.id);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to start production.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWorkOrder = async (woId) => {
    setActionError("");
    try {
      setActionLoading(true);
      await startWorkOrder(mo.id, woId);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to start Work Order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWorkOrder = async (woId) => {
    setActionError("");
    try {
      setActionLoading(true);
      await completeWorkOrder(mo.id, woId);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to complete Work Order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteManufacturing = async () => {
    setActionError("");
    try {
      setActionLoading(true);
      await completeManufacturingOrder(mo.id);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to complete manufacturing.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this Manufacturing Order?")) return;
    setActionError("");
    try {
      setActionLoading(true);
      await cancelManufacturingOrder(mo.id);
      await fetchMoDetails();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      DRAFT: { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB", label: "Draft" },
      CONFIRMED: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Confirmed" },
      IN_PROGRESS: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "In Progress" },
      DONE: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0", label: "Completed" },
      CANCELLED: { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5", label: "Cancelled" },
    };
    return styles[status] || styles.DRAFT;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "128px 0" }}>
        <Loader2 size={36} className="animate-spin" style={{ color: "#FF540E" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
        <Link
          to="/manufacturing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#6B7280",
            textDecoration: "none",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <ArrowLeft size={16} /> Back to Manufacturing
        </Link>
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "12px", padding: "24px", color: "#B91C1C" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700 }}>Error Loading Order</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(mo.status);
  const allWosCompleted = mo.workOrders.length > 0 && mo.workOrders.every((wo) => wo.status === "DONE");

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Back to List */}
      <Link
        to="/manufacturing"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "#4B5563",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "24px",
        }}
      >
        <ArrowLeft size={16} /> Back to List
      </Link>

      {/* Header Banner */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span
              style={{
                background: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
                padding: "3px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {statusStyle.label}
            </span>
            <span style={{ fontSize: "14px", color: "#6B7280" }}>
              Scheduled: {mo.scheduledDate ? new Date(mo.scheduledDate).toLocaleDateString() : "-"}
            </span>
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1F2937", margin: "0 0 6px" }}>{mo.moRef}</h1>
          <p style={{ margin: 0, fontSize: "15px", color: "#374151" }}>
            Produce <strong>{mo.qty} units</strong> of{" "}
            <span style={{ fontWeight: 600, color: "#111827" }}>{mo.productName}</span> (SKU: {mo.productSku})
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {mo.status === "DRAFT" && (
            <>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#FFFFFF",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel Order
              </button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                id="btn-confirm-mo"
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#FF540E",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Confirm Order
              </button>
            </>
          )}

          {mo.status === "CONFIRMED" && (
            <>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#FFFFFF",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel Order
              </button>
              <button
                onClick={handleStartProduction}
                disabled={actionLoading}
                id="btn-start-mo"
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#10B981",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                <Play size={14} fill="currentColor" />
                Start Production
              </button>
            </>
          )}

          {mo.status === "IN_PROGRESS" && (
            <button
              onClick={handleCompleteManufacturing}
              disabled={actionLoading || !allWosCompleted}
              id="btn-complete-mo"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: allWosCompleted ? "#10B981" : "#E5E7EB",
                color: allWosCompleted ? "#FFFFFF" : "#9CA3AF",
                fontWeight: 600,
                fontSize: "14px",
                cursor: allWosCompleted ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {actionLoading && <Loader2 size={16} className="animate-spin" />}
              <CheckCircle size={14} />
              Complete Manufacturing
            </button>
          )}
        </div>
      </div>

      {/* Action Warnings */}
      {actionError && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            padding: "14px 18px",
            color: "#B91C1C",
            fontSize: "14px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Document Traceability */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <FileText size={20} style={{ color: "#9CA3AF" }} />
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Linked Recipe</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1F2937", marginTop: "2px" }}>
              Active BoM (v{mo.bomVersion})
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Boxes size={20} style={{ color: "#9CA3AF" }} />
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Linked Sales Order</div>
            {mo.salesOrderId ? (
              <Link
                to={`/sales/${mo.salesOrderId}`}
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#FF540E",
                  textDecoration: "none",
                  display: "block",
                  marginTop: "2px",
                }}
              >
                {mo.salesOrderRef}
              </Link>
            ) : (
              <div style={{ fontSize: "14px", color: "#374151", marginTop: "2px" }}>Manual Production</div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Activity size={20} style={{ color: "#9CA3AF" }} />
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Execution Progress</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937" }}>{mo.progress}%</div>
              <div
                style={{
                  height: "8px",
                  width: "100px",
                  background: "#E5E7EB",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${mo.progress}%`,
                    background: mo.progress === 100 ? "#10B981" : "#FF540E",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", lg: { gridTemplateColumns: "3fr 2fr" } }}>
        
        {/* Left Side: Components Requirement & Work Order Execution */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Component Requirements */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Boxes size={18} style={{ color: "#FF540E" }} />
              Component Requirements
            </h2>

            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "10px" }}>
                  <th style={{ padding: "8px 0", fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Raw Material</th>
                  <th style={{ padding: "8px 0", fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Required</th>
                  <th style={{ padding: "8px 0", fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>On Hand</th>
                  <th style={{ padding: "8px 0", fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Availability</th>
                  <th style={{ padding: "8px 0", fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Consumed</th>
                </tr>
              </thead>
              <tbody>
                {mo.components.map((comp) => {
                  const hasShortage = comp.onHandQty < comp.qtyRequired;
                  const isConsumed = mo.status === "DONE" || mo.status === "IN_PROGRESS";
                  return (
                    <tr key={comp.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 0" }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>{comp.name}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{comp.sku}</div>
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 500, color: "#374151" }}>
                        {comp.qtyRequired} units
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "14px", color: "#4B5563" }}>
                        {isConsumed ? "-" : `${comp.onHandQty} units`}
                      </td>
                      <td style={{ padding: "12px 0" }}>
                        {isConsumed ? (
                          <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 600 }}>Deducted</span>
                        ) : hasShortage ? (
                          <span style={{ display: "inline-flex", padding: "2px 8px", background: "#FEF2F2", color: "#DC2626", borderRadius: "9999px", fontSize: "11px", fontWeight: 600 }}>
                            🔴 Shortage
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", padding: "2px 8px", background: "#ECFDF5", color: "#10B981", borderRadius: "9999px", fontSize: "11px", fontWeight: 600 }}>
                            🟢 Available
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 600, color: comp.qtyConsumed > 0 ? "#10B981" : "#6B7280" }}>
                        {comp.qtyConsumed} units
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Work Orders Executions */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Factory size={18} style={{ color: "#FF540E" }} />
              Shop Floor Work Orders
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {mo.workOrders.map((wo, index) => {
                const isPreviousDone = index === 0 || mo.workOrders[index - 1].status === "DONE";
                const isCurrentPending = wo.status === "PENDING" && isPreviousDone && mo.status === "IN_PROGRESS";
                const isCurrentRunning = wo.status === "IN_PROGRESS" && mo.status === "IN_PROGRESS";

                return (
                  <div
                    key={wo.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      padding: "16px",
                      background: wo.status === "DONE" ? "#F9FAFB" : "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: wo.status === "DONE" ? "#10B981" : "#F3F4F6",
                            color: wo.status === "DONE" ? "#FFFFFF" : "#4B5563",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {wo.sequence}
                        </span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                          {wo.operationName}
                        </h4>
                      </div>
                      <p style={{ margin: "4px 0 0 30px", fontSize: "12px", color: "#6B7280" }}>
                        Work Center: <strong>{wo.workCenterName}</strong> | Expected: <strong>{wo.durationMins} mins</strong>
                      </p>
                      {wo.completedAt && (
                        <div style={{ margin: "6px 0 0 30px", fontSize: "11px", color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={12} />
                          Completed: {new Date(wo.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    <div>
                      {wo.status === "DONE" && (
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={14} /> Completed
                        </span>
                      )}

                      {wo.status === "PENDING" && !isPreviousDone && (
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Waiting on prior step</span>
                      )}

                      {isCurrentPending && (
                        <button
                          onClick={() => handleStartWorkOrder(wo.id)}
                          disabled={actionLoading}
                          className="btn-start-wo"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#FF540E",
                            color: "#FFFFFF",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Start Step
                        </button>
                      )}

                      {isCurrentRunning && (
                        <button
                          onClick={() => handleCompleteWorkOrder(wo.id)}
                          disabled={actionLoading}
                          className="btn-complete-wo"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#10B981",
                            color: "#FFFFFF",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Complete Step
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Timeline */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <History size={18} style={{ color: "#FF540E" }} />
              Manufacturing Log History
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {mo.timeline?.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      background: "#F3F4F6",
                      padding: "8px",
                      borderRadius: "50%",
                      color: "#6B7280",
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      {log.description}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "2px",
                        fontSize: "12px",
                        color: "#9CA3AF",
                      }}
                    >
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.user && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={12} />
                          {log.user.name} ({log.user.role.replace(/_/g, " ").toLowerCase()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ManufacturingDetailPage;
