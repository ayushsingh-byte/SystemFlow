'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.replace('/'); }, [user, router]);
  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields'); return;
    }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const result = register(email.trim(), username.trim(), password);
    setLoading(false);
    if (result.ok) router.push('/');
    else setError(result.error || 'Registration failed');
  };

  return (
    <div className="auth-page">

      {/* ── Left brand panel ── */}
      <div className="auth-brand">

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid rgba(0,212,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 8L17 11v6l-5 3-5-3v-6l5-3z" fill="rgba(0,212,255,0.12)" stroke="rgba(0,212,255,0.5)" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{
            fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-ui)',
            letterSpacing: '-0.01em', color: '#fff',
          }}>
            System<span style={{ color: '#00d4ff' }}>Flow</span>
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 34, fontWeight: 700, lineHeight: 1.18,
          fontFamily: 'var(--font-ui)', letterSpacing: '-0.03em',
          color: '#fff', margin: '0 0 14px 0',
        }}>
          Build, simulate,<br/>
          <span style={{ color: '#00d4ff' }}>ship with confidence.</span>
        </h1>

        <p style={{
          fontSize: 14, color: '#555', fontFamily: 'var(--font-ui)',
          lineHeight: 1.65, maxWidth: 300, margin: '0 0 52px 0',
        }}>
          Model any distributed architecture and
          stress-test it before it ever hits production.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { n: '01', t: 'Drag & drop', d: 'Place 150+ nodes on the canvas' },
            { n: '02', t: 'Configure', d: 'Set latency, capacity, failure rates' },
            { n: '03', t: 'Simulate', d: 'Run up to 1M req/s, watch it live' },
            { n: '04', t: 'Optimize', d: 'Fix bottlenecks with AI advisor' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: '#00d4ff', opacity: 0.5, paddingTop: 2, flexShrink: 0,
                letterSpacing: '0.05em',
              }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', fontFamily: 'var(--font-ui)' }}>{s.t}</div>
                <div style={{ fontSize: 12, color: '#444', fontFamily: 'var(--font-ui)', marginTop: 1 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          position: 'absolute', bottom: 28, left: 52,
          fontSize: 11, color: '#2a2a2a', fontFamily: 'var(--font-mono)',
        }}>
          v2.0 — Free to start, no credit card
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <p className="auth-title">Create your account</p>
          <p className="auth-subtitle">Free forever. Upgrade when you need it.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="sf-label">Username</label>
              <input
                type="text"
                className="sf-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="sf-label">Email address</label>
              <input
                type="email"
                className="sf-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="sf-label">Password</label>
                <input
                  type="password"
                  className="sf-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="min 6 chars"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="sf-label">Confirm</label>
                <input
                  type="password"
                  className="sf-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="repeat"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', marginTop: 4 }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <a href="/login" className="auth-link">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
