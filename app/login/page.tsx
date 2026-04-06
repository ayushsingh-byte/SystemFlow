'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/* ─── Mini node diagram (no glows, no gradients, just clean lines) ────────── */
function NodeDiagram() {
  return (
    <svg width="100%" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: 340, display: 'block' }}>
      {/* Edges */}
      <line x1="170" y1="38" x2="80"  y2="100" stroke="#222" strokeWidth="1"/>
      <line x1="170" y1="38" x2="260" y2="100" stroke="#222" strokeWidth="1"/>
      <line x1="80"  y1="100" x2="40"  y2="180" stroke="#222" strokeWidth="1"/>
      <line x1="80"  y1="100" x2="170" y2="180" stroke="#222" strokeWidth="1"/>
      <line x1="260" y1="100" x2="170" y2="180" stroke="#222" strokeWidth="1"/>
      <line x1="260" y1="100" x2="300" y2="180" stroke="#222" strokeWidth="1"/>

      {/* Animated traffic */}
      <circle r="2.5" fill="#00d4ff" opacity="0.9">
        <animateMotion dur="2.2s" repeatCount="indefinite">
          <mpath href="#p1"/>
        </animateMotion>
      </circle>
      <circle r="2.5" fill="#818cf8" opacity="0.9">
        <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.6s">
          <mpath href="#p2"/>
        </animateMotion>
      </circle>
      <circle r="2.5" fill="#10b981" opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.2s">
          <mpath href="#p3"/>
        </animateMotion>
      </circle>

      <path id="p1" d="M170 38 L80 100 L40 180"  style={{ visibility: 'hidden' }}/>
      <path id="p2" d="M170 38 L260 100 L300 180" style={{ visibility: 'hidden' }}/>
      <path id="p3" d="M170 38 L260 100 L170 180" style={{ visibility: 'hidden' }}/>

      {/* Nodes — clean, no fill gradient, just border */}
      {/* Gateway */}
      <rect x="148" y="18" width="44" height="40" rx="8"
        fill="#0a0a0a" stroke="#00d4ff" strokeWidth="1.2"/>
      <text x="170" y="36" textAnchor="middle" fill="#00d4ff" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">GW</text>
      <text x="170" y="48" textAnchor="middle" fill="#333" fontSize="7.5"
        fontFamily="JetBrains Mono, monospace">gateway</text>

      {/* API */}
      <rect x="56" y="82" width="48" height="36" rx="7"
        fill="#0a0a0a" stroke="#818cf8" strokeWidth="1.2"/>
      <text x="80" y="98" textAnchor="middle" fill="#818cf8" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">API</text>
      <text x="80" y="110" textAnchor="middle" fill="#333" fontSize="7.5"
        fontFamily="JetBrains Mono, monospace">server</text>

      {/* Cache */}
      <rect x="236" y="82" width="48" height="36" rx="7"
        fill="#0a0a0a" stroke="#00d4ff" strokeWidth="1.2"/>
      <text x="260" y="98" textAnchor="middle" fill="#00d4ff" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">CDN</text>
      <text x="260" y="110" textAnchor="middle" fill="#333" fontSize="7.5"
        fontFamily="JetBrains Mono, monospace">cache</text>

      {/* DB */}
      <rect x="16" y="162" width="48" height="32" rx="7"
        fill="#0a0a0a" stroke="#10b981" strokeWidth="1.2"/>
      <text x="40" y="181" textAnchor="middle" fill="#10b981" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">DB</text>

      {/* Queue */}
      <rect x="146" y="162" width="48" height="32" rx="7"
        fill="#0a0a0a" stroke="#818cf8" strokeWidth="1.2"/>
      <text x="170" y="181" textAnchor="middle" fill="#818cf8" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">MQ</text>

      {/* S3 */}
      <rect x="276" y="162" width="48" height="32" rx="7"
        fill="#0a0a0a" stroke="#10b981" strokeWidth="1.2"/>
      <text x="300" y="181" textAnchor="middle" fill="#10b981" fontSize="9"
        fontFamily="JetBrains Mono, monospace" fontWeight="600">S3</text>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.replace('/'); }, [user, router]);
  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    const result = login(email.trim(), password);
    setLoading(false);
    if (result.ok) router.push('/');
    else setError(result.error || 'Invalid credentials');
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
          fontSize: 36, fontWeight: 700, lineHeight: 1.15,
          fontFamily: 'var(--font-ui)', letterSpacing: '-0.03em',
          color: '#fff', margin: 0, marginBottom: 16,
        }}>
          Design systems<br/>
          <span style={{ color: '#00d4ff' }}>that don&apos;t break.</span>
        </h1>

        <p style={{
          fontSize: 14, color: '#555', fontFamily: 'var(--font-ui)',
          lineHeight: 1.65, maxWidth: 300, marginBottom: 48, margin: '0 0 48px 0',
        }}>
          Simulate millions of requests per second,
          find bottlenecks before production does.
        </p>

        {/* Diagram */}
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 48 }}>
          <NodeDiagram />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { val: '150+', label: 'Node types' },
            { val: '1M',   label: 'req/s max' },
            { val: '10',   label: 'Templates' },
          ].map(s => (
            <div key={s.label}>
              <div style={{
                fontSize: 22, fontWeight: 700, color: '#fff',
                fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
              }}>{s.val}</div>
              <div style={{
                fontSize: 11, color: '#444', fontFamily: 'var(--font-ui)',
                marginTop: 2,
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom version */}
        <div style={{
          position: 'absolute', bottom: 28, left: 52,
          fontSize: 11, color: '#2a2a2a', fontFamily: 'var(--font-mono)',
        }}>
          v2.0 — Distributed Systems Simulator
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <p className="auth-title">Welcome back</p>
          <p className="auth-subtitle">Sign in to your workspace</p>

          <form className="auth-form" onSubmit={handleSubmit}>
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

            <div>
              <label className="sf-label">Password</label>
              <input
                type="password"
                className="sf-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-footer">
            No account?{' '}
            <a href="/register" className="auth-link">Create one free</a>
          </div>

          <div style={{
            marginTop: 28,
            padding: '13px 15px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              fontFamily: 'var(--font-ui)', marginBottom: 6,
            }}>Demo credentials</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
              demo@systemflow.dev<br/>
              <span style={{ color: 'var(--text-faint)' }}>password: demo123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
