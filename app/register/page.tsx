'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

function InfraFlowLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, #00d4ff20, #7b2ff720)',
        border: '1px solid #00d4ff50',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M12 8L17 11v6l-5 3-5-3v-6l5-3z" fill="#00d4ff20" stroke="#00d4ff80" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ color: '#e2eaf4' }}>Infra</span>
          <span style={{ color: '#00d4ff' }}>Flow</span>
        </div>
        <div style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
          Design & Simulate
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const result = register(email.trim(), username.trim(), password);
    setLoading(false);
    if (result.ok) {
      router.push('/');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#080d14',
    border: '1px solid #1e2d3d',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#e2eaf4',
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: '#050811',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 0%, #00d4ff08 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: '#080d14',
        border: '1px solid #1e2d3d',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 24px 80px #00000080, 0 0 0 1px #00d4ff08',
        position: 'relative',
        zIndex: 1,
        margin: '24px 16px',
      }}>
        <InfraFlowLogo />

        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2eaf4' }}>Create your account</div>
          <div style={{ fontSize: 12, color: '#4a5a6a', marginTop: 6 }}>Start designing your architecture</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#636e7b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_username"
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00d4ff50'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e2d3d'; }}
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#636e7b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00d4ff50'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e2d3d'; }}
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#636e7b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00d4ff50'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e2d3d'; }}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#636e7b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00d4ff50'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e2d3d'; }}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={{
              background: '#ef444415',
              border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 13, color: '#ef4444',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#00d4ff20' : 'linear-gradient(135deg, #00d4ff20, #00d4ff30)',
              border: '1px solid #00d4ff50',
              borderRadius: 8,
              padding: '13px 0',
              color: '#00d4ff',
              fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.04em',
              marginTop: 4,
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #00d4ff30, #00d4ff50)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#00d4ff80';
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #00d4ff20, #00d4ff30)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#00d4ff50';
              }
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ fontSize: 13, color: '#4a5a6a' }}>Already have an account?{' '}</span>
          <a
            href="/login"
            style={{ fontSize: 13, color: '#00d4ff', textDecoration: 'none', fontWeight: 700 }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
