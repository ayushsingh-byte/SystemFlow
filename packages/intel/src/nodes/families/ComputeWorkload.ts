import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName } from '../../types.js';

/**
 * ComputeWorkload — GPU inference, batch jobs, ML training.
 * Primary bottleneck: CPU (or GPU — GPU signals are TODO).
 */
export class ComputeWorkload extends BaseNode {
  static readonly FAMILY = 'ComputeWorkload';

  constructor(node_id: string, dna: NodeDNA) {
    super(node_id, dna);
  }

  // ── Private helper ──────────────────────────────────────────────────────────

  private getVal(readings: SignalReading[], signal: SignalName): number {
    const r = readings.find(x => x.node_id === this.node_id && x.signal === signal);
    return r !== undefined ? r.value : 0;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Returns the workload's compute efficiency as a 0..1 ratio.
   * Derived from cpu_usage / 100 — a value close to 1.0 means the CPU is
   * being used productively (assuming the workload is CPU-bound).
   *
   * NOTE: GPU efficiency is not yet modelled — tracked as TODO.
   */
  getEfficiency(readings: SignalReading[]): number {
    const cpuUsage = this.getVal(readings, 'cpu_usage');
    // Clamp to [0, 1] in case the reading is unexpectedly out of range.
    return Math.min(1, Math.max(0, cpuUsage / 100));
  }

  /**
   * True when the workload is I/O-bound rather than compute-bound.
   * cpu_iowait > 30 % means CPUs are spending more than a third of their
   * time waiting for disk/network — a classic I/O bottleneck symptom.
   */
  isIOBound(readings: SignalReading[]): boolean {
    return this.getVal(readings, 'cpu_iowait') > 30;
  }
}
