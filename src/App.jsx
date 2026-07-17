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
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card animate-scale-in" style={{ padding: '3rem', margin: '2rem auto', maxWidth: '800px', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.03)' }}>
          <h2 style={{ color: 'var(--danger)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Application Render Crash Detected
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
            InsightAI encountered an unexpected error during dashboard rendering. Here is the technical diagnostic data:
          </p>
          <pre style={{ background: 'var(--panel-bg-solid)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--danger)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {this.state.error && this.state.error.toString()}
            {"\n\nComponent Stack Trace:\n"}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1.5rem', height: '40px' }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Static bypass session setup (bypasses login/Supabase auth completely)
  const staticSession = {
    user: { 
      email: 'user@insightai.io', 
      id: 'user-id',
      user_metadata: {
        full_name: 'Enterprise User',
        job_role: 'Data Analyst'
      }
    }
  };

  const [session, setSession] = useState(staticSession);
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

  const handleLogout = () => {
    // Unloads active file session
    handleResetData();
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

  const handleProfileUpdate = (profileData) => {
    if (demoUser) {
      setDemoUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            user_metadata: {
              ...prev.user.user_metadata,
              full_name: profileData.fullName,
              company_name: profileData.companyName,
              job_role: profileData.jobRole
            }
          }
        };
      });
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setSession(prev => {
            if (!prev) return null;
            return {
              ...prev,
              user
            };
          });
        }
      });
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
    try {
      if (!cleaned || cleaned.length === 0) {
        throw new Error("The cleaning configuration resulted in an empty dataset (0 rows remaining). Please adjust your settings (e.g., do not delete rows with missing values).");
      }

      setCleanedData(cleaned);
      setSchema(inferredSchema);
      setCleaningReport(report);

      const computedStats = analyzeDataset(cleaned, inferredSchema);
      if (!computedStats) {
        throw new Error("Failed to compute statistical summary metrics for the cleaned dataset.");
      }
      setStats(computedStats);

      const generated = generateInsights(computedStats, cleaned);
      setInsights(generated);

      // Auto route to dashboard
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Dataset Analysis Failed:", err);
      alert(`Analysis Failed:\n${err.message}\n\nPlease verify your cleaning rules in the Settings panel.`);
      // Reset variables but KEEP rawData so the user stays on the Cleaner screen!
      setCleanedData(null);
      setSchema(null);
      setStats(null);
      setInsights(null);
      setCleaningReport(null);
      setCurrentView('upload');
    }
  };

  const activeUser = session?.user || null;
  const userFullName = activeUser?.user_metadata?.full_name || 'Enterprise User';

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
            {rawData && (
              <button 
                onClick={handleResetDataWithConfirm}
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
                title="Unload current dataset and start over"
              >
                Reset Data
              </button>
            )}

            <button className="notification-bell" title="Alerts">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            
            <ThemeToggle />

            {/* Profile Avatar widget removed */}
          </div>
        </div>

        {/* Workspace views content */}
        <div className="view-panel-container">
          
          {/* Welcome Hero Area (Shown only on initial Upload view when no file is loaded) */}
          {currentView === 'upload' && !rawData && (
            <div className="welcome-hero animate-scale-in">
              <div>
                <h2>Welcome to InsightAI</h2>
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
          <ErrorBoundary>
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

            {currentView === 'reports' && cleanedData && stats && (
              <Reports 
                data={cleanedData}
                schema={schema}
                stats={stats}
                fileName={fileName}
              />
            )}

            {currentView === 'settings' && (
              <Settings 
                userSession={{
                  email: userFullName,
                  companyName: activeUser?.user_metadata?.company_name || 'Enterprise Labs',
                  jobRole: activeUser?.user_metadata?.job_role || 'Data Analyst',
                  isDemo: !!demoUser
                }}
                onProfileUpdate={handleProfileUpdate}
              />
            )}

            {/* Fallback for active view with missing data */}
            {['preview', 'dashboard', 'insights', 'reports'].includes(currentView) && (!cleanedData || !stats) && (
              <div className="glass-card animate-scale-in" style={{ padding: '3.5rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>No Cleaned Dataset Active</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.88rem' }}>
                  Please upload and prepare a dataset to view the charts and analytics.
                </p>
                <button className="btn btn-primary" onClick={() => setCurrentView('upload')}>
                  Go to Upload / Clean
                </button>
              </div>
            )}
          </ErrorBoundary>

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
