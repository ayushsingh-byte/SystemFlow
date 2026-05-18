import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName, HealthReport } from '../../types.js';

/**
 * ApplicationRuntime — Node.js, Python, JVM, Go.
 * Primary bottleneck: event_loop_lag (async runtimes) or gc_pause_time (GC runtimes).
 */
export class ApplicationRuntime extends BaseNode {
  static readonly FAMILY = 'ApplicationRuntime';

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
   * event_loop_lag > 100 ms OR gc_pause_time > 50 ms → 'critical'.
   * Either condition means the runtime's main thread (or GC) is blocking
   * request processing entirely.
   */
  override evaluateHealth(readings: SignalReading[]): HealthReport {
    const base = super.evaluateHealth(readings);

    const loopLag    = this.getVal(readings, 'event_loop_lag');
    const gcPause    = this.getVal(readings, 'gc_pause_time');

    const extraSignals: HealthReport['triggered_signals'] = [];

    if (loopLag > 100) {
      extraSignals.push({
        signal: 'event_loop_lag',
        value: loopLag,
        severity: 'critical',
        reason:
          `Event loop lag ${loopLag} ms exceeds 100 ms — runtime is blocking all request processing`,
      });
    }

    if (gcPause > 50) {
      extraSignals.push({
        signal: 'gc_pause_time',
        value: gcPause,
        severity: 'critical',
        reason:
          `GC pause ${gcPause} ms exceeds 50 ms — stop-the-world pause is blocking the entire runtime`,
      });
    }

    if (extraSignals.length > 0) {
      return {
        ...base,
        level: 'critical',
        triggered_signals: [...base.triggered_signals, ...extraSignals],
      };
    }

    return base;
  }

  // ── Family-specific methods ─────────────────────────────────────────────────

  /**
   * Returns a snapshot of the runtime's two key health indicators plus a
   * boolean flag that is true when either is blocking the runtime.
   */
  getRuntimeHealth(readings: SignalReading[]): {
    eventLoopLagMs: number;
    gcPauseMs: number;
    isBlocked: boolean;
  } {
    const eventLoopLagMs = this.getVal(readings, 'event_loop_lag');
    const gcPauseMs      = this.getVal(readings, 'gc_pause_time');
    return {
      eventLoopLagMs,
      gcPauseMs,
      isBlocked: eventLoopLagMs > 100 || gcPauseMs > 50,
    };
  }
}
