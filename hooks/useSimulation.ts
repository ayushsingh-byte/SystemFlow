'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { simulationEngine, SimulationEvent } from '@/simulation/engine';
import {
  SimulationMetrics, RequestLogEntry, TrafficPattern, NodeData,
} from '@/simulation/types';

export function useSimulation() {
  const {
    nodes, edges, simConfig,
    setMetrics, setNodeStatus, setEdgeAnimation, setSimConfig,
    resetNodeStatuses, appendRequestLog, setEdgeLoad,
  } = useStore();

  const edgeFlashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    simulationEngine.updateGraph(nodes, edges);
  }, [nodes, edges]);

  useEffect(() => {
    const unsub = simulationEngine.on((event: SimulationEvent) => {
      switch (event.type) {
        case 'node_status_changed': {
          if (event.nodeId && event.data) {
            const d = event.data as {
              status: NodeData['status'];
              currentLoad: number;
              queue_size?: number;
              dropped_requests?: number;
            };
            setNodeStatus(event.nodeId, d.status, d.currentLoad);
          }
          break;
        }
        case 'edge_animated': {
          if (event.edgeId) {
            setEdgeAnimation(event.edgeId, true);
            const prev = edgeFlashTimers.current.get(event.edgeId);
            if (prev) clearTimeout(prev);
            const t = setTimeout(() => setEdgeAnimation(event.edgeId!, false), 450);
            edgeFlashTimers.current.set(event.edgeId, t);
          }
          break;
        }
        case 'metrics_updated': {
          if (event.data) {
            const raw = event.data as SimulationMetrics & { edgeLoads?: Record<string, number> };
            const { edgeLoads, ...metricsOnly } = raw;
            setMetrics(metricsOnly as SimulationMetrics);
            if (edgeLoads) {
              for (const [edgeId, load] of Object.entries(edgeLoads)) {
                setEdgeLoad(edgeId, load);
              }
            }
          }
          break;
        }
        case 'request_moved': {
          if (event.data) {
            const d = event.data as { log?: RequestLogEntry };
            if (d.log) appendRequestLog(d.log);
          }
          break;
        }
        case 'request_failed': {
          // Could trigger alerts or special UI states in the future
          break;
        }
        case 'alert': {
          // Future: show toast notification
          break;
        }
      }
    });
    return unsub;
  }, [setMetrics, setNodeStatus, setEdgeAnimation, appendRequestLog, setEdgeLoad]);

  const startSimulation = useCallback(() => {
    simulationEngine.setTrafficRate(simConfig.trafficRate);
    simulationEngine.setFailureInjection(simConfig.failureInjection);
    simulationEngine.setTrafficPattern(simConfig.trafficPattern);
    simulationEngine.start();
    setSimConfig({ running: true, paused: false });
  }, [simConfig, setSimConfig]);

  const pauseSimulation = useCallback(() => {
    simulationEngine.pause();
    setSimConfig({ paused: true });
  }, [setSimConfig]);

  const resumeSimulation = useCallback(() => {
    simulationEngine.resume();
    setSimConfig({ paused: false });
  }, [setSimConfig]);

  const stopSimulation = useCallback(() => {
    simulationEngine.stop();
    resetNodeStatuses();
    setSimConfig({ running: false, paused: false, elapsedSeconds: 0 });
    setMetrics({
      totalRequests: 0, completedRequests: 0, failedRequests: 0,
      avgLatency: 0, percentiles: { p50: 0, p95: 0, p99: 0 },
      throughput: 0, errorRate: 0, timeSeriesData: [], nodeMetrics: {},
      healthScore: { score: 100, grade: 'A', bottleneck: null, suggestions: [] },
    });
  }, [setSimConfig, resetNodeStatuses, setMetrics]);

  const setTrafficRate = useCallback((rate: number) => {
    const clamped = Math.max(1, Math.min(1000000, rate));
    setSimConfig({ trafficRate: clamped });
    simulationEngine.setTrafficRate(clamped);
  }, [setSimConfig]);

  const toggleFailureInjection = useCallback((enabled: boolean) => {
    setSimConfig({ failureInjection: enabled });
    simulationEngine.setFailureInjection(enabled);
  }, [setSimConfig]);

  const setTrafficPattern = useCallback((pattern: TrafficPattern) => {
    setSimConfig({ trafficPattern: pattern });
    simulationEngine.setTrafficPattern(pattern);
  }, [setSimConfig]);

  return {
    startSimulation, pauseSimulation, resumeSimulation, stopSimulation,
    setTrafficRate, toggleFailureInjection, setTrafficPattern,
  };
}
