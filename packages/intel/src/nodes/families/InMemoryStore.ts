import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * InMemoryStore — Redis, Memcached, KeyDB, Dragonfly.
 * Primary bottleneck: memory.
 */
export class InMemoryStore extends BaseNode {
  static readonly FAMILY = 'InMemoryStore';

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
   * If ram_pressure > 0.9, immediately return 'critical'.
   * An in-memory store beyond 90 % RAM is seconds away from an eviction
   * cascade or OOM kill — treat it as an emergency.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const ramPressure = this.getVal(readings, 'ram_pressure');

    if (ramPressure > 0.9) {
      return {
        ...base,
        level: 'critical',
        triggered_signals: [
          ...base.triggered_signals,
          {
            signal: 'ram_pressure',
            value: ramPressure,
            severity: 'critical',
            reason: 'RAM pressure >90 % — eviction cascade imminent for in-memory store',
          },
        ],
      };
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Classify eviction risk based on ram_pressure.
   *
   *  <0.70  → none
   *  <0.80  → low
   *  <0.85  → medium
   *  <0.90  → high
   *  ≥0.90  → imminent
   */
  getEvictionRisk(
    readings: SignalReading[],
  ): 'none' | 'low' | 'medium' | 'high' | 'imminent' {
    const ramPressure = this.getVal(readings, 'ram_pressure');

    if (ramPressure >= 0.9)  return 'imminent';
    if (ramPressure >= 0.85) return 'high';
    if (ramPressure >= 0.8)  return 'medium';
    if (ramPressure >= 0.7)  return 'low';
    return 'none';
  }
}
