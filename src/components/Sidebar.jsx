import React from 'react';
import { 
  Upload, 
  Sparkles, 
  BarChart3, 
  Table, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  SlidersHorizontal,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar = ({ 
  currentView, 
  setCurrentView, 
  isDataLoaded, 
  collapsed, 
  setCollapsed,
  userSession,
  onLogout 
}) => {
  
  const menuItems = [
    { id: 'upload', label: 'Upload Dataset', icon: Upload, requiresData: false },
    { id: 'preview', label: 'Data Preview', icon: Table, requiresData: true },
    { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3, requiresData: true },
    { id: 'insights', label: 'AI Insights', icon: Sparkles, requiresData: true },
    { id: 'reports', label: 'Reports', icon: FileText, requiresData: true },
    { id: 'settings', label: 'Settings', icon: Settings, requiresData: false },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      
      {/* Brand Logo Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">I</div>
        <span className="sidebar-title">InsightAI</span>
      </div>

      {/* Main Menu Links */}
      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isLocked = item.requiresData && !isDataLoaded;
          const isActive = currentView === item.id;

          if (item.isMock) {
            return (
              <li key={item.id}>
                <button
                  className="sidebar-item inactive-mock"
                  onClick={() => alert(`${item.label} feature is coming soon in the next Enterprise update!`)}
                  title={`${item.label} (Coming Soon)`}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Icon size={18} />
                  <span className="sidebar-item-text">{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <button
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => !isLocked && setCurrentView(item.id)}
                disabled={isLocked}
                title={isLocked ? 'Please upload a dataset first' : item.label}
                style={{
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Icon size={18} />
                <span className="sidebar-item-text">{item.label}</span>
                {isLocked && !collapsed && (
                  <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Sidebar Footer Controls */}
      <div className="sidebar-footer">
        
        {/* Toggle Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span className="sidebar-item-text">Collapse Menu</span>
        </button>

        {/* User profile & Logout */}
        {userSession && (
          <div className="sidebar-user-section animate-scale-in">
            <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '0.75rem' }}>
              {userSession.email.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="sidebar-user-info" style={{ flex: 1 }}>
                  <span className="sidebar-user-email">{userSession.email}</span>
                  <span className="sidebar-user-role">{userSession.jobRole}</span>
                </div>
                <button 
                  onClick={onLogout}
                  title="Sign Out"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
                    borderRadius: '4px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
