import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard',          subtitle: 'Overview of your business' },
  '/products':      { title: 'Products',           subtitle: 'Manage your product catalog' },
  '/sales':         { title: 'Sales Orders',       subtitle: 'Track and manage customer orders' },
  '/purchase':      { title: 'Purchase Orders',    subtitle: 'Manage vendor procurement' },
  '/manufacturing': { title: 'Manufacturing',      subtitle: 'Production orders and work centers' },
  '/bom':           { title: 'Bill of Materials',  subtitle: 'Product recipes and operations' },
  '/inventory':     { title: 'Inventory',          subtitle: 'Stock ledger and movements' },
  '/audit':         { title: 'Audit Log',          subtitle: 'Full system activity trail' },
  '/register':      { title: 'Add User',           subtitle: 'Create a new team member account' },
};

const Topbar = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Mini ERP', subtitle: '' };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(13, 17, 23, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {pageInfo.subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Role badge */}
        <span className="badge badge-accent">
          {user?.role?.replace(/_/g, ' ')}
        </span>

        {/* Avatar */}
        <div style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          color: 'white',
          cursor: 'default',
          boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
        }}
        title={user?.name}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
