import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * RelationalDatabase — PostgreSQL, MySQL, MariaDB, CockroachDB.
 * Primary bottleneck: disk_io.
 */
export class RelationalDatabase extends BaseNode {
  static readonly FAMILY = 'RelationalDatabase';

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
   * If disk_iops_saturation > 0.8 AND p99 latency > 500 ms, immediately
   * return 'critical' regardless of other signals — disk-bound + slow queries
   * is an acute failure mode.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const diskSat  = this.getVal(readings, 'disk_iops_saturation');
    const latP99   = this.getVal(readings, 'request_latency_p99');

    if (diskSat > 0.8 && latP99 > 500) {
      return {
        ...base,
        level: 'critical',
        triggered_signals: [
          ...base.triggered_signals,
          {
            signal: 'disk_iops_saturation',
            value: diskSat,
            severity: 'critical',
            reason: 'Disk IOPS saturated (>80 %) while p99 latency exceeds 500 ms — disk-bound failure',
          },
          {
            signal: 'request_latency_p99',
            value: latP99,
            severity: 'critical',
            reason: 'p99 latency >500 ms co-occurring with disk saturation — disk-bound failure',
          },
        ],
      };
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Returns the saturation ratio of the connection pool and whether it is
   * fully exhausted (saturation >= 1.0).
   */
  getConnectionPoolHealth(readings: SignalReading[]): {
    saturation: number;
    isExhausted: boolean;
  } {
    const saturation = this.getVal(readings, 'connection_pool_saturation');
    return {
      saturation,
      isExhausted: saturation >= 1.0,
    };
  }

  /**
   * True if the database is primarily constrained by disk I/O.
   * disk_iops_saturation > 0.7 OR disk_io_wait > 20 (percent).
   */
  isDiskBound(readings: SignalReading[]): boolean {
    const diskSat  = this.getVal(readings, 'disk_iops_saturation');
    const ioWait   = this.getVal(readings, 'disk_io_wait');
    return diskSat > 0.7 || ioWait > 20;
  }
}
