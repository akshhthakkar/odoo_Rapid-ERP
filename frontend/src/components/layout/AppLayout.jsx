import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AppLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <Topbar />
        <main style={{
          flex: 1,
          padding: '28px',
          animation: 'fadeIn 0.25s ease',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
