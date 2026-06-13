import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Search, 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Truck, 
  Wrench, 
  Scroll, 
  Warehouse, 
  BarChart3, 
  FileText, 
  History, 
  UserPlus, 
  Users,
  CornerDownLeft
} from 'lucide-react';

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

const SEARCHABLE_ITEMS = [
  {
    path: '/dashboard',
    title: 'Dashboard Overview',
    description: 'Business KPIs, sales metrics, and pending tasks',
    keywords: ['dashboard', 'kpi', 'overview', 'home', 'summary', 'metrics'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER'],
    icon: LayoutDashboard
  },
  {
    path: '/products',
    title: 'Products List',
    description: 'Browse product catalog, pricing, SKU, and vendor configurations',
    keywords: ['product', 'sku', 'pricing', 'catalog', 'vendor mapping', 'inventory cost'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER'],
    icon: Package
  },
  {
    path: '/products/new',
    title: 'Create Product',
    description: 'Add a new product with custom SKUs and cost profiles',
    keywords: ['new product', 'add product', 'create product', 'sku setup'],
    roles: ['ADMIN', 'BUSINESS_OWNER'],
    icon: Package
  },
  {
    path: '/vendors/new',
    title: 'Create Vendor',
    description: 'Register a new supplier for procurement mappings',
    keywords: ['new vendor', 'add vendor', 'create supplier', 'purchasing vendor'],
    roles: ['ADMIN', 'PURCHASE_USER'],
    icon: Truck
  },
  {
    path: '/customers/new',
    title: 'Create Customer',
    description: 'Add a new customer profile for sales order tracking',
    keywords: ['new customer', 'add customer', 'create customer', 'client'],
    roles: ['ADMIN', 'SALES_USER'],
    icon: Users
  },
  {
    path: '/workcenters/new',
    title: 'Create Work Center',
    description: 'Define operational manufacturing work centers',
    keywords: ['new work center', 'assembly line', 'painting center', 'operational station'],
    roles: ['ADMIN'],
    icon: Wrench
  },
  {
    path: '/sales',
    title: 'Sales Orders',
    description: 'Manage sales order lifecycle, confirm stock reservation, and trigger deliveries',
    keywords: ['sales', 'orders', 'confirm sale', 'deliveries', 'customers'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER', 'INVENTORY_MANAGER'],
    icon: ShoppingBag
  },
  {
    path: '/sales/new',
    title: 'Create Sales Order',
    description: 'Create a new draft sales order for a customer',
    keywords: ['new sales order', 'create order', 'draft sale', 'sales invoice'],
    roles: ['ADMIN', 'SALES_USER'],
    icon: ShoppingBag
  },
  {
    path: '/purchase',
    title: 'Purchase Orders',
    description: 'Procure materials from suppliers, track arrivals, and confirm receipts',
    keywords: ['purchase', 'procurement', 'po', 'vendor receipts', 'goods arrival'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER', 'INVENTORY_MANAGER'],
    icon: Truck
  },
  {
    path: '/purchase/new',
    title: 'Create Purchase Order',
    description: 'Create a new procurement purchase order to a supplier',
    keywords: ['new purchase order', 'create po', 'vendor purchase', 'procure materials'],
    roles: ['ADMIN', 'PURCHASE_USER'],
    icon: Truck
  },
  {
    path: '/manufacturing',
    title: 'Manufacturing Orders',
    description: 'Monitor production status, assemble work orders, and finish goods',
    keywords: ['manufacturing', 'mo', 'work orders', 'production', 'assemble goods'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER'],
    icon: Wrench
  },
  {
    path: '/bom',
    title: 'Bills of Materials',
    description: 'View and manage recipes, components, and work sequences for items',
    keywords: ['bom', 'bill of materials', 'recipes', 'components', 'manufacturing steps'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER'],
    icon: Scroll
  },
  {
    path: '/bom/new',
    title: 'Create BoM',
    description: 'Add a new Bill of Materials recipe for finished products',
    keywords: ['new bom', 'create bill of materials', 'add recipe', 'product components'],
    roles: ['ADMIN', 'MANUFACTURING_USER'],
    icon: Scroll
  },
  {
    path: '/inventory',
    title: 'Inventory Hub & Stock Ledger',
    description: 'View physical inventory level, reserved stocks, and full audit logs',
    keywords: ['inventory', 'stock ledger', 'stock movements', 'on hand stock', 'reserved stock'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'],
    icon: Warehouse
  },
  {
    path: '/analytics',
    title: 'Analytics Dashboard',
    description: 'View key performance analytics across all operations',
    keywords: ['analytics', 'charts', 'kpis', 'trends', 'business performance'],
    roles: ['ADMIN', 'BUSINESS_OWNER'],
    icon: BarChart3
  },
  {
    path: '/analytics/sales',
    title: 'Sales Analytics',
    description: 'Track revenue, sales order counts, and customer demand trends',
    keywords: ['sales analytics', 'revenue charts', 'order trends', 'sales kpi'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'SALES_USER'],
    icon: BarChart3
  },
  {
    path: '/analytics/purchase',
    title: 'Purchase Analytics',
    description: 'Track procurement spends, vendor trends, and material receipts',
    keywords: ['purchase analytics', 'spending charts', 'vendor kpis', 'material cost trends'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER'],
    icon: BarChart3
  },
  {
    path: '/analytics/inventory',
    title: 'Inventory Analytics',
    description: 'Analyze stock turnovers, low stock warnings, and asset valuations',
    keywords: ['inventory analytics', 'stock valuation', 'low stock warning', 'turnover trends'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'],
    icon: BarChart3
  },
  {
    path: '/analytics/manufacturing',
    title: 'Manufacturing Analytics',
    description: 'Monitor work center operational hours, assembly completion rates',
    keywords: ['manufacturing analytics', 'work center load', 'mo completion rates', 'production efficiency'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'MANUFACTURING_USER'],
    icon: BarChart3
  },
  {
    path: '/reports',
    title: 'Reports & Export Hub',
    description: 'Download PDF / CSV summaries of business metrics',
    keywords: ['reports', 'export pdf', 'export csv', 'audit reports', 'downloads'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER'],
    icon: FileText
  },
  {
    path: '/audit',
    title: 'Audit Logs',
    description: 'Strict historical logs of database creations, updates, and stock reserves',
    keywords: ['audit log', 'system activity', 'history log', 'operation history', 'security logs'],
    roles: ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'],
    icon: History
  },
  {
    path: '/register',
    title: 'Invite Team Member',
    description: 'Add a new system user and set role-based access control',
    keywords: ['invite user', 'register user', 'add team member', 'rbac setup'],
    roles: ['ADMIN'],
    icon: UserPlus
  },
  {
    path: '/settings/users',
    title: 'Manage Users',
    description: 'View status, roles, and account permissions of your team members',
    keywords: ['team permission', 'manage users', 'role adjustment', 'user list'],
    roles: ['ADMIN'],
    icon: Users
  }
];

const getIconColor = (path) => {
  if (path.startsWith('/dashboard')) return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
  if (path.startsWith('/products')) return { bg: 'rgba(255, 84, 14, 0.1)', color: '#FF540E' };
  if (path.startsWith('/sales')) return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
  if (path.startsWith('/purchase')) return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' };
  if (path.startsWith('/vendors')) return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' };
  if (path.startsWith('/customers')) return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
  if (path.startsWith('/manufacturing')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
  if (path.startsWith('/bom')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
  if (path.startsWith('/workcenters')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
  if (path.startsWith('/inventory')) return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
  if (path.startsWith('/analytics')) return { bg: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' };
  if (path.startsWith('/reports')) return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' };
  if (path.startsWith('/audit')) return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748B' };
  return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6B7280' };
};

const Topbar = () => {
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Rapid ERP', subtitle: '' };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Listen to Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Dynamic role-based search and scoring
  const filteredItems = useMemo(() => {
    const role = user?.role || 'ADMIN';
    const roleItems = SEARCHABLE_ITEMS.filter((item) => item.roles.includes(role));

    if (!searchQuery.trim()) {
      // Default Quick Links (max 5)
      return roleItems.slice(0, 5);
    }

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/);

    return roleItems
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const descLower = item.description.toLowerCase();
        
        // Exact matches
        if (titleLower === query) score += 100;
        else if (titleLower.startsWith(query)) score += 60;
        else if (titleLower.includes(query)) score += 30;

        // Keyword checking
        item.keywords.forEach((kw) => {
          const kwLower = kw.toLowerCase();
          if (kwLower === query) score += 50;
          else if (kwLower.includes(query)) score += 20;
        });

        // individual word matching
        queryWords.forEach((word) => {
          if (titleLower.includes(word)) score += 10;
          if (descLower.includes(word)) score += 5;
          item.keywords.forEach((kw) => {
            if (kw.toLowerCase().includes(word)) score += 4;
          });
        });

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [searchQuery, user]);

  // Navigate using arrow keys & enter inside search bar
  const handleKeyDown = (e) => {
    if (!isFocused || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetItem = filteredItems[activeIndex];
      if (targetItem) {
        navigate(targetItem.path);
        setSearchQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    }
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
              left: '12px',
              pointerEvents: 'none',
              zIndex: 10,
            }} 
          />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search views or features..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Timeout allows onMouseDown clicks to fire on dropdown options
              setTimeout(() => setIsFocused(false), 200);
            }}
            style={{
              width: isFocused ? '380px' : '280px',
              height: '32px',
              background: isFocused ? '#FFFFFF' : '#F3F4F6',
              border: '1px solid',
              borderColor: isFocused ? '#FF540E' : '#E5E7EB',
              borderRadius: '9999px',
              padding: '0 36px 0 32px',
              fontSize: '12.5px',
              color: '#1F2937',
              outline: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isFocused ? '0 0 0 3px rgba(255, 84, 14, 0.1)' : 'none',
            }}
          />
          
          {/* Clear query button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '10px',
                color: '#9CA3AF',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}

          {/* Autocomplete / Command Search Dropdown */}
          {isFocused && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '420px',
                maxHeight: '380px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                zIndex: 100,
              }}
            >
              {/* Header section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px 10px 8px',
                borderBottom: '1px solid #F3F4F6',
                marginBottom: '4px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {searchQuery ? 'Search Results' : 'Suggested Views'}
                </span>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#FF540E', 
                  background: 'rgba(255, 84, 14, 0.08)', 
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  fontWeight: 600
                }}>
                  {user?.role ? user.role.replace('_', ' ') : 'USER'}
                </span>
              </div>

              {/* Items List */}
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const IconComponent = item.icon || Compass;
                  const isItemActive = idx === activeIndex;
                  const colors = getIconColor(item.path);

                  return (
                    <div
                      key={item.path}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input blur
                        navigate(item.path);
                        setSearchQuery('');
                        setIsFocused(false);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isItemActive ? 'rgba(255, 84, 14, 0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Icon Pane */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: colors.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IconComponent size={16} color={colors.color} />
                        </div>
                        {/* Text Pane */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isItemActive ? '#FF540E' : '#1F2937',
                            transition: 'color 0.15s ease',
                          }}>
                            {item.title}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            maxWidth: '310px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {item.description}
                          </span>
                        </div>
                      </div>

                      {/* Navigation indicator */}
                      {isItemActive && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          color: '#FF540E',
                          fontWeight: 500,
                        }}>
                          <span>Go</span>
                          <CornerDownLeft size={10} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span>No views or modules match "{searchQuery}"</span>
                  <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Try searching "sales", "vendor", "inventory", or "bom"</span>
                </div>
              )}

              {/* Footer navigation guide */}
              <div style={{
                marginTop: '6px',
                padding: '6px 8px 4px 8px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#9CA3AF',
              }}>
                <span>Press Escape to close</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                </div>
              </div>
            </div>
          )}
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
