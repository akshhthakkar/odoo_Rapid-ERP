import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Package,
  BadgeDollarSign,
  ShoppingCart,
  Factory,
  ClipboardList,
  Boxes,
  History,
  UserPlus,
  BarChart3,
  FileDown
} from 'lucide-react';
import rapidLogo from '../../assets/rapid-logo.png';

const ICON_COMPONENTS = {
  dashboard: LayoutDashboard,
  products: Package,
  sales: BadgeDollarSign,
  purchase: ShoppingCart,
  manufacturing: Factory,
  bom: ClipboardList,
  inventory: Boxes,
  audit: History,
  users: UserPlus,
  analytics: BarChart3,
  reports: FileDown,
};

const SECTIONS = [
  {
    title: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'BUSINESS_OWNER'] },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/products', label: 'Products', icon: 'products', roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER'] },
      { path: '/sales', label: 'Sales', icon: 'sales', roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'INVENTORY_MANAGER'] },
      { path: '/purchase', label: 'Purchase', icon: 'purchase', roles: ['ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER', 'INVENTORY_MANAGER'] },
      { path: '/manufacturing', label: 'Manufacturing', icon: 'manufacturing', roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER'] },
      { path: '/bom', label: 'Bill of Materials', icon: 'bom', roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER'] },
      { path: '/inventory', label: 'Inventory', icon: 'inventory', roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'] },
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/analytics', label: 'Analytics', icon: 'analytics', roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'] },
      { path: '/reports', label: 'Reports', icon: 'reports', roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'] },
      { path: '/audit', label: 'Audit Log', icon: 'audit', roles: ['ADMIN', 'BUSINESS_OWNER'] },
      { path: '/settings/users', label: 'Users', icon: 'users', roles: ['ADMIN'] },
    ]
  }
];

const Sidebar = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const [hoveredPath, setHoveredPath] = useState(null);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #E5E7EB',
        flexShrink: 0,
      }}>
        <Link to="/" style={{ display: 'block', width: '100%', outline: 'none' }}>
          <img src={rapidLogo} alt="RAPID" style={{ width: '100%', maxHeight: '90px', objectFit: 'contain', objectPosition: 'left center', cursor: 'pointer' }} />
        </Link>
      </div>

      {/* Navigation */}
      <nav data-lenis-prevent style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', minHeight: 0 }}>
        {SECTIONS.map((section) => {
          // Filter visible items in this section based on user role
          const visibleItems = section.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#9CA3AF',
                letterSpacing: '1px',
                padding: '0 12px 6px',
                textTransform: 'uppercase',
              }}>
                {section.title}
              </div>
              <div>
                {visibleItems.map((item) => {
                  const Icon = ICON_COMPONENTS[item.icon];
                  const isHovered = hoveredPath === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      onMouseEnter={() => setHoveredPath(item.path)}
                      onMouseLeave={() => setHoveredPath(null)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        marginBottom: '2px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive 
                          ? '#FFFFFF' 
                          : (isHovered ? '#FF540E' : '#4B5563'),
                        background: isActive 
                          ? '#FF540E' 
                          : (isHovered ? 'rgba(255,84,14,0.05)' : 'transparent'),
                        transition: 'all 0.15s ease',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <span style={{ 
                            color: isActive ? '#FFFFFF' : (isHovered ? '#FF540E' : '#9CA3AF'), 
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}>
                            {Icon && <Icon size={18} strokeWidth={2.2} />}
                          </span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{
        padding: '16px 20px 24px',
        borderTop: '1px solid #E5E7EB',
        flexShrink: 0,
      }}>
        {/* Profile row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Avatar */}
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #FF540E, #CC3300)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(255,84,14,0.2)',
          }}>
            {initials}
          </div>
          {/* Name & Role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#1F2937', 
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.name || 'Dev Tailor'}
            </div>
            <div style={{ marginTop: '2px' }}>
              <span style={{ 
                display: 'inline-flex',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 600,
                background: 'rgba(255, 84, 14, 0.08)',
                color: '#FF540E',
                textTransform: 'capitalize',
              }}>
                {role?.replace(/_/g, ' ')?.toLowerCase() || 'owner'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
