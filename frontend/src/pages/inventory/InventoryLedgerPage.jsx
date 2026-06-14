import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getInventoryLedger, exportInventoryLedger } from "../../api/inventoryLedger.api";
import { getProducts } from "../../api/products.api";
import { getWarehouses } from "../../api/inventory.api";
import Loader from "../../components/ui/Loader";
import Pagination from "../../components/ui/Pagination";
import {
  BookOpen,
  Calendar,
  Warehouse,
  Package,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";

const InventoryLedgerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch product list
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(), // fetch all products for selector
  });

  // Fetch warehouse list
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => getWarehouses(),
  });

  // Set default product when products list is loaded
  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(String(products[0].id));
    }
  }, [products, productId]);

  // Fetch ledger data
  const {
    data: ledgerData,
    isLoading: isLoadingLedger,
    error: ledgerError,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ["inventoryLedger", productId, warehouseId, startDate, endDate, page],
    queryFn: () =>
      getInventoryLedger({
        productId,
        warehouseId: warehouseId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 15,
      }),
    enabled: !!productId,
  });

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage);
    setSearchParams(params);
  };

  const handleFilterChange = (field, val) => {
    if (field === "productId") setProductId(val);
    if (field === "warehouseId") setWarehouseId(val);
    if (field === "startDate") setStartDate(val);
    if (field === "endDate") setEndDate(val);

    // Reset page to 1 whenever filters change
    const params = new URLSearchParams(window.location.search);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleExport = async (format) => {
    if (!productId) return;
    try {
      const blob = await exportInventoryLedger({
        productId,
        warehouseId: warehouseId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        format,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;

      let fileExtension = format;
      link.setAttribute(
        "download",
        `inventory_ledger_${ledgerData?.product?.sku || "report"}_${Date.now()}.${fileExtension}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Export failed: ${err.message || "Permissions denied or server error."}`);
    }
  };

  const getMovementTypeBadgeStyle = (type) => {
    const base = {
      display: "inline-flex",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
    };

    switch (type) {
      case "PURCHASE_RECEIPT":
        return { ...base, background: "rgba(59,130,246,0.08)", color: "#3B82F6" };
      case "SALE_DELIVERY":
        return { ...base, background: "rgba(249,115,22,0.08)", color: "#F97316" };
      case "MANUFACTURING_PRODUCE":
        return { ...base, background: "rgba(168,85,247,0.08)", color: "#A855F7" };
      case "MANUFACTURING_CONSUME":
        return { ...base, background: "rgba(236,72,153,0.08)", color: "#EC4899" };
      case "STOCK_ADJUSTMENT":
        return { ...base, background: "rgba(16,185,129,0.08)", color: "#10B981" };
      case "WAREHOUSE_TRANSFER_OUT":
      case "WAREHOUSE_TRANSFER_IN":
        return { ...base, background: "rgba(100,116,139,0.08)", color: "#64748B" };
      default:
        return { ...base, background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" };
    }
  };

  const getDrilldownUrl = (row) => {
    if (row.referenceType === "SALE") return `/sales/${row.referenceId}`;
    if (row.referenceType === "PURCHASE") return `/purchase/${row.referenceId}`;
    if (row.referenceType === "MANUFACTURING") return `/manufacturing/${row.referenceId}`;
    return null;
  };

  const renderDrilldownLink = (row) => {
    const url = getDrilldownUrl(row);
    if (url) {
      return (
        <Link
          to={url}
          style={{
            color: "#FF540E",
            textDecoration: "none",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
          }}
          className="hover-link"
        >
          {row.reference}
          <ChevronRight size={12} />
        </Link>
      );
    }
    return <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.reference}</span>;
  };

  const totalInward =
    ledgerData ? ledgerData.purchases + ledgerData.manufacturingProduced + ledgerData.transfers : 0;
  const totalOutward =
    ledgerData ? ledgerData.sales + ledgerData.manufacturingConsumed : 0;

  return (
    <div className="animate-fade-in" style={{ fontFamily: "var(--font-family)" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <BookOpen size={24} style={{ color: "var(--accent)" }} />
            Inventory Stock Ledger
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
            Audit physical stock inflows, outflows, adjustments, and sequential running balances.
          </p>
        </div>
      </div>

      {/* Selectors and Filters Bar */}
      <div className="glass-card" style={{ padding: "20px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 40px", gap: "16px", alignItems: "flex-end" }}>
        {/* Product Selector */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase" }}>
            <Package size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Select Product
          </label>
          <select
            value={productId}
            onChange={(e) => handleFilterChange("productId", e.target.value)}
            disabled={isLoadingProducts}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            {isLoadingProducts ? (
              <option>Loading products...</option>
            ) : (
              products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Warehouse Selector */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase" }}>
            <Warehouse size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Warehouse Scope
          </label>
          <select
            value={warehouseId}
            onChange={(e) => handleFilterChange("warehouseId", e.target.value)}
            disabled={isLoadingWarehouses}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase" }}>
            <Calendar size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "13px",
            }}
          />
        </div>

        {/* End Date */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase" }}>
            <Calendar size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "13px",
            }}
          />
        </div>

        {/* Reset / Refresh */}
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setWarehouseId("");
            const params = new URLSearchParams(window.location.search);
            params.set("page", "1");
            setSearchParams(params);
            refetchLedger();
          }}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "41px",
          }}
          title="Reset Filters"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoadingLedger ? (
        <Loader padding="120px 0" size={40} />
      ) : ledgerError ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>
          <h3>Reconciliation Load Error</h3>
          <p>Failed to build stock ledger dataset.</p>
        </div>
      ) : !ledgerData ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <p>Please select a product above to generate stock ledger.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {/* Opening Balance */}
            <div className="glass-card" style={{ padding: "16px", position: "relative", overflow: "hidden" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Opening Stock
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: "var(--text-primary)" }}>
                {ledgerData.openingStock}
              </h3>
              <div style={{ position: "absolute", right: "12px", bottom: "12px", opacity: 0.15 }}>
                <Clock size={32} />
              </div>
            </div>

            {/* Total Inward */}
            <div className="glass-card" style={{ padding: "16px", position: "relative", overflow: "hidden" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Total Inward
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: "#10B981", display: "flex", alignItems: "center", gap: "6px" }}>
                <ArrowUpRight size={20} />
                +{totalInward}
              </h3>
              <div style={{ position: "absolute", right: "12px", bottom: "12px", opacity: 0.15, color: "#10B981" }}>
                <ArrowUpRight size={32} />
              </div>
            </div>

            {/* Total Outward */}
            <div className="glass-card" style={{ padding: "16px", position: "relative", overflow: "hidden" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Total Outward
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: "#EF4444", display: "flex", alignItems: "center", gap: "6px" }}>
                <ArrowDownLeft size={20} />
                -{totalOutward}
              </h3>
              <div style={{ position: "absolute", right: "12px", bottom: "12px", opacity: 0.15, color: "#EF4444" }}>
                <ArrowDownLeft size={32} />
              </div>
            </div>

            {/* Net Change */}
            <div className="glass-card" style={{ padding: "16px", position: "relative", overflow: "hidden" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Net Change
              </span>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginTop: "8px",
                  color: ledgerData.netChange >= 0 ? "#10B981" : "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {ledgerData.netChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {ledgerData.netChange >= 0 ? `+${ledgerData.netChange}` : ledgerData.netChange}
              </h3>
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  bottom: "12px",
                  opacity: 0.15,
                  color: ledgerData.netChange >= 0 ? "#10B981" : "#EF4444",
                }}
              >
                {ledgerData.netChange >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
              </div>
            </div>

            {/* Closing Balance */}
            <div className="glass-card" style={{ padding: "16px", position: "relative", overflow: "hidden" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Closing Stock
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginTop: "8px", color: "var(--text-primary)" }}>
                {ledgerData.closingStock}
              </h3>
              <div style={{ position: "absolute", right: "12px", bottom: "12px", opacity: 0.15 }}>
                <Package size={32} />
              </div>
            </div>
          </div>

          {/* Ledger Entries Card */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                Ledger Rows Ledger View
              </h3>

              {/* Exports */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleExport("csv")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <Download size={14} />
                  CSV
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "#10B981",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "var(--danger)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <FileText size={14} />
                  PDF
                </button>
              </div>
            </div>

            {ledgerData.rows.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No stock transactions recorded for this product in the selected period.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ width: "18%" }}>Date</th>
                      <th style={{ width: "15%" }}>Reference</th>
                      <th style={{ width: "22%" }}>Movement Type</th>
                      <th style={{ width: "12%", textAlign: "right" }}>In Qty</th>
                      <th style={{ width: "12%", textAlign: "right" }}>Out Qty</th>
                      <th style={{ width: "12%", textAlign: "right" }}>Balance</th>
                      <th style={{ width: "20%" }}>Reason / Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening balance row helper */}
                    <tr style={{ background: "rgba(255,255,255,0.01)" }}>
                      <td style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        {startDate ? new Date(startDate).toLocaleString() : "-"}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-muted)" }}>-</td>
                      <td>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                          Opening Balance
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>-</td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>-</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                        {ledgerData.openingStock}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        Initial Stock Level for period
                      </td>
                    </tr>

                    {ledgerData.rows.map((row) => (
                      <tr key={row.id} className="hover-row">
                        <td style={{ fontSize: "11.5px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {new Date(row.date).toLocaleString()}
                        </td>
                        <td>{renderDrilldownLink(row)}</td>
                        <td>
                          <span style={getMovementTypeBadgeStyle(row.movementType)}>
                            {row.movementType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", color: "#10B981", fontWeight: 600 }}>
                          {row.inQty > 0 ? `+${row.inQty}` : ""}
                        </td>
                        <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>
                          {row.outQty > 0 ? `-${row.outQty}` : ""}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--text-primary)" }}>
                          {row.runningBalance}
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {row.reason || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ledgerData.pagination && (
                  <Pagination
                    currentPage={ledgerData.pagination.currentPage}
                    totalPages={ledgerData.pagination.totalPages}
                    totalItems={ledgerData.pagination.totalItems}
                    limit={ledgerData.pagination.limit}
                    onPageChange={handlePageChange}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryLedgerPage;
