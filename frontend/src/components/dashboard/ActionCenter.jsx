import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle,
  FileCheck,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

const ActionCenter = ({ sales, purchasing, manufacturing, inventory }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Out of Stock",
      count: inventory?.outOfStock || 0,
      severity: (inventory?.outOfStock || 0) > 0 ? "critical" : "ok",
      icon: AlertTriangle,
      path: "/inventory",
      description: "Needs immediate replenishment",
    },
    {
      label: "Low Stock Items",
      count: inventory?.lowStock || 0,
      severity: (inventory?.lowStock || 0) > 0 ? "warning" : "ok",
      icon: AlertTriangle,
      path: "/inventory",
      description: "Below safe reorder levels",
    },
    {
      label: "Delayed MOs",
      count: manufacturing?.delayedMOs || 0,
      severity: (manufacturing?.delayedMOs || 0) > 0 ? "critical" : "ok",
      icon: Clock,
      path: "/manufacturing",
      description: "Past scheduled date",
    },
    {
      label: "Delayed POs",
      count: purchasing?.delayedPOs || 0,
      severity: (purchasing?.delayedPOs || 0) > 0 ? "critical" : "ok",
      icon: Clock,
      path: "/purchase",
      description: "Past expected delivery date",
    },
    {
      label: "Pending Deliveries",
      count: sales?.pendingDeliveries || 0,
      severity: "normal",
      icon: Truck,
      path: "/sales",
      description: "Waiting to ship",
    },
    {
      label: "Replenishments",
      count: purchasing?.pendingReplenishments || 0,
      severity: "normal",
      icon: TrendingUp,
      path: "/purchase",
      description: "MTO purchase lines active",
    },
  ];

  // Critical = red (danger signal), warning = orange, normal/ok = light orange
  const getSeverityStyles = (severity, hasIssues) => {
    if (!hasIssues) return { bg: "transparent", border: "var(--border)", color: "#FF540E" };
    if (severity === "critical") return { bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.22)", color: "#DC2626" };
    if (severity === "warning") return { bg: "rgba(255,84,14,0.05)", border: "rgba(255,84,14,0.22)", color: "#FF540E" };
    return { bg: "rgba(255,140,66,0.05)", border: "rgba(255,140,66,0.22)", color: "#FF8C42" };
  };

  const issueCount = actions.filter((a) => a.count > 0 && a.severity !== "normal").length;

  return (
    <div className="glass-card" style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "rgba(255,84,14,0.08)",
              border: "1px solid rgba(255,84,14,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileCheck size={15} style={{ color: "#FF540E" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Operational Action Center
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
              Critical items requiring your attention
            </p>
          </div>
        </div>

        {/* Issues badge — orange always */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: issueCount > 0 ? "#CC3300" : "#FF8C42",
            background: issueCount > 0 ? "rgba(204,51,0,0.08)" : "rgba(255,140,66,0.08)",
            border: `1px solid ${issueCount > 0 ? "rgba(204,51,0,0.22)" : "rgba(255,140,66,0.22)"}`,
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          {issueCount} Issues
        </div>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {actions.map((act, idx) => {
          const Icon = act.icon;
          const hasIssues = act.count > 0;
          const styles = getSeverityStyles(act.severity, hasIssues);

          return (
            <div
              key={idx}
              onClick={() => navigate(act.path)}
              style={{
                padding: "16px 18px",
                borderRadius: "12px",
                border: `1px solid ${styles.border}`,
                background: styles.bg,
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "#FF540E";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,84,14,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = styles.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Top glow line on issues */}
              {hasIssues && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: `linear-gradient(to right, transparent, ${styles.color}, transparent)`,
                  }}
                />
              )}

              {/* Label + icon row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {act.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {act.description}
                  </div>
                </div>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: hasIssues ? `${styles.color}18` : "rgba(255,84,14,0.07)",
                    flexShrink: 0,
                  }}
                >
                  {hasIssues ? (
                    <Icon size={13} style={{ color: styles.color }} />
                  ) : (
                    <CheckCircle size={13} style={{ color: "#FF8C42" }} />
                  )}
                </div>
              </div>

              {/* Count + drill down */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255,84,14,0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: hasIssues ? styles.color : "var(--text-muted)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {act.count}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    fontSize: "10.5px",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Drill down <ArrowUpRight size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionCenter;
