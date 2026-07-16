import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Lock, Mail, UserPlus, Database, AlertCircle, Sparkles, CheckCircle, User, Briefcase, Building } from 'lucide-react';

export const Auth = ({ onDemoBypass }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // New SaaS Registration Fields
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('Data Analyst');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Real-time Password Strength calculation
  const [passwordStrength, setPasswordStrength] = useState({ label: '', score: 0, color: 'var(--text-muted)' });
  
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ label: '', score: 0, color: 'var(--text-muted)' });
      return;
    }
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = 'Weak';
    let color = 'var(--danger)';
    if (score >= 4) {
      label = 'Strong';
      color = 'var(--success)';
    } else if (score >= 2) {
      label = 'Medium';
      color = 'var(--warning)';
    }

    setPasswordStrength({ label, score, color });
  }, [password]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignUp && !fullName) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up with additional metadata stored in Supabase Auth user_metadata
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: company || 'Self Employed',
              job_role: jobRole
            }
          }
        });
        if (signUpErr) throw signUpErr;
        
        if (data?.user && data?.session === null) {
          setSuccessMsg("Success! Please check your email to verify your registration.");
        } else {
          setSuccessMsg("Sign up successful! Logging you in...");
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInErr) throw signInErr;
      }
    } catch (err) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Custom profile for offline demo mode
    onDemoBypass({
      user: { 
        email: email || 'demo@insightai.io', 
        id: 'demo-user-id',
        user_metadata: {
          full_name: fullName || 'Hassan Shahzad',
          company_name: company || 'Enterprise Labs',
          job_role: jobRole || 'Lead Analyst'
        }
      },
      isDemo: true
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '520px', padding: '2.5rem', position: 'relative' }}>
        
        {/* Top Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.45rem',
            marginBottom: '0.75rem',
            boxShadow: '0 8px 20px var(--primary-glow)'
          }}>
            I
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Welcome to InsightAI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Enterprise Data Analytics & Automated Dashboards
          </p>
        </div>

        {/* Database setup instructions (if not connected yet) */}
        {!isSupabaseConfigured && (
          <div className="glass-card animate-scale-in" style={{ padding: '1.25rem', borderColor: 'var(--primary-glow)', background: 'rgba(99, 102, 241, 0.03)', marginBottom: '1.5rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.4rem' }}>
              <Database size={15} /> Database Connection Pending
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              This app includes email/password account auth. To bind your live database, add your keys to a <strong>.env</strong> file in the project root.
            </p>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Sign In vs Register tab selector */}
          {isSupabaseConfigured && (
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-color)', 
              padding: '0.25rem', 
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              marginBottom: '0.25rem'
            }}>
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => { setIsSignUp(false); setError(null); setSuccessMsg(null); }}
                style={{ 
                  flex: 1, 
                  padding: '0.45rem', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: !isSignUp ? 'var(--panel-bg-solid)' : 'transparent',
                  color: !isSignUp ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  height: '34px',
                  boxShadow: !isSignUp ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => { setIsSignUp(true); setError(null); setSuccessMsg(null); }}
                style={{ 
                  flex: 1, 
                  padding: '0.45rem', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: isSignUp ? 'var(--panel-bg-solid)' : 'transparent',
                  color: isSignUp ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  height: '34px',
                  boxShadow: isSignUp ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.8rem' }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SaaS signup inputs fields (Shown only during Sign Up OR when DB is not configured to collect mock info) */}
          {(isSignUp || !isSupabaseConfigured) && (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Full Name */}
              <div className="option-group" style={{ gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Hassan Shahzad" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
                    required
                  />
                </div>
              </div>

              {/* Company / Organisation */}
              <div className="option-group" style={{ gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Company Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Acme Analytics" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
                  />
                </div>
              </div>

              {/* Job Role Dropdown */}
              <div className="option-group" style={{ gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Job Role</label>
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

            </div>
          )}

          {/* Email Address */}
          <div className="option-group" style={{ gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="search-input" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
                required
              />
            </div>
          </div>

          {/* Password & Password Strength (Hidden if signing in) */}
          <div className="option-group" style={{ gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="search-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '40px' }}
                required
              />
            </div>
            
            {/* Real-time Password Strength Meter */}
            {isSignUp && password && (
              <div className="animate-scale-in" style={{ marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Password Security:</span>
                  <strong style={{ color: passwordStrength.color }}>{passwordStrength.label}</strong>
                </div>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(passwordStrength.score / 5) * 100}%`, 
                    background: passwordStrength.color,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Submission CTAs */}
          {isSupabaseConfigured ? (
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <UserPlus size={16} />
              {loading ? "Authenticating..." : isSignUp ? "Sign Up as Client" : "Access Workspace"}
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleDemoMode}
              style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <Sparkles size={16} />
              Create Account (Bypass Offline)
            </button>
          )}

          {!isSupabaseConfigured && (
            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Entering names/roles above will customize your dashboard landing page.
              </span>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
