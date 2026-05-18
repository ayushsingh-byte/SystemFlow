import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * StatelessHttpWorker — NGINX, Apache, HAProxy, Caddy, Traefik.
 * Primary bottleneck: connections / bandwidth.
 */
export class StatelessHttpWorker extends BaseNode {
  static readonly FAMILY = 'StatelessHttpWorker';

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
   * Bump to 'critical' when both connection_count_active AND
   * bandwidth_saturation are high simultaneously — even if neither alone
   * crossed its individual threshold.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const activeConns = this.getVal(readings, 'connection_count_active');
    const bwSat       = this.getVal(readings, 'bandwidth_saturation');

    // Combined saturation: both signals high together → critical
    const CONNECTION_HIGH_THRESHOLD  = 500;  // absolute connection count
    const BANDWIDTH_SATURATION_HIGH  = 0.75; // 75 % bandwidth used

    if (activeConns > CONNECTION_HIGH_THRESHOLD && bwSat > BANDWIDTH_SATURATION_HIGH) {
      return {
        ...base,
        level: 'critical',
        triggered_signals: [
          ...base.triggered_signals,
          {
            signal: 'connection_count_active',
            value: activeConns,
            severity: 'critical',
            reason:
              'Combined connection + bandwidth saturation — both metrics high simultaneously',
          },
          {
            signal: 'bandwidth_saturation',
            value: bwSat,
            severity: 'critical',
            reason:
              'Combined connection + bandwidth saturation — both metrics high simultaneously',
          },
        ],
      };
    }

    return base;
  }

  /**
   * Give extra weight to a signature match when request_queue_depth is
   * present, because it is a leading indicator of impending connection
   * exhaustion for this family.
   */
  override matchFailureSignature(readings: SignalReading[]) {
    const base = super.matchFailureSignature(readings);

    const queueDepth = this.getVal(readings, 'request_queue_depth');
    if (base !== null && queueDepth > 0) {
      // Re-return the same signature with a boosted description to surface
      // the leading indicator. The underlying score logic is in BaseNode.
      return {
        ...base,
        description: `${base.description} [leading indicator: request_queue_depth=${queueDepth}]`,
      };
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Returns true when the worker's connection pool appears saturated.
   * Uses both active count and pool-saturation signal.
   */
  isConnectionSaturated(readings: SignalReading[]): boolean {
    const activeConns  = this.getVal(readings, 'connection_count_active');
    const poolSat      = this.getVal(readings, 'connection_pool_saturation');
    const bwSat        = this.getVal(readings, 'bandwidth_saturation');
    return poolSat >= 0.9 || bwSat >= 0.9 || activeConns > 800;
  }
}
