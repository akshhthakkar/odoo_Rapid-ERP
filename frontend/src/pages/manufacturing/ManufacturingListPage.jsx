import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getManufacturingOrders, createManufacturingOrder } from "../../api/manufacturing.api";
import { getBoms } from "../../api/bom.api";
import { Factory, Plus, Search, Calendar, Filter, RefreshCw, X, Loader2, ArrowRight } from "lucide-react";
import Loader from "../../components/ui/Loader";
import Pagination from "../../components/ui/Pagination";

const ManufacturingListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const statusFilter = searchParams.get("status") || "";

  const [mos, setMos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boms, setBoms] = useState([]);
  const [bomsLoading, setBomsLoading] = useState(false);
  const [selectedBom, setSelectedBom] = useState("");
  const [qty, setQty] = useState("1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchMos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await getManufacturingOrders(params);
      if (response && response.data) {
        setMos(response.data);
        setPagination(response.pagination);
      } else {
        setMos(response);
        setPagination(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch Manufacturing Orders.");
    } finally {
      setLoading(false);
    }
  };

  const loadBoms = async () => {
    try {
      setBomsLoading(true);
      const data = await getBoms({ includeInactive: false });
      setBoms(data);
      if (data.length > 0) {
        setSelectedBom(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load BoMs:", err);
    } finally {
      setBomsLoading(false);
    }
  };

  useEffect(() => {
    fetchMos();
  }, [statusFilter, page, searchTerm]);

  useEffect(() => {
    if (isModalOpen) {
      loadBoms();
      // Default to today + 1 day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [isModalOpen]);

  const handleCreateMo = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const bomId = Number(selectedBom);
    const bomObj = boms.find((b) => b.id === bomId);
    if (!bomObj) {
      setSubmitError("Please select a valid finished product/BoM.");
      return;
    }

    const numericQty = Number(qty);
    if (isNaN(numericQty) || numericQty <= 0) {
      setSubmitError("Quantity must be a positive number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        productId: bomObj.productId,
        bomId,
        qty: numericQty,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        notes,
      };

      const newMo = await createManufacturingOrder(payload);
      setIsModalOpen(false);
      // Reset form
      setQty("1");
      setNotes("");
      navigate(`/manufacturing/${newMo.id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to schedule Manufacturing Order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage);
    setSearchParams(params);
  };

  const handleStatusFilterChange = (newStatus) => {
    const params = new URLSearchParams(window.location.search);
    if (newStatus) params.set('status', newStatus);
    else params.delete('status');
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    setSearchParams(params);
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: { bg: "#F3F4F6", text: "#4B5563", label: "Draft" },
      CONFIRMED: { bg: "#EFF6FF", text: "#2563EB", label: "Confirmed" },
      IN_PROGRESS: { bg: "#FFFBEB", text: "#D97706", label: "In Progress" },
      DONE: { bg: "#ECFDF5", text: "#059669", label: "Completed" },
      CANCELLED: { bg: "#FEF2F2", text: "#DC2626", label: "Cancelled" },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "3px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: 600,
          background: style.bg,
          color: style.text,
        }}
      >
        {style.label}
      </span>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#1F2937",
              letterSpacing: "-0.5px",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Factory size={28} style={{ color: "#FF540E" }} />
            Manufacturing Orders
          </h1>
          <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: "14px" }}>
            Plan, schedule, and track work center operations and component inventory consumption.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          id="btn-new-mo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#FF540E",
            color: "#FFFFFF",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255, 84, 14, 0.15)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#E04300")}
          onMouseLeave={(e) => (e.target.style.background = "#FF540E")}
        >
          <Plus size={16} />
          Schedule Production
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <Search
            size={18}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}
          />
          <input
            type="text"
            placeholder="Search by MO reference, product SKU or name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Filter size={16} style={{ color: "#6B7280" }} />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            style={{
              padding: "9px 12px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              fontSize: "14px",
              background: "#FFFFFF",
              outline: "none",
            }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={fetchMos}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            background: "#F3F4F6",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#4B5563",
          }}
          title="Refresh List"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Error View */}
      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            padding: "16px",
            color: "#B91C1C",
            fontSize: "14px",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Grid/Table */}
      {loading ? (
        <Loader size={36} padding="64px 0" />
      ) : mos.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "48px 24px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <Factory size={48} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#374151" }}>No Manufacturing Orders found</h3>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>
            {searchTerm || statusFilter ? "Try adjusting your filters or search term." : "Get started by planning a new production run."}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563" }}>Reference</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563" }}>Product</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563" }}>Target Qty</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563" }}>Status</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563", width: "160px" }}>WO Progress</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563" }}>Scheduled</th>
                <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#4B5563", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mos.map((mo) => (
                <tr
                  key={mo.id}
                  style={{
                    borderBottom: "1px solid #F3F4F6",
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(`/manufacturing/${mo.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "16px", fontWeight: 600, color: "#111827" }}>{mo.moRef}</td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 500, color: "#374151" }}>{mo.productName}</div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>SKU: {mo.productSku}</div>
                  </td>
                  <td style={{ padding: "16px", fontWeight: 500, color: "#374151" }}>{mo.qty} units</td>
                  <td style={{ padding: "16px" }}>{getStatusBadge(mo.status)}</td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#4B5563" }}>
                        {mo.progress}% Complete
                      </div>
                      <div
                        style={{
                          height: "6px",
                          width: "100%",
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
                            borderRadius: "9999px",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "#4B5563", fontSize: "13px" }}>
                    {mo.scheduledDate ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={14} style={{ color: "#9CA3AF" }} />
                        {new Date(mo.scheduledDate).toLocaleDateString()}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/manufacturing/${mo.id}`);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#FF540E",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "13px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Details
                      <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && (
            <div style={{ padding: '0 16px' }}>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal - Create MO */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              border: "1px solid #E5E7EB",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>
                Schedule Production Run
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateMo} style={{ padding: "24px" }}>
              {submitError && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "#B91C1C",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {submitError}
                </div>
              )}

              {/* Product selector */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#4B5563", marginBottom: "6px" }}>
                  Finished Goods Product (BoM Recipe)
                </label>
                {bomsLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6B7280", fontSize: "13px" }}>
                    <Loader size={16} padding="0" style={{ display: "inline-flex", width: "auto" }} />
                  </div>
                ) : boms.length === 0 ? (
                  <div style={{ color: "#B91C1C", fontSize: "13px", fontWeight: 500 }}>
                    No active Bills of Materials exist. Please configure a BoM recipe first.
                  </div>
                ) : (
                  <select
                    value={selectedBom}
                    onChange={(e) => setSelectedBom(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#FFFFFF",
                      outline: "none",
                    }}
                  >
                    {boms.map((bom) => (
                      <option key={bom.id} value={bom.id}>
                        {bom.product?.name} (SKU: {bom.product?.sku}) — v{bom.version}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#4B5563", marginBottom: "6px" }}>
                  Target Production Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              {/* Scheduled date */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#4B5563", marginBottom: "6px" }}>
                  Scheduled Production Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#4B5563", marginBottom: "6px" }}>
                  Notes / Instructions
                </label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional manufacturing notes..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  borderTop: "1px solid #E5E7EB",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    color: "#374151",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || boms.length === 0}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: boms.length === 0 ? "#E5E7EB" : "#FF540E",
                    color: boms.length === 0 ? "#9CA3AF" : "#FFFFFF",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: boms.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Schedule Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingListPage;
