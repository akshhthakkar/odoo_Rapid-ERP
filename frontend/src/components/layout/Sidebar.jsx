import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useRole } from '../../hooks/useRole';

// Icons as SVG components
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard:     'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  products:      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  sales:         'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  purchase:      'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  manufacturing: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bom:           'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
  inventory:     'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M9 4v16M4 12h16',
  audit:         'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  users:         'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 11a4 4 0 100-8 4 4 0 000 8z',
};

// Navigation config per role
const NAV_ITEMS = [
  { path: '/dashboard',     label: 'Dashboard',     icon: 'dashboard',     roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'] },
  { path: '/products',      label: 'Products',      icon: 'products',      roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER'] },
  { path: '/sales',         label: 'Sales',         icon: 'sales',         roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'INVENTORY_MANAGER'] },
  { path: '/purchase',      label: 'Purchase',      icon: 'purchase',      roles: ['ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER', 'INVENTORY_MANAGER'] },
  { path: '/manufacturing', label: 'Manufacturing', icon: 'manufacturing', roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'] },
  { path: '/bom',           label: 'Bill of Materials', icon: 'bom',       roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'] },
  { path: '/inventory',     label: 'Inventory',     icon: 'inventory',     roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'] },
  { path: '/audit',         label: 'Audit Log',     icon: 'audit',         roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'] },
  { path: '/register',      label: 'Add User',      icon: 'users',         roles: ['ADMIN'] },
];

const Sidebar = () => {
  const { user } = useAuthStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 15px rgba(255, 84, 14, 0.1)',
          }}>
            <img src="/logo.png" alt="Rapid Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Rapid</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Demand to Delivery</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '2px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#FF8A58' : 'var(--text-secondary)',
              background: isActive ? 'rgba(255,84,14,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(255,84,14,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? '#FF8A58' : 'var(--text-muted)', flexShrink: 0 }}>
                  <Icon d={ICONS[item.icon]} />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div style={{
        padding: '14px 10px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          marginBottom: '8px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {role?.replace(/_/g, ' ')}
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
