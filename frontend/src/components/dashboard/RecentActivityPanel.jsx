import React from "react";
import { History, User, Calendar } from "lucide-react";

const RecentActivityPanel = ({ recentActivity = [] }) => {
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
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
          <History size={16} style={{ color: "var(--accent)" }} />
          Enterprise Activity Logs
        </h3>
        <span style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          fontWeight: 500
        }}>
          Live Feed
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        maxHeight: "340px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        position: "relative",
        paddingLeft: "12px"
      }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute",
          left: "4px",
          top: "8px",
          bottom: "8px",
          width: "2px",
          background: "var(--border)",
          zIndex: 1
        }} />

        {recentActivity.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "13px",
            padding: "40px 0",
            zIndex: 2
          }}>
            No recent activity logged.
          </div>
        ) : (
          recentActivity.map((activity, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                zIndex: 2
              }}
            >
              {/* timeline dot */}
              <div style={{
                position: "absolute",
                left: "-12px",
                top: "4px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent)",
                border: "2px solid var(--bg-card)",
                boxShadow: "0 0 0 2px var(--border)"
              }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FF540E",
                  background: "rgba(255, 84, 14, 0.08)",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}>
                  {activity.action}
                </span>
                <span style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px"
                }}>
                  <Calendar size={10} />
                  {formatTime(activity.createdAt)}
                </span>
              </div>

              <div style={{
                fontSize: "12.5px",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
                marginTop: "2px"
              }}>
                {activity.description}
              </div>

              <div style={{
                fontSize: "10.5px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "2px"
              }}>
                <User size={10} />
                <span>By {activity.user}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityPanel;
