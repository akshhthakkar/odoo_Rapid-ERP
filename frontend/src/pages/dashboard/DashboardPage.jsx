import React from 'react';
import { useAuthStore } from '../../store/authStore';

const DashboardPage = () => {
  const { user } = useAuthStore();

  return (
    <div className="animate-fade-in">
      {/* Welcome banner */}
      <div className="glass-card" style={{
        padding: '28px 32px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(255,84,14,0.15) 0%, rgba(204,51,0,0.08) 100%)',
        border: '1px solid rgba(255,84,14,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,84,14,0.2) 0%, transparent 70%)',
          top: -100,
          right: -50,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Welcome back
          </p>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {user?.name} 👋
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: 500 }}>
            Your Mini ERP system is up and running. Modules are being activated phase by phase.
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Database', status: 'Connected', color: 'var(--success)', icon: '🗄️' },
          { label: 'Auth & RBAC', status: 'Active', color: 'var(--success)', icon: '🔐' },
          { label: 'Your Role', status: user?.role?.replace(/_/g, ' ') || '—', color: 'var(--accent)', icon: '👤' },
          { label: 'API Status', status: 'Healthy', color: 'var(--success)', icon: '⚡' },
        ].map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: 24, marginBottom: '10px' }}>{card.icon}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: card.color }}>
              {card.status}
            </div>
          </div>
        ))}
      </div>

      {/* Phase completion tracker */}
      <div className="glass-card" style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Build Progress
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { phase: 'Phase 0', label: 'Project Setup & DB Migration', done: true },
            { phase: 'Phase 1', label: 'Authentication & RBAC', done: true },
            { phase: 'Phase 2', label: 'Products, Customers, Vendors', done: false },
            { phase: 'Phase 3', label: 'Bill of Materials Builder', done: false },
            { phase: 'Phase 4', label: 'Sales Module (MTO trigger)', done: false },
            { phase: 'Phase 5', label: 'Purchase Module', done: false },
            { phase: 'Phase 6', label: 'Manufacturing Module', done: false },
            { phase: 'Phase 7', label: 'Procurement Automation Engine', done: false },
            { phase: 'Phase 8', label: 'Inventory & Audit Log', done: false },
            { phase: 'Phase 9', label: 'Dashboard KPIs', done: false },
          ].map((item) => (
            <div key={item.phase} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: item.done ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
              border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: item.done ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 12,
              }}>
                {item.done ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: item.done ? 'var(--success)' : 'var(--text-muted)', marginRight: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {item.phase}
                </span>
                <span style={{ fontSize: '13.5px', color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {item.label}
                </span>
              </div>
              <span className={`badge ${item.done ? 'badge-success' : 'badge-muted'}`}>
                {item.done ? 'Done' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
