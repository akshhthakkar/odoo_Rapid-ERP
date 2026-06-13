import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  BellRing, 
  AlertOctagon, 
  AlertTriangle, 
  Info,
  ArrowRight
} from "lucide-react";

const AlertPanel = ({ alerts = [] }) => {
  const navigate = useNavigate();

  const getAlertConfig = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          color: "var(--danger)",
          bg: "rgba(239, 68, 68, 0.08)",
          icon: AlertOctagon
        };
      case "HIGH":
        return {
          color: "#F97316", // Orange
          bg: "rgba(249, 115, 22, 0.08)",
          icon: AlertTriangle
        };
      default:
        return {
          color: "#EAB308", // Yellow
          bg: "rgba(234, 179, 8, 0.08)",
          icon: Info
        };
    }
  };

  return (
    <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid var(--border)"
      }}>
        <h3 style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <BellRing size={16} style={{ color: "var(--accent)" }} />
          System Notifications & Alerts
        </h3>
        <span style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-muted)",
          background: "var(--bg-primary)",
          padding: "2px 8px",
          borderRadius: "4px"
        }}>
          {alerts.length} Active
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        maxHeight: "340px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        {alerts.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            color: "var(--text-muted)",
            fontSize: "13px",
            padding: "40px 0"
          }}>
            <Info size={32} style={{ color: "var(--success)", marginBottom: "8px" }} />
            No alerts generated. All operations stable.
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const config = getAlertConfig(alert.severity);
            const Icon = config.icon;
            
            return (
              <div
                key={idx}
                onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  borderRadius: "8px",
                  background: config.bg,
                  border: `1px solid ${config.color}20`,
                  cursor: alert.actionUrl ? "pointer" : "default",
                  transition: "transform 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  if (alert.actionUrl) {
                    e.currentTarget.style.transform = "translateX(2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (alert.actionUrl) {
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Icon size={14} style={{ color: config.color }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {alert.message}
                    </div>
                    <div style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span style={{ color: config.color }}>{alert.severity}</span>
                      <span>•</span>
                      <span>{alert.type?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>

                {alert.actionUrl && (
                  <ArrowRight size={14} style={{ color: "var(--text-muted)", marginLeft: "8px" }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
