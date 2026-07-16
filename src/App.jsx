import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { Auth } from './components/Auth';
import { UploadSection } from './components/UploadSection';
import { DataCleaner } from './components/DataCleaner';
import { DataPreview } from './components/DataPreview';
import { Dashboard } from './components/Dashboard';
import { Insights } from './components/Insights';
import { analyzeDataset } from './utils/dataProcessor';
import { generateInsights } from './utils/insightGenerator';
import { 
  Bell, 
  Search, 
  User, 
  FileSpreadsheet, 
  Grid, 
  RefreshCw, 
  LogOut,
  Sparkles,
  TrendingUp
} from 'lucide-react';

function App() {
  // Authentication states
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);

  // Data states
  const [rawData, setRawData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [cleanedData, setCleanedData] = useState(null);
  const [schema, setSchema] = useState(null);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [cleaningReport, setCleaningReport] = useState(null);

  // Navigation states
  const [currentView, setCurrentView] = useState('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Supabase Auth State Change Listener
  useEffect(() => {
    if (isSupabaseConfigured) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        setSession(initialSession);
      });

      // Listen for auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          handleResetData();
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleDemoBypass = (mockUser) => {
    setDemoUser(mockUser);
  };

  const handleLogout = async () => {
    if (demoUser) {
      setDemoUser(null);
      handleResetData();
    } else if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  // Helper reset data on logout or file change
  const handleResetData = () => {
    setRawData(null);
    setFileName('');
    setCleanedData(null);
    setSchema(null);
    setStats(null);
    setInsights(null);
    setCleaningReport(null);
    setCurrentView('upload');
  };

  const handleResetDataWithConfirm = () => {
    if (window.confirm("Are you sure you want to unload the current dataset? All cleaned data and insights will be cleared.")) {
      handleResetData();
    }
  };

  // File parsing complete
  const handleDataParsed = (data, name) => {
    setRawData(data);
    setFileName(name);
    setCleanedData(null);
    setSchema(null);
    setStats(null);
    setInsights(null);
    setCleaningReport(null);
    setCurrentView('upload');
  };

  // Imputations complete
  const handleCleaningComplete = (cleaned, inferredSchema, report) => {
    setCleanedData(cleaned);
    setSchema(inferredSchema);
    setCleaningReport(report);

    const computedStats = analyzeDataset(cleaned, inferredSchema);
    setStats(computedStats);

    const generated = generateInsights(computedStats, cleaned);
    setInsights(generated);

    // Auto route to dashboard
    setCurrentView('dashboard');
  };

  const activeUser = session?.user || demoUser?.user || null;
  const userFullName = activeUser?.user_metadata?.full_name || activeUser?.email?.split('@')[0] || 'User';

  // Render Auth screen if not logged in
  if (!activeUser) {
    return (
      <div style={{ background: 'var(--bg-gradient)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 2.25rem', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="sidebar-logo">I</div>
            <span className="sidebar-title">InsightAI</span>
          </div>
          <ThemeToggle />
        </div>
        <Auth onDemoBypass={handleDemoBypass} />
        <footer style={{ marginTop: 'auto', textAlign: 'center', padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          InsightAI v1.2.0 © 2026. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Collapsible Sidebar */}
      <Sidebar 
        currentView={currentView}
        setCurrentView={setCurrentView}
        isDataLoaded={!!cleanedData}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        userSession={{
          email: userFullName,
          isDemo: !!demoUser,
          jobRole: activeUser?.user_metadata?.job_role || 'Enterprise User'
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* Sticky Top Navigation */}
        <div className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentView !== 'upload' && (
              <button 
                onClick={() => setCurrentView('upload')}
                className="btn btn-secondary animate-scale-in"
                style={{ 
                  height: '36px', 
                  padding: '0 0.85rem', 
                  fontSize: '0.82rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  background: 'var(--panel-bg-solid)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ← Back to Prep
              </button>
            )}
            
            <div className="top-nav-search">
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search assets, databases, or help..." 
                className="search-input" 
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '36px', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div className="top-nav-actions">
            <button className="notification-bell" title="Alerts">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            
            <ThemeToggle />

            {/* Profile Avatar widget */}
            <div className="user-profile-widget">
              <div className="user-avatar">
                {userFullName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userFullName}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace views content */}
        <div className="view-panel-container">
          
          {/* Welcome Hero Area (Shown only on initial Upload view when no file is loaded) */}
          {currentView === 'upload' && !rawData && (
            <div className="welcome-hero animate-scale-in">
              <div>
                <h2>Welcome back, {userFullName}!</h2>
                <p>
                  Start your analytical session. Upload a CSV or Excel spreadsheet below to run type inference, remove duplicate records, impute values, and trigger local business intelligence insights.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1rem', borderRadius: '12px', backdropFilter: 'blur(8px)', alignItems: 'center' }}>
                <TrendingUp size={18} />
                <div style={{ fontSize: '0.75rem' }}>
                  <span style={{ display: 'block', fontWeight: 800 }}>Model Active</span>
                  <span style={{ opacity: 0.8 }}>Local profiling engine</span>
                </div>
              </div>
            </div>
          )}

          {/* Sub Panels rendering */}
          {currentView === 'upload' && !rawData && (
            <UploadSection onDataParsed={handleDataParsed} />
          )}

          {currentView === 'upload' && rawData && (
            <DataCleaner 
              rawData={rawData}
              fileName={fileName}
              onCleaningComplete={handleCleaningComplete}
            />
          )}

          {currentView === 'preview' && cleanedData && (
            <DataPreview 
              data={cleanedData}
              schema={schema}
              fileName={fileName}
            />
          )}

          {currentView === 'dashboard' && cleanedData && stats && (
            <Dashboard 
              data={cleanedData}
              schema={schema}
              stats={stats}
            />
          )}

          {currentView === 'insights' && cleanedData && stats && insights && (
            <Insights 
              stats={stats}
              data={cleanedData}
              generatedInsights={insights}
            />
          )}

        </div>

        {/* Footers */}
        <footer className="app-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <span>InsightAI Dashboard v1.2.0</span>
            <span>© 2026. All rights reserved.</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default App;
