import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Search } from 'lucide-react';

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
  '/customers/new':   { title: 'Add Customer',       subtitle: 'Create a new customer profile' },
  '/vendors/new':     { title: 'Add Vendor',         subtitle: 'Create a new supplier profile' },
  '/workcenters/new': { title: 'Add Work Center',     subtitle: 'Create a new manufacturing assembly line' },
};

const Topbar = () => {
  const { logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Rapid Enterprise', subtitle: '' };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Left side: Breadcrumb path */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
          <span style={{ color: '#4B5563' }}>Rapid Enterprise</span>
          <span style={{ color: '#9CA3AF', margin: '0 8px' }}>/</span>
          <span style={{ color: '#1F2937', fontWeight: 600 }}>{pageInfo.title}</span>
        </div>
      </div>

      {/* Right side: Search and Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Search Input Box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search 
            size={14} 
            color="#9CA3AF" 
            style={{ 
              position: 'absolute', 
              left: '10px',
              pointerEvents: 'none',
            }} 
          />
          <input 
            type="text" 
            placeholder="Search views..." 
            style={{
              width: '180px',
              height: '32px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '9999px',
              padding: '0 36px 0 30px',
              fontSize: '12.5px',
              color: '#1F2937',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.background = '#FFFFFF';
              e.target.style.borderColor = '#FF540E';
              e.target.style.boxShadow = '0 0 0 3px rgba(255, 84, 14, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#F3F4F6';
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
          {/* Keyboard shortcut badge */}
          <div style={{
            position: 'absolute',
            right: '10px',
            background: '#E5E7EB',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            padding: '1px 4px',
            fontSize: '10px',
            color: '#4B5563',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            height: '18px',
            fontWeight: 500,
          }}>
            ⌘K
          </div>
        </div>

        {/* Logout Link */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '13px',
            fontWeight: 500,
            color: logoutHovered ? '#1F2937' : '#6B7280',
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
