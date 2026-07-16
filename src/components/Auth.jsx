import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Lock, Mail, UserPlus, Database, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

export const Auth = ({ onDemoBypass }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password
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
    onDemoBypass({
      user: { email: 'demo@insightai.io', id: 'demo-user-id' },
      isDemo: true
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', position: 'relative' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px var(--primary-glow)'
          }}>
            I
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Welcome to InsightAI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            AI-powered data prep & interactive business dashboards
          </p>
        </div>

        {/* Database Not Connected Alert */}
        {!isSupabaseConfigured ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.05)', 
              border: '1px solid rgba(99, 102, 241, 0.15)', 
              borderRadius: '12px', 
              padding: '1.25rem',
              textAlign: 'left'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <Database size={16} /> Supabase Connection Guide
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                You can run database login states by creating a <strong>.env</strong> file in the root folder with these keys:
              </p>
              <pre style={{ 
                background: 'var(--bg-color)', 
                padding: '0.75rem', 
                borderRadius: '6px', 
                fontSize: '0.72rem', 
                overflowX: 'auto',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                border: '1px solid var(--border-color)'
              }}>
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
              </pre>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleDemoMode}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', height: '46px' }}
            >
              <Sparkles size={16} /> Continue in Offline Demo Mode
            </button>
          </div>
        ) : (
          /* Supabase Login Form */
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Toggle tabs */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-color)', 
              padding: '0.25rem', 
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              marginBottom: '0.5rem'
            }}>
              <button 
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); setSuccessMsg(null); }}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: !isSignUp ? 'var(--panel-bg-solid)' : 'transparent',
                  color: !isSignUp ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: !isSignUp ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); setSuccessMsg(null); }}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: isSignUp ? 'var(--panel-bg-solid)' : 'transparent',
                  color: isSignUp ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: isSignUp ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.05)', 
                border: '1px solid rgba(239, 68, 68, 0.15)', 
                borderRadius: '8px', 
                padding: '0.75rem 1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--danger)',
                fontSize: '0.8rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.05)', 
                border: '1px solid rgba(34, 197, 94, 0.15)', 
                borderRadius: '8px', 
                padding: '0.75rem 1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--success)',
                fontSize: '0.8rem'
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="option-group" style={{ gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="search-input" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '42px' }}
                  required
                />
              </div>
            </div>

            <div className="option-group" style={{ gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="search-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%', minWidth: 'unset', height: '42px' }}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              {isSignUp ? <UserPlus size={16} /> : <Lock size={16} />}
              {loading ? "Authenticating..." : isSignUp ? "Create SaaS Account" : "Sign In to Dashboard"}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleDemoMode}
              style={{ width: '100%', height: '44px', fontSize: '0.85rem' }}
            >
              Skip & Continue as Guest
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
