import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  AlertOctagon,
  AlertTriangle,
  Info,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const AlertPanel = ({ alerts = [] }) => {
  const navigate = useNavigate();

  const getAlertConfig = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return { color: "#EF4444", bg: "rgba(239,68,68,0.06)", icon: AlertOctagon };
      case "HIGH":
        return { color: "#F97316", bg: "rgba(249,115,22,0.06)", icon: AlertTriangle };
      default:
        return { color: "#F59E0B", bg: "rgba(245,158,11,0.06)", icon: Info };
    }
  };

  return (
    <div className="glass-card" style={{ padding: "22px", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BellRing size={15} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            System Notifications
          </h3>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "6px",
            background: alerts.length > 0 ? "rgba(239,68,68,0.09)" : "rgba(16,185,129,0.09)",
            color: alerts.length > 0 ? "#EF4444" : "#10B981",
            border: `1px solid ${alerts.length > 0 ? "rgba(239,68,68,0.22)" : "rgba(16,185,129,0.22)"}`,
          }}
        >
          {alerts.length} Active
        </span>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          /* Thin scrollbar */
          scrollbarWidth: "thin",
        }}
      >
        {alerts.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "44px 0",
              gap: "10px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            <CheckCircle2 size={30} style={{ color: "#10B981" }} />
            All operations stable. No alerts.
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
                  gap: "10px",
                  /* Left accent achieved via borderLeft — no position:absolute needed */
                  borderLeft: `3px solid ${config.color}`,
                  borderTop: "1px solid transparent",
                  borderRight: "1px solid transparent",
                  borderBottom: "1px solid transparent",
                  borderRadius: "0 9px 9px 0",
                  padding: "10px 12px 10px 10px",
                  background: config.bg,
                  cursor: alert.actionUrl ? "pointer" : "default",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  if (alert.actionUrl) {
                    e.currentTarget.style.paddingLeft = "13px";
                    e.currentTarget.style.background = `${config.color}12`;
                    e.currentTarget.style.borderTopColor = `${config.color}30`;
                    e.currentTarget.style.borderRightColor = `${config.color}30`;
                    e.currentTarget.style.borderBottomColor = `${config.color}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.paddingLeft = "10px";
                  e.currentTarget.style.background = config.bg;
                  e.currentTarget.style.borderTopColor = "transparent";
                  e.currentTarget.style.borderRightColor = "transparent";
                  e.currentTarget.style.borderBottomColor = "transparent";
                }}
              >
                {/* Icon chip */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "7px",
                    background: `${config.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} style={{ color: config.color }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.4,
                    }}
                  >
                    {alert.message}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      marginTop: "3px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <span style={{ color: config.color }}>{alert.severity}</span>
                    <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>·</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {alert.type?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                {alert.actionUrl && (
                  <ArrowRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0, opacity: 0.7 }} />
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
