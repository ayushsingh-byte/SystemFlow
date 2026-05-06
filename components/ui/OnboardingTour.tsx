'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

interface TourStep {
  title: string;
  description: string;
  highlight?: string[];
  spotlight?: { x: number; y: number; w: number; h: number };
  isCenter?: boolean;
  icon?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to InfraFlow!',
    description: 'InfraFlow is a professional-grade distributed system design & simulation platform. Design real architectures visually, simulate millions of requests per second, and discover performance bottlenecks — all in your browser.',
    isCenter: true,
    icon: '🏗',
  },
  {
    title: 'What You Can Build',
    description: 'Design any distributed system: e-commerce platforms, social networks, video streaming, fintech, IoT pipelines, gaming backends, and more. 150+ node types covering every real-world component you\'d use in production.',
    isCenter: true,
    highlight: ['E-Commerce', 'Social Media', 'Streaming', 'Fintech', 'IoT', 'Gaming'],
  },
  {
    title: 'Node Palette — Left Panel',
    description: 'The left panel has 150+ node types across 13 categories: Clients, Network, Compute, Servers, Database, Storage, Messaging, AWS, GCP, Azure, Security, Observability, and AI/ML. Drag any node onto the canvas to add it.',
    spotlight: { x: 0, y: 52, w: 285, h: 480 },
  },
  {
    title: 'Search & Filter Nodes',
    description: 'Use the search bar to find specific nodes instantly. Filter by category using the pills below. Type "redis", "kafka", or "load" to find what you need quickly. Category colors group related services visually.',
    spotlight: { x: 0, y: 52, w: 285, h: 175 },
  },
  {
    title: 'Premium Nodes',
    description: 'Crown-marked nodes are premium features — AWS, GCP, Azure cloud services, advanced AI/ML, and enterprise databases. You can still drag and explore them! When you drop a premium node, enter your activation code to unlock it permanently.',
    spotlight: { x: 0, y: 52, w: 285, h: 480 },
  },
  {
    title: 'Canvas — Your Design Space',
    description: 'The main canvas is your infinite workspace. Drag nodes from the left panel to place them. Use scroll to zoom in/out, click+drag on empty space to pan. The dot grid helps with alignment. All changes auto-save — no data lost on refresh.',
    spotlight: { x: 285, y: 52, w: typeof window !== 'undefined' ? window.innerWidth - 650 : 700, h: typeof window !== 'undefined' ? window.innerHeight - 200 : 500 },
  },
  {
    title: 'Connecting Nodes',
    description: 'Hover any node to see colored connection handles appear on its edges. Drag from a handle to another node to create a directed edge. Edges show live traffic particles during simulation. Click an edge to delete it.',
    spotlight: { x: 285, y: 52, w: typeof window !== 'undefined' ? window.innerWidth - 650 : 700, h: typeof window !== 'undefined' ? window.innerHeight - 200 : 500 },
  },
  {
    title: 'Canvas Controls & Mini-Map',
    description: 'Bottom-left: zoom controls. Bottom-right: interactive mini-map (drag to navigate, scroll to zoom). Top-right toolbar: Undo/Redo (Ctrl+Z), Auto-Layout (arranges nodes automatically), and Reset canvas.',
    spotlight: { x: 285, y: 52, w: typeof window !== 'undefined' ? window.innerWidth - 650 : 700, h: typeof window !== 'undefined' ? window.innerHeight - 200 : 500 },
  },
  {
    title: 'Right Sidebar — 6 Tabs',
    description: 'The right panel has 6 tabs: Config (edit node settings), Metrics (live charts & performance data), Log (per-request trace), Topology (bottleneck & SPOF analysis), Templates (load pre-built systems), Advisor (AI architecture health score).',
    spotlight: { x: typeof window !== 'undefined' ? window.innerWidth - 365 : 900, y: 52, w: 365, h: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 },
  },
  {
    title: 'Config & Metrics Tabs',
    description: 'Select any node and open the Config tab to adjust: processing time, max capacity, failure rate, circuit breaker, cache hit rate, and more. The Metrics tab shows real-time latency charts, percentiles (P50/P95/P99), throughput, and error rates for any selected node.',
    spotlight: { x: typeof window !== 'undefined' ? window.innerWidth - 365 : 900, y: 52, w: 365, h: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 },
  },
  {
    title: 'Simulation Toolbar — Bottom Bar',
    description: 'The bottom toolbar controls your simulation. 4 tabs: SIMULATE (start/stop/pause), TRAFFIC (set rate from 1 to 1M req/s), PROFILES (pre-configured test scenarios), CHAOS (failure injection). Click ▶ Run to start!',
    spotlight: { x: 0, y: typeof window !== 'undefined' ? window.innerHeight - 125 : 600, w: typeof window !== 'undefined' ? window.innerWidth : 1200, h: 120 },
  },
  {
    title: 'Traffic Patterns & Chaos Mode',
    description: 'Choose traffic patterns: Constant (steady load), Ramp (gradually increasing), Spike (burst periods), Wave (sinusoidal), or Step (step increments). Enable Chaos Mode to randomly inject node failures — watch your architecture\'s resilience in real-time!',
    spotlight: { x: 0, y: typeof window !== 'undefined' ? window.innerHeight - 125 : 600, w: typeof window !== 'undefined' ? window.innerWidth : 1200, h: 120 },
  },
  {
    title: 'Templates — Pre-Built Systems',
    description: 'Go to the Templates tab in the right sidebar to load 10 production-grade architectures: E-Commerce, Social Media, Video Streaming, Real-Time Chat, Fintech, Ride-Sharing, SaaS, IoT Pipeline, Search Engine, and Gaming Backend. Premium templates are locked — unlock with your code.',
    spotlight: { x: typeof window !== 'undefined' ? window.innerWidth - 365 : 900, y: 52, w: 365, h: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 },
  },
  {
    title: 'Architecture Advisor',
    description: 'The Advisor tab gives you an A-F health grade for your architecture. It checks for SPOFs, missing CDN/load balancer/circuit breaker, and estimates SLA uptime (e.g. 99.9% = "three nines"). Also provides a rough AWS monthly cost estimate.',
    spotlight: { x: typeof window !== 'undefined' ? window.innerWidth - 365 : 900, y: 52, w: 365, h: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 },
  },
  {
    title: "You're Ready to Design!",
    description: "Your canvas auto-saves — your work persists across browser refreshes. Start with a template to explore a production architecture, or drag nodes to build from scratch. Check your profile (top-right) to activate Premium and unlock all nodes & templates. Happy designing!",
    isCenter: true,
  },
];

export default function OnboardingTour() {
  const { isFirstLogin, tourCompleted, completeTour } = useAuthStore();
  const [step, setStep] = useState(0);

  const shouldShow = isFirstLogin && !tourCompleted;
  if (!shouldShow) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      completeTour();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSkip = () => {
    completeTour();
  };

  // Compute tooltip position
  let boxStyle: React.CSSProperties = {};
  if (current.isCenter) {
    boxStyle = {
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 500,
    };
  } else if (current.spotlight) {
    const s = current.spotlight;
    const tipWidth = 340;
    const tipH = 240;
    let tx = s.x;
    let ty = s.y + s.h + 16;
    if (typeof window !== 'undefined') {
      if (tx + tipWidth > window.innerWidth - 10) tx = window.innerWidth - tipWidth - 10;
      if (tx < 10) tx = 10;
      if (ty + tipH > window.innerHeight - 10) ty = Math.max(10, s.y - tipH - 16);
    }
    boxStyle = { left: tx, top: ty, width: tipWidth };
  } else {
    boxStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500 };
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 9999,
      pointerEvents: 'auto',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.80)',
      }} />

      {/* Spotlight highlight */}
      {!current.isCenter && current.spotlight && (
        <>
          {/* Cutout effect using box-shadow on a transparent element */}
          <div style={{
            position: 'absolute',
            left: current.spotlight.x,
            top: current.spotlight.y,
            width: current.spotlight.w,
            height: current.spotlight.h,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.82), 0 0 0 2px #00d4ff, 0 0 24px rgba(0,212,255,0.3)',
            border: '1px solid rgba(0,212,255,0.5)',
            pointerEvents: 'none',
            zIndex: 10000,
          }} />
        </>
      )}

      {/* Modal box */}
      <div style={{
        position: 'absolute',
        ...boxStyle,
        background: '#08111e',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,212,255,0.08)',
        zIndex: 10001,
      }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                height: 2.5, flex: 1, borderRadius: 2,
                background: i <= step ? 'var(--cyan)' : 'var(--border2)',
                opacity: i < step ? 0.5 : 1,
                transition: 'background 0.3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600,
        }}>
          Step {step + 1} of {TOUR_STEPS.length}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 20, fontWeight: 700, color: 'var(--text)',
          fontFamily: 'var(--font-ui)', marginBottom: 10, lineHeight: 1.25,
          letterSpacing: '-0.01em',
        }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13.5, color: 'var(--text-sec)', fontFamily: 'var(--font-ui)',
          lineHeight: 1.65, marginBottom: 18,
        }}>
          {current.description}
        </div>

        {/* Highlight tags */}
        {current.highlight && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 18 }}>
            {current.highlight.map(h => (
              <span key={h} className="chip chip-cyan" style={{ fontSize: 11 }}>
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer',
              padding: '6px 0', transition: 'color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-sec)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="btn btn-ghost"
                style={{ padding: '8px 16px' }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn btn-primary"
              style={{ padding: '9px 20px' }}
            >
              {step === 0 ? 'Start Tour' : isLast ? 'Start Designing' : 'Next'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
