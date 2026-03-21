'use client';

import { memo, useEffect, useRef } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { useStore } from '@/store/useStore';

const PARTICLES = [
  { delay: 0,   size: 4.5, color: '#00d4ff', trailColor: '#00d4ff', glow: '#00d4ff' },
  { delay: 90,  size: 3.0, color: '#7ee3ff', trailColor: '#00d4ff', glow: '#00d4ff' },
  { delay: 170, size: 2.0, color: '#00d4ff80', trailColor: '#00d4ff', glow: '#00d4ff' },
];

interface ParticleRefs {
  circle: SVGCircleElement | null;
  trail: SVGCircleElement | null;
}

function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd,
}: EdgeProps) {
  const active = useStore((s) => s.edgeAnimations[id]?.active ?? false);
  const edgeLoad = useStore((s) => s.edgeLoads?.[id] ?? 0);

  const maxLoad = 100;
  const thickness = 1.5 + Math.min(5, (edgeLoad / maxLoad) * 5);

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const pathRef = useRef<SVGPathElement>(null);
  const particleRefs = useRef<ParticleRefs[]>(
    PARTICLES.map(() => ({ circle: null, trail: null }))
  );
  const activeRef = useRef(false);
  const animFrames = useRef<number[]>([]);

  useEffect(() => {
    activeRef.current = active;

    // Cancel any running animations
    animFrames.current.forEach(id => cancelAnimationFrame(id));
    animFrames.current = [];

    // Hide all particles
    particleRefs.current.forEach(r => {
      if (r.circle) r.circle.style.display = 'none';
      if (r.trail) r.trail.style.display = 'none';
    });

    if (!active || !pathRef.current) return;

    const path = pathRef.current;
    const totalLength = path.getTotalLength();

    PARTICLES.forEach((config, idx) => {
      const refs = particleRefs.current[idx];
      if (!refs.circle || !refs.trail) return;

      const duration = 420; // ms for full traversal
      let startTime: number | null = null;

      const runParticle = () => {
        const circle = refs.circle!;
        const trail = refs.trail!;

        if (!circle || !trail) return;
        circle.style.display = 'block';
        trail.style.display = 'block';
        startTime = null;

        const step = (ts: number) => {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Ease in-out
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const pt = path.getPointAtLength(eased * totalLength);
          const trailProgress = Math.max(0, eased - 0.05);
          const tpt = path.getPointAtLength(trailProgress * totalLength);

          circle.setAttribute('cx', String(pt.x));
          circle.setAttribute('cy', String(pt.y));
          trail.setAttribute('cx', String(tpt.x));
          trail.setAttribute('cy', String(tpt.y));

          // Fade in/out
          const alpha = progress < 0.1
            ? progress / 0.1
            : progress > 0.88
              ? (1 - progress) / 0.12
              : 1;
          circle.style.opacity = String(alpha);
          trail.style.opacity = String(alpha * 0.45);

          if (progress < 1 && activeRef.current) {
            const rafId = requestAnimationFrame(step);
            animFrames.current.push(rafId);
          } else {
            circle.style.display = 'none';
            trail.style.display = 'none';
          }
        };

        const rafId = requestAnimationFrame(step);
        animFrames.current.push(rafId);
      };

      // Stagger launch
      const timerId = window.setTimeout(runParticle, config.delay);
      animFrames.current.push(timerId as unknown as number);
    });

    return () => {
      animFrames.current.forEach(id => {
        cancelAnimationFrame(id);
        clearTimeout(id);
      });
      animFrames.current = [];
      particleRefs.current.forEach(r => {
        if (r.circle) r.circle.style.display = 'none';
        if (r.trail) r.trail.style.display = 'none';
      });
    };
  }, [active]);

  return (
    <>
      {/* Outer glow when active */}
      {active && (
        <path
          d={edgePath} fill="none"
          stroke="#00d4ff" strokeWidth={8} strokeOpacity={0.07}
          strokeLinecap="round"
        />
      )}

      {/* Mid glow */}
      {active && (
        <path
          d={edgePath} fill="none"
          stroke="#00d4ff" strokeWidth={4} strokeOpacity={0.12}
          strokeLinecap="round"
        />
      )}

      {/* Main edge path — thickness proportional to traffic load */}
      <path
        ref={pathRef}
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        stroke={active ? '#00d4ff' : edgeLoad > 0 ? '#2a3d52' : '#1e2d3d'}
        strokeWidth={active ? Math.max(thickness, 2) : thickness}
        strokeDasharray={active ? undefined : edgeLoad > 0 ? undefined : '6 5'}
        strokeOpacity={active ? 0.85 : edgeLoad > 0 ? 0.6 : 0.4}
        style={{ transition: 'stroke 0.3s, stroke-opacity 0.3s, stroke-width 0.5s' }}
      />

      {/* Particles + trails */}
      {PARTICLES.map((config, idx) => (
        <g key={idx}>
          {/* Trail */}
          <circle
            ref={el => { if (particleRefs.current[idx]) particleRefs.current[idx].trail = el; }}
            r={config.size * 0.6}
            fill={config.trailColor}
            style={{ display: 'none', filter: `blur(1px)` }}
          />
          {/* Main particle */}
          <circle
            ref={el => { if (particleRefs.current[idx]) particleRefs.current[idx].circle = el; }}
            r={config.size}
            fill={config.color}
            style={{
              display: 'none',
              filter: `drop-shadow(0 0 ${config.size + 2}px ${config.glow}) drop-shadow(0 0 ${config.size * 2}px ${config.glow}50)`,
            }}
          />
        </g>
      ))}
    </>
  );
}

export default memo(AnimatedEdge);
