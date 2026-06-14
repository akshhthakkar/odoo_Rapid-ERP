import React from "react";
import { History, User, Clock } from "lucide-react";

const MODULE_COLORS = {
  SALES: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  PURCHASE: { color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
  MANUFACTURING: { color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  INVENTORY: { color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
  DEFAULT: { color: "#FF540E", bg: "rgba(255,84,14,0.12)" },
};

const getModuleStyle = (action = "") => {
  const upper = action.toUpperCase();
  for (const [key, val] of Object.entries(MODULE_COLORS)) {
    if (upper.includes(key)) return val;
  }
  return MODULE_COLORS.DEFAULT;
};

const RecentActivityPanel = ({ recentActivity = [] }) => {
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " · " +
        d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return isoString;
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
          marginBottom: "16px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={15} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Enterprise Activity
          </h3>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#10B981",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            padding: "3px 9px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#10B981",
              display: "inline-block",
            }}
          />
          Live
        </span>
      </div>

      {/* Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "0",
          position: "relative",
          paddingLeft: "18px",
        }}
      >
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "6px",
            top: "8px",
            bottom: "8px",
            width: "1px",
            background: "var(--border)",
          }}
        />

        {recentActivity.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
              padding: "40px 0",
            }}
          >
            No recent activity logged.
          </div>
        ) : (
          recentActivity.map((activity, idx) => {
            const style = getModuleStyle(activity.action);
            return (
              <div
                key={idx}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  padding: "10px 0 10px 4px",
                  borderBottom: idx < recentActivity.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: "absolute",
                    left: "-16px",
                    top: "16px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: style.color,
                    border: "2px solid var(--bg-card)",
                    boxShadow: `0 0 0 2px ${style.color}30`,
                  }}
                />

                {/* Action + time */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: style.color,
                      background: style.bg,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      letterSpacing: "0.3px",
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activity.action}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={9} />
                    {formatTime(activity.createdAt)}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  {activity.description}
                </div>

                {/* User */}
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <User size={10} />
                  <span>{activity.user}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentActivityPanel;
