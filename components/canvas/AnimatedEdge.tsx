'use client';

import { memo, useEffect, useRef } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { useStore } from '@/store/useStore';

const PARTICLES = [
  { delay: 0,   size: 4.5, color: '#00d4ff', trailColor: '#00d4ff', glow: '#00d4ff' },
  { delay: 90,  size: 3.0, color: '#7ee3ff', trailColor: '#00d4ff', glow: '#00d4ff' },
  { delay: 170, size: 2.0, color: '#00d4ff80', trailColor: '#00d4ff', glow: '#00d4ff' },
];

const RETURN_PARTICLES = [
  { delay: 200, size: 3.5, color: '#f97316', trailColor: '#f97316', glow: '#f97316' },
  { delay: 310, size: 2.0, color: '#fb923c', trailColor: '#f97316', glow: '#f97316' },
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
  const returnParticleRefs = useRef<ParticleRefs[]>(
    RETURN_PARTICLES.map(() => ({ circle: null, trail: null }))
  );

  // Separate tracking for timeouts (pending launches) and RAF IDs (in-flight animations)
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafIds = useRef<number[]>([]);

  const hideAll = () => {
    particleRefs.current.forEach(r => {
      if (r.circle) r.circle.style.display = 'none';
      if (r.trail) r.trail.style.display = 'none';
    });
    returnParticleRefs.current.forEach(r => {
      if (r.circle) r.circle.style.display = 'none';
      if (r.trail) r.trail.style.display = 'none';
    });
  };

  const cancelAll = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    rafIds.current.forEach(cancelAnimationFrame);
    rafIds.current = [];
  };

  const cancelPendingLaunches = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    // Do NOT cancel rafIds — let in-flight particles complete naturally
  };

  useEffect(() => {
    if (active) {
      // Fresh start: cancel everything and relaunch
      cancelAll();
      hideAll();

      if (!pathRef.current) return;
      const path = pathRef.current;
      const totalLength = path.getTotalLength();

      // Forward particles (cyan, source→target)
      PARTICLES.forEach((config, idx) => {
        const refs = particleRefs.current[idx];
        if (!refs.circle || !refs.trail) return;

        const duration = 420;

        const runParticle = () => {
          const circle = refs.circle!;
          const trail = refs.trail!;
          if (!circle || !trail) return;
          circle.style.display = 'block';
          trail.style.display = 'block';
          let startTime: number | null = null;

          const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const eased = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const pt = path.getPointAtLength(eased * totalLength);
            const trailEased = Math.max(0, eased - 0.05);
            const tpt = path.getPointAtLength(trailEased * totalLength);

            circle.setAttribute('cx', String(pt.x));
            circle.setAttribute('cy', String(pt.y));
            trail.setAttribute('cx', String(tpt.x));
            trail.setAttribute('cy', String(tpt.y));

            const alpha = progress < 0.1
              ? progress / 0.1
              : progress > 0.88
                ? (1 - progress) / 0.12
                : 1;
            circle.style.opacity = String(alpha);
            trail.style.opacity = String(alpha * 0.45);

            // No activeRef check — always run to completion
            if (progress < 1) {
              const rafId = requestAnimationFrame(step);
              rafIds.current.push(rafId);
            } else {
              circle.style.display = 'none';
              trail.style.display = 'none';
            }
          };

          const rafId = requestAnimationFrame(step);
          rafIds.current.push(rafId);
        };

        const tid = setTimeout(runParticle, config.delay);
        timeoutIds.current.push(tid);
      });

      // Return particles (orange, target→source)
      const returnDuration = 600;
      RETURN_PARTICLES.forEach((config, idx) => {
        const refs = returnParticleRefs.current[idx];
        if (!refs.circle || !refs.trail) return;

        const runReturnParticle = () => {
          const circle = refs.circle!;
          const trail = refs.trail!;
          if (!circle || !trail) return;
          circle.style.display = 'block';
          trail.style.display = 'block';
          let startTime: number | null = null;

          const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;
            const progress = Math.min(elapsed / returnDuration, 1);

            const eased = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const pt = path.getPointAtLength((1 - eased) * totalLength);
            const trailEased = Math.max(0, eased - 0.05);
            const tpt = path.getPointAtLength((1 - trailEased) * totalLength);

            circle.setAttribute('cx', String(pt.x));
            circle.setAttribute('cy', String(pt.y));
            trail.setAttribute('cx', String(tpt.x));
            trail.setAttribute('cy', String(tpt.y));

            const alpha = progress < 0.1
              ? progress / 0.1
              : progress > 0.88
                ? (1 - progress) / 0.12
                : 1;
            circle.style.opacity = String(alpha * 0.85);
            trail.style.opacity = String(alpha * 0.35);

            // No activeRef check — always run to completion
            if (progress < 1) {
              const rafId = requestAnimationFrame(step);
              rafIds.current.push(rafId);
            } else {
              circle.style.display = 'none';
              trail.style.display = 'none';
            }
          };

          const rafId = requestAnimationFrame(step);
          rafIds.current.push(rafId);
        };

        const tid = setTimeout(runReturnParticle, config.delay);
        timeoutIds.current.push(tid);
      });
    } else {
      // active=false: cancel only pending timeout launches
      // Let any in-flight RAF chains complete naturally (no visual mid-path stop)
      cancelPendingLaunches();
    }

    // Unmount cleanup
    return () => {
      cancelAll();
      hideAll();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Faint orange return glow when active */}
      {active && (
        <path
          d={edgePath} fill="none"
          stroke="#f97316" strokeWidth={6} strokeOpacity={0.04}
          strokeLinecap="round"
        />
      )}

      {/* Particles + trails (cyan, source→target) */}
      {PARTICLES.map((config, idx) => (
        <g key={`fwd-${idx}`}>
          <circle
            ref={el => { if (particleRefs.current[idx]) particleRefs.current[idx].trail = el; }}
            r={config.size * 0.6}
            fill={config.trailColor}
            style={{ display: 'none', filter: `blur(1px)` }}
          />
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

      {/* Return particles + trails (orange, target→source) */}
      {RETURN_PARTICLES.map((config, idx) => (
        <g key={`ret-${idx}`}>
          <circle
            ref={el => { if (returnParticleRefs.current[idx]) returnParticleRefs.current[idx].trail = el; }}
            r={config.size * 0.55}
            fill={config.trailColor}
            style={{ display: 'none', filter: `blur(1px)` }}
          />
          <circle
            ref={el => { if (returnParticleRefs.current[idx]) returnParticleRefs.current[idx].circle = el; }}
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
