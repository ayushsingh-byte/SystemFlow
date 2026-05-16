// SystemFlow — simulation engine hook

const { useEffect: useEffect_sim, useRef: useRef_sim } = React;

// ── Crash reason analysis ────────────────────────────────────────────────────
// Returns { code, text, fix } explaining WHY the node crashed
function analyzeCrashReason(nc, load, nodeErr, saturation, cpuFactor, currentRate, activeNodeCount) {
  const cpu          = nc.cpu     || 60;
  const maxConn      = nc.maxConn || 1000;
  const timeout      = nc.timeout || 30;
  const retries      = nc.retries || 3;
  const trafficPerNode = Math.round(currentRate / Math.max(1, activeNodeCount));

  // Priority order: most specific cause first
  if (saturation > 2.0) {
    return {
      code: "CONNECTION_SATURATION",
      text: `maxConn (${maxConn}) saturated — ${trafficPerNode} req/s per node`,
      fix:  `Increase maxConn to ${Math.ceil(trafficPerNode * 1.6)} or add replicas (What-if tab)`,
    };
  }
  if (cpuFactor > 2.8 && load >= 0.95) {
    return {
      code: "CPU_OVERLOAD",
      text: `CPU (${cpu} cores) cannot handle load at ${trafficPerNode} req/s`,
      fix:  `Increase CPU to ${Math.min(128, cpu * 3)} cores in Config panel`,
    };
  }
  if (timeout < 15 && nodeErr > 0.5) {
    return {
      code: "TIMEOUT_CASCADE",
      text: `Timeout ${timeout}s too short — cascading ${(nodeErr * 100).toFixed(0)}% error rate`,
      fix:  `Increase timeout to 30s+ in Config panel`,
    };
  }
  if (retries < 2 && nodeErr > 0.4) {
    return {
      code: "RETRY_EXHAUSTION",
      text: `${retries} retr${retries === 1 ? "y" : "ies"} not enough to absorb failure cascade`,
      fix:  `Set retries to 3–5 in Config panel`,
    };
  }
  if (load >= 0.99) {
    return {
      code: "TRAFFIC_OVERLOAD",
      text: `Traffic ${trafficPerNode} req/s sustained overload — node capacity exceeded`,
      fix:  `Add replicas (What-if tab) or reduce traffic rate`,
    };
  }
  return {
    code: "CASCADING_FAILURE",
    text: `Error cascade from upstream: ${(nodeErr * 100).toFixed(0)}% error rate overwhelmed node`,
    fix:  `Increase retries + maxConn, or fix upstream node first`,
  };
}

// ── Recovery check: returns true if config improved enough to attempt recovery ─
function configImproved(current, atCrash) {
  const cpu     = (current.cpu     || 60)   > (atCrash.cpu     || 60)   * 1.15;
  const maxConn = (current.maxConn || 1000) > (atCrash.maxConn || 1000) * 1.15;
  const timeout = (current.timeout || 30)   > (atCrash.timeout || 30)   * 1.15;
  const retries = (current.retries || 3)    > (atCrash.retries || 3);
  return cpu || maxConn || timeout || retries;
}

function useSimulationEngine() {
  const store = window.useStore();
  const {
    simConfig, setSimConfig, setMetrics, setRequestLog, setNodeHealth, nodes, edges,
    setChaosKilledNodes, setBottleneckNodeId, setSimulationHistory, whatIfOverrides,
    setCrashedNodes, setCrashAlerts,
  } = store;

  const tickRef      = useRef_sim(0);
  const startRef     = useRef_sim(Date.now());
  const intervalRef  = useRef_sim(null);
  const nodesRef     = useRef_sim(nodes);
  const edgesRef     = useRef_sim(edges);
  const cfgRef       = useRef_sim(simConfig);
  const whatIfRef    = useRef_sim(whatIfOverrides);

  // crashedRef: nodeId → { config: {cpu,maxConn,timeout,retries}, reason: {code,text,fix}, crashedAt }
  const crashedRef      = useRef_sim({});
  const overloadCntRef  = useRef_sim({});
  // alertedRef: nodeIds that already had a crash toast (prevents duplicate crash alerts;
  //             cleared on recovery so the node can alert again if it crashes a second time)
  const alertedRef      = useRef_sim(new Set());
  const killedRef       = useRef_sim({});
  const lastMetricsRef  = useRef_sim(null);

  useEffect_sim(() => { nodesRef.current  = nodes;          }, [nodes]);
  useEffect_sim(() => { edgesRef.current  = edges;          }, [edges]);
  useEffect_sim(() => { cfgRef.current    = simConfig;      }, [simConfig]);
  useEffect_sim(() => { whatIfRef.current = whatIfOverrides; }, [whatIfOverrides]);

  // Clear all crash state when simulation goes idle
  useEffect_sim(() => {
    if (simConfig.state === "idle") {
      crashedRef.current     = {};
      overloadCntRef.current = {};
      alertedRef.current     = new Set();
      killedRef.current      = {};
      setCrashedNodes({});
    }
  }, [simConfig.state]);

  useEffect_sim(() => {
    if (simConfig.state !== "running") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (simConfig.state === "idle") setChaosKilledNodes({});
      return;
    }
    startRef.current = Date.now() - tickRef.current * 200;
    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const t   = tickRef.current;
      const cfg = cfgRef.current;

      // ── Pattern-modulated rate ───────────────────────────────────────────────
      const baseRate = cfg.rate;
      let factor = 1;
      const secs = t * 0.2;
      switch (cfg.pattern) {
        case "constant": factor = 1; break;
        case "ramp":     factor = Math.min(1, secs / 20); break;
        case "spike":    factor = Math.floor(secs / 8) % 2 === 0 ? 0.1 : 1; break;
        case "wave":     factor = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(secs * 0.5)); break;
        case "step":     factor = Math.min(1, 0.25 * (1 + Math.floor(secs / 8))); break;
      }
      const currentRate    = Math.max(0, Math.round(baseRate * factor));
      const requests       = Math.round(currentRate * 0.2);
      const chaosMul       = cfg.chaos ? 2.5 : 1;
      const baseFail       = (currentRate > 5000 ? 0.08 : currentRate > 1000 ? 0.03 : 0.008);
      const errRate        = Math.min(0.5, baseFail * chaosMul + Math.random() * 0.005);
      const failedThisTick = Math.round(requests * errRate);
      const okThisTick     = requests - failedThisTick;
      const loadFactor     = Math.min(1.5, currentRate / 1000);
      const latency        = Math.round(20 + 60 * loadFactor + (cfg.chaos ? Math.random() * 120 : Math.random() * 25));
      const p50 = Math.round(latency * 0.85);
      const p95 = Math.round(latency * 1.4 + (cfg.chaos ? 60 : 0));
      const p99 = Math.round(latency * 2.2 + (cfg.chaos ? 150 : 0));

      setMetrics(m => {
        const latencyHistory    = [...m.latencyHistory,    latency].slice(-60);
        const throughputHistory = [...m.throughputHistory, currentRate].slice(-60);
        const errorHistory      = [...m.errorHistory,      errRate * 100].slice(-60);
        const next = {
          ...m, latency, p50, p95, p99,
          throughput: currentRate, errorRate: errRate * 100, currentRate,
          totalRequests:     m.totalRequests     + requests,
          completedRequests: m.completedRequests + okThisTick,
          failedRequests:    m.failedRequests    + failedThisTick,
          activeRequests: Math.round(requests * 0.6 + Math.random() * 30),
          latencyHistory, throughputHistory, errorHistory,
        };
        lastMetricsRef.current = next;
        return next;
      });

      // ── Chaos monkey ────────────────────────────────────────────────────────
      const ns = nodesRef.current;
      const connectedIds = new Set();
      edgesRef.current.forEach(e => { connectedIds.add(e.from); connectedIds.add(e.to); });
      const activeNodeCount = Math.max(1, connectedIds.size);

      if (cfg.chaosMonkey && connectedIds.size > 0) {
        const iv = 20 + Math.floor(Math.random() * 10);
        if (t % iv === 0) {
          const arr    = [...connectedIds];
          const victim = arr[Math.floor(Math.random() * arr.length)];
          if (!crashedRef.current[victim]) killedRef.current[victim] = t + 12;
        }
      }
      Object.keys(killedRef.current).forEach(id => {
        if (killedRef.current[id] <= t) delete killedRef.current[id];
      });
      const killedNow = { ...killedRef.current };
      if (t % 5 === 0) setChaosKilledNodes(killedNow);

      // ── Topology-aware traffic: BFS from source nodes, fan traffic downstream ──
      const outDeg = {};
      const inboundFrom = {};
      edgesRef.current.forEach(e => {
        if (connectedIds.has(e.from) && connectedIds.has(e.to)) {
          outDeg[e.from] = (outDeg[e.from] || 0) + 1;
          if (!inboundFrom[e.to]) inboundFrom[e.to] = [];
          inboundFrom[e.to].push(e.from);
        }
      });
      const nodeTraffic = {};
      const inCount = {};
      [...connectedIds].forEach(id => {
        inCount[id] = (inboundFrom[id] || []).length;
        if (inCount[id] === 0) nodeTraffic[id] = currentRate;
      });
      const bfsQ = [...connectedIds].filter(id => inCount[id] === 0);
      const bfsV = new Set(bfsQ);
      while (bfsQ.length > 0) {
        const cur = bfsQ.shift();
        const myT = nodeTraffic[cur] || currentRate;
        const od  = outDeg[cur] || 1;
        edgesRef.current.forEach(e => {
          if (e.from === cur && connectedIds.has(e.to)) {
            nodeTraffic[e.to] = (nodeTraffic[e.to] || 0) + myT / od;
            inCount[e.to] = (inCount[e.to] || 1) - 1;
            if (inCount[e.to] <= 0 && !bfsV.has(e.to)) { bfsV.add(e.to); bfsQ.push(e.to); }
          }
        });
      }
      // Fallback for nodes in cycles or isolated — use average
      [...connectedIds].forEach(id => { if (!nodeTraffic[id]) nodeTraffic[id] = currentRate / activeNodeCount; });

      // ── Invalid connection crash set (critical severity only) ────────────────
      const invalidCriticalIds = new Set();
      if (window.checkEdgeValidity) {
        edgesRef.current.forEach(e => {
          if (!connectedIds.has(e.from) || !connectedIds.has(e.to)) return;
          const fN = ns.find(n => n.id === e.from);
          const tN = ns.find(n => n.id === e.to);
          const v  = window.checkEdgeValidity(fN, tN);
          if (v?.severity === 'critical') invalidCriticalIds.add(e.to);
        });
      }

      const scenarioNodeIds = new Set(cfg.failScenario?.nodeIds || []);
      const newHealth       = {};
      const newCrashed      = { ...crashedRef.current };
      let worstScore = 0, worstId = null;

      ns.forEach((n, i) => {
        // ── Disconnected ─────────────────────────────────────────────────────
        if (!connectedIds.has(n.id)) {
          newHealth[n.id] = { status: "idle", load: 0, lat: 0, tput: 0, err: "0.0", bottleneck: false };
          return;
        }

        // ── Force-fail: chaos monkey OR active scenario ────────────────────
        if (killedNow[n.id] || scenarioNodeIds.has(n.id)) {
          newHealth[n.id] = { status: "failed", load: 1, lat: 9999, tput: 0, err: "100.0", bottleneck: false };
          return;
        }

        // ── Invalid connection: critical architectural errors crash the node ──
        if (invalidCriticalIds.has(n.id)) {
          const reason = {
            code: "CASCADING_FAILURE",
            text: "Architecturally invalid connection — this won't work in production",
            fix: "Right-click the node → Disconnect the red invalid connection",
          };
          newHealth[n.id] = { status: "crashed", load: 1, lat: 9999, tput: 0, err: "100.0", bottleneck: false, crashReason: reason };
          if (!alertedRef.current.has(`inv-${n.id}`)) {
            alertedRef.current.add(`inv-${n.id}`);
            const alertId = `crash-${n.id}-${t}`;
            setCrashAlerts(prev => [...prev.slice(-4), {
              id: alertId, nodeId: n.id, nodeName: n.label, type: "crash",
              err: "100.0", lat: 9999, reason, time: new Date().toLocaleTimeString("en-GB"),
            }]);
            setTimeout(() => setCrashAlerts(a => a.filter(x => x.id !== alertId)), 12000);
          }
          return;
        }
        // Clear invalid alert flag once connection is fixed so it can re-alert
        alertedRef.current.delete(`inv-${n.id}`);

        const nc       = n.config || {};
        const wi       = whatIfRef.current[n.id] || {};
        const replicas = Math.max(1, wi.replicas || 1);
        const cpu      = Math.max(1, nc.cpu     || 60);
        const maxConn  = Math.max(1, (nc.maxConn || 1000) * replicas);
        const timeout  = Math.max(1, nc.timeout || 30);
        const retries  = Math.max(0, nc.retries || 3);

        const cpuFactor      = Math.min(4, Math.max(0.15, 60 / cpu));
        const trafficPerNode = (nodeTraffic[n.id] || currentRate / activeNodeCount) / replicas;
        const saturation     = trafficPerNode / maxConn;
        const connErrMul     = 1 + Math.max(0, (saturation - 0.3) * 6);
        const retryAbsorb    = Math.min(0.7, retries * 0.15);
        const timeoutLatMul  = Math.max(0.6, Math.min(2.5, timeout / 30));
        const timeoutErrMul  = Math.max(0.4, Math.min(1.5, 30 / timeout));
        const tilt           = (i % 3) * 0.1;
        const load           = Math.min(1, (loadFactor / replicas) * Math.min(3, cpuFactor) * (0.5 + tilt * 0.3) + Math.random() * 0.12);
        const nodeErr        = Math.min(0.98, errRate * connErrMul * timeoutErrMul * (1 - retryAbsorb));
        const nodeLat        = Math.round(latency * Math.min(2, cpuFactor * 0.7) * timeoutLatMul * (0.8 + tilt * 0.4));

        // ── Recovery check: already crashed but user improved config ─────────
        if (crashedRef.current[n.id]) {
          const crashInfo = crashedRef.current[n.id];
          if (configImproved(nc, crashInfo.config)) {
            // Config meaningfully improved — attempt recovery
            delete crashedRef.current[n.id];
            delete newCrashed[n.id];
            delete overloadCntRef.current[n.id];
            alertedRef.current.delete(n.id); // allow re-alerting if crashes again

            // Green recovery toast
            const recoverId = `recover-${n.id}-${t}`;
            setCrashAlerts(prev => [...prev.slice(-4), {
              id:       recoverId,
              nodeId:   n.id,
              nodeName: n.label,
              type:     "recovery",
              time:     new Date().toLocaleTimeString("en-GB"),
              fixApplied: crashInfo.reason.fix,
            }]);
            setTimeout(() => setCrashAlerts(a => a.filter(x => x.id !== recoverId)), 6000);
            // Fall through to normal evaluation with new config
          } else {
            // Still crashed — show hint in health if new tick
            newHealth[n.id] = {
              status: "crashed", load: 1, lat: 9999, tput: 0, err: "100.0", bottleneck: false,
              crashReason: crashInfo.reason,
            };
            return;
          }
        }

        // ── Crash detection: sustained overload 3 consecutive ticks ──────────
        const overloading = load >= 0.99 || saturation > 3.0 || nodeErr > 0.85;
        overloadCntRef.current[n.id] = overloading
          ? (overloadCntRef.current[n.id] || 0) + 1
          : 0;

        if (overloadCntRef.current[n.id] >= 3) {
          const reason = analyzeCrashReason(nc, load, nodeErr, saturation, cpuFactor, currentRate, activeNodeCount);
          crashedRef.current[n.id] = { config: { cpu, maxConn: nc.maxConn || 1000, timeout, retries }, reason, crashedAt: t };
          // Store config + reason in crashedNodes so the UI modal can read them
          newCrashed[n.id]         = { config: crashedRef.current[n.id].config, reason, crashedAt: t };
          newHealth[n.id]          = { status: "crashed", load: 1, lat: 9999, tput: 0, err: "100.0", bottleneck: false, crashReason: reason };

          if (!alertedRef.current.has(n.id)) {
            alertedRef.current.add(n.id);
            const alertId = `crash-${n.id}-${t}`;
            setCrashAlerts(prev => [...prev.slice(-4), {
              id: alertId, nodeId: n.id, nodeName: n.label,
              type: "crash",
              err: (nodeErr * 100).toFixed(1),
              lat: nodeLat,
              reason,
              time: new Date().toLocaleTimeString("en-GB"),
            }]);
            setTimeout(() => setCrashAlerts(a => a.filter(x => x.id !== alertId)), 12000);
          }
          return;
        }

        // ── Normal health ────────────────────────────────────────────────────
        let status = "healthy";
        if (cfg.chaos && Math.random() < 0.02) status = "failed";
        else if (load > 0.85 || nodeErr > 0.1)  status = "overloaded";
        else if (load < 0.05)                    status = "idle";

        newHealth[n.id] = {
          status, load,
          lat:  nodeLat,
          tput: Math.round(currentRate / activeNodeCount * (1 - nodeErr) * (0.8 + Math.random() * 0.4)),
          err:  (nodeErr * 100).toFixed(1),
          bottleneck: false,
        };

        const score = load * 0.5 + nodeErr * 3;
        if (score > worstScore) { worstScore = score; worstId = n.id; }
      });

      // ── Bottleneck ───────────────────────────────────────────────────────────
      if (t % 5 === 0 && worstId && worstScore > 0.3) {
        newHealth[worstId].bottleneck = true;
        setBottleneckNodeId(worstId);
      } else if (t % 5 === 0) {
        setBottleneckNodeId(null);
      }

      if (t % 5 === 0) {
        setNodeHealth(newHealth);
        setCrashedNodes(newCrashed);
      }

      if (t % 5 === 0 && lastMetricsRef.current) {
        setSimulationHistory(h => [...h.slice(-299), { t, metrics: lastMetricsRef.current, nodeHealth: newHealth }]);
      }

      if (requests > 0) {
        const methods = ["GET", "POST", "PUT", "DELETE", "GET", "GET"];
        const paths   = ["/api/v1/users", "/api/v1/orders", "/checkout", "/auth/login", "/api/products", "/cart/items", "/health", "/api/search"];
        const status  = failedThisTick > 0 && Math.random() < 0.4
          ? (Math.random() < 0.5 ? 500 + Math.floor(Math.random() * 4) : 404 + Math.floor(Math.random() * 30))
          : 200 + Math.floor(Math.random() * 4);
        setRequestLog(log => [...log.slice(-499), {
          id: `${t}-${Math.random().toString(36).slice(2, 6)}`,
          ts: new Date().toLocaleTimeString("en-GB"),
          method: methods[Math.floor(Math.random() * methods.length)],
          path:   paths[Math.floor(Math.random() * paths.length)],
          status, lat: Math.round(latency * (0.7 + Math.random() * 0.8)),
        }]);
      }
    }, 200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [simConfig.state]);
}
window.useSimulationEngine = useSimulationEngine;
