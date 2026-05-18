import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * ContainerOrchestrator — Kubernetes, Nomad, Docker Swarm.
 * Primary bottleneck: CPU (cgroup throttle surfaces as cpu_steal).
 */
export class ContainerOrchestrator extends BaseNode {
  static readonly FAMILY = 'ContainerOrchestrator';

  constructor(node_id: string, dna: NodeDNA) {
    super(node_id, dna);
  }

  // ── Private helper ──────────────────────────────────────────────────────────

  private getVal(readings: SignalReading[], signal: SignalName): number {
    const r = readings.find(x => x.node_id === this.node_id && x.signal === signal);
    return r !== undefined ? r.value : 0;
  }

  // ── Overrides ───────────────────────────────────────────────────────────────

  /**
   * Treat cpu_steal > 0.2 as 'degraded' even when the base evaluation returns
   * 'healthy'. For container orchestrators cpu_steal directly reflects cgroup
   * CPU throttle and must be surfaced prominently.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const cpuSteal = this.getVal(readings, 'cpu_steal');

    // Only bump up, never down — if base is already critical keep it critical.
    if (cpuSteal > 0.2 && base.level === 'healthy') {
      return {
        ...base,
        level: 'degraded',
        triggered_signals: [
          ...base.triggered_signals,
          {
            signal: 'cpu_steal',
            value: cpuSteal,
            severity: 'warning',
            reason:
              'cpu_steal >20 % indicates active cgroup CPU throttling — workloads are being artificially slowed',
          },
        ],
      };
    }

    // If degraded, enrich triggered_signals with the cgroup throttle signal
    // so the caller can see it even if base didn't fire it.
    if (cpuSteal > 0.2 && base.level === 'degraded') {
      const alreadyPresent = base.triggered_signals.some(
        s => s.signal === 'cpu_steal',
      );
      if (!alreadyPresent) {
        return {
          ...base,
          triggered_signals: [
            ...base.triggered_signals,
            {
              signal: 'cpu_steal',
              value: cpuSteal,
              severity: 'warning',
              reason: 'cgroup CPU throttle confirmed via cpu_steal',
            },
          ],
        };
      }
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /** True when the node's cgroup is actively throttling CPU. */
  isCgroupThrottled(readings: SignalReading[]): boolean {
    return this.getVal(readings, 'cpu_steal') > 0.2;
  }

  /**
   * True when RAM pressure is high enough that the kernel OOM killer is
   * likely to intervene (ram_pressure > 0.9).
   */
  getOOMRisk(readings: SignalReading[]): boolean {
    return this.getVal(readings, 'ram_pressure') > 0.9;
  }
}
