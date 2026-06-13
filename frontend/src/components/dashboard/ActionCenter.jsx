import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Clock, 
  Truck, 
  CheckCircle,
  FileCheck, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

const ActionCenter = ({ sales, purchasing, manufacturing, inventory }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Out of Stock Items",
      count: inventory?.outOfStock || 0,
      severity: (inventory?.outOfStock || 0) > 0 ? "critical" : "normal",
      icon: AlertTriangle,
      color: "var(--danger)",
      path: "/inventory",
      description: "Needs immediate replenishment orders"
    },
    {
      label: "Low Stock Items",
      count: inventory?.lowStock || 0,
      severity: (inventory?.lowStock || 0) > 0 ? "warning" : "normal",
      icon: AlertTriangle,
      color: "#EAB308",
      path: "/inventory",
      description: "Running below safe reorder levels"
    },
    {
      label: "Delayed MOs",
      count: manufacturing?.delayedMOs || 0,
      severity: (manufacturing?.delayedMOs || 0) > 0 ? "critical" : "normal",
      icon: Clock,
      color: "var(--danger)",
      path: "/manufacturing",
      description: "Manufacturing orders past scheduled date"
    },
    {
      label: "Delayed POs",
      count: purchasing?.delayedPOs || 0,
      severity: (purchasing?.delayedPOs || 0) > 0 ? "critical" : "normal",
      icon: Clock,
      color: "var(--danger)",
      path: "/purchase",
      description: "Purchase deliveries past expected date"
    },
    {
      label: "Pending Deliveries",
      count: sales?.pendingDeliveries || 0,
      severity: "normal",
      icon: Truck,
      color: "var(--accent)",
      path: "/sales",
      description: "Confirmed sales orders waiting to ship"
    },
    {
      label: "Pending Replenishments",
      count: purchasing?.pendingReplenishments || 0,
      severity: "normal",
      icon: TrendingUp,
      color: "#6366F1",
      path: "/purchase",
      description: "Triggered/in-progress MTO purchase lines"
    }
  ];

  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <h3 style={{ 
        fontSize: "15px", 
        fontWeight: 700, 
        color: "var(--text-primary)", 
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <FileCheck size={18} style={{ color: "var(--accent)" }} />
        Operational Action Center
      </h3>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px"
      }}>
        {actions.map((act, idx) => {
          const Icon = act.icon;
          const hasIssues = act.count > 0;
          const bg = act.severity === "critical" && hasIssues
            ? "rgba(239, 68, 68, 0.05)"
            : act.severity === "warning" && hasIssues
              ? "rgba(234, 179, 8, 0.05)"
              : "rgba(255, 255, 255, 0.02)";
          
          const border = act.severity === "critical" && hasIssues
            ? "rgba(239, 68, 68, 0.15)"
            : act.severity === "warning" && hasIssues
              ? "rgba(234, 179, 8, 0.15)"
              : "var(--border)";

          return (
            <div
              key={idx}
              onClick={() => navigate(act.path)}
              style={{
                padding: "16px",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                background: bg,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {act.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {act.description}
                  </div>
                </div>
                
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: hasIssues ? act.color + "15" : "rgba(16, 185, 129, 0.08)"
                }}>
                  {hasIssues ? (
                    <Icon size={14} style={{ color: act.color }} />
                  ) : (
                    <CheckCircle size={14} style={{ color: "var(--success)" }} />
                  )}
                </div>
              </div>

              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px dashed var(--border)"
              }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: hasIssues ? act.color : "var(--text-primary)"
                }}>
                  {act.count}
                </div>

                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontWeight: 600
                }}>
                  Drill down
                  <ArrowRight size={12} />
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
