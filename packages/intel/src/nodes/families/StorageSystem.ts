import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * StorageSystem — Ceph, MinIO, HDFS, NFS.
 * Primary bottleneck: disk_io + network (both can saturate independently).
 */
export class StorageSystem extends BaseNode {
  static readonly FAMILY = 'StorageSystem';

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
   * Combined disk + network saturation check.
   * If disk_iops_saturation + bandwidth_saturation > 1.5, declare 'critical'
   * regardless of other signals — the storage layer is multiply constrained.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const diskSat = this.getVal(readings, 'disk_iops_saturation');
    const bwSat   = this.getVal(readings, 'bandwidth_saturation');

    if (diskSat + bwSat > 1.5) {
      return {
        ...base,
        level: 'critical',
        triggered_signals: [
          ...base.triggered_signals,
          {
            signal: 'disk_iops_saturation',
            value: diskSat,
            severity: 'critical',
            reason:
              `Combined disk+network saturation (${(diskSat + bwSat).toFixed(2)}) exceeds 1.5 threshold`,
          },
          {
            signal: 'bandwidth_saturation',
            value: bwSat,
            severity: 'critical',
            reason:
              `Combined disk+network saturation (${(diskSat + bwSat).toFixed(2)}) exceeds 1.5 threshold`,
          },
        ],
      };
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Classify storage capacity risk based on disk_capacity_used.
   *
   *  <0.80  → ok
   *  <0.90  → warning
   *  ≥0.90  → critical
   */
  getCapacityRisk(readings: SignalReading[]): 'ok' | 'warning' | 'critical' {
    const capacityUsed = this.getVal(readings, 'disk_capacity_used');

    if (capacityUsed >= 0.9) return 'critical';
    if (capacityUsed >= 0.8) return 'warning';
    return 'ok';
  }
}
