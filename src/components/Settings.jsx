import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Settings as SettingsIcon, User, Briefcase, Building, Save, CheckCircle, Database, Layout, ShieldCheck } from 'lucide-react';

export const Settings = ({ userSession, onProfileUpdate }) => {
  const [fullName, setFullName] = useState(userSession?.email || '');
  const [company, setCompany] = useState(userSession?.companyName || 'Enterprise Labs');
  const [jobRole, setJobRole] = useState(userSession?.jobRole || 'Data Analyst');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (userSession?.isDemo) {
        // If in guest offline mode, mock update in memory
        setTimeout(() => {
          onProfileUpdate({
            fullName,
            companyName: company,
            jobRole
          });
          setMessage("Settings saved in Demo Session successfully!");
          setLoading(false);
        }, 600);
      } else {
        // Live update in Supabase auth user_metadata
        const { data, error: updateErr } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            company_name: company,
            job_role: jobRole
          }
        });
        if (updateErr) throw updateErr;

        onProfileUpdate({
          fullName,
          companyName: company,
          jobRole
        });
        setMessage("Settings synchronized with Supabase database successfully!");
      }
    } catch (err) {
      setError(err.message || "Failed to update profile settings.");
    } finally {
      if (!userSession?.isDemo) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="header-meta">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={22} style={{ color: 'var(--primary)' }} />
          Workspace Configuration
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Manage your personal workspace, auth profiles, theme designs, and database integrations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Profile Settings form */}
        <form onSubmit={handleSaveProfile} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--secondary)' }} />
            Personal Profile Settings
          </h3>

          {message && (
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.8rem' }}>
              <CheckCircle size={16} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="option-group">
            <label>Profile Full Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
                required
              />
            </div>
          </div>

          {/* Company */}
          <div className="option-group">
            <label>Enterprise Company Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Building size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
              />
            </div>
          </div>

          {/* Job Role Dropdown */}
          <div className="option-group">
            <label>Job Role Designation</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Briefcase size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 5 }} />
              <select 
                className="select-control" 
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
              >
                <option value="Data Analyst">Data Analyst</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Business Executive">Business Executive</option>
                <option value="Software Developer">Software Developer</option>
                <option value="Other">Other Role</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '150px', height: '40px', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Database Diagnostic Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: 'var(--primary)' }} />
              Database Diagnostics
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Type</span>
                <strong>{userSession?.isDemo ? 'Offline Session Bypass' : 'Supabase Live Auth'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Endpoint Domain</span>
                <span style={{ fontFamily: 'monospace' }}>liiwamthyrmkvtwgqxko.supabase.co</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SSL Link encryption</span>
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.15rem', fontWeight: 700 }}>
                  <ShieldCheck size={14} /> Active
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layout size={18} style={{ color: 'var(--accent)' }} />
              Display Layout Settings
            </h3>
            
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '0.75rem' }}>
              Your workspace current theme adapts automatic system-preference values. Accent coloring is configured to utilize <strong>Indigo & Parrot Green</strong>.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
