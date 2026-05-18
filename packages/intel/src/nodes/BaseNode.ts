import type {
  NodeDNA, SignalReading, HealthReport, HealthLevel,
  FailureSignature, SignalName, EdgeType,
} from '../types.js';

/**
 * BaseNode — abstract base for all infrastructure node types.
 *
 * Each concrete node (NGINX, PostgreSQL, Redis, etc.) extends a family class
 * which extends this. The DNA file provides behavioral configuration;
 * the class hierarchy provides the intelligence logic.
 */
export abstract class BaseNode {
  readonly node_id: string;
  readonly dna: NodeDNA;

  constructor(node_id: string, dna: NodeDNA) {
    this.node_id = node_id;
    this.dna = dna;
  }

  /** Signals this node type cares about — all three severity levels. */
  getRelevantSignals(): SignalName[] {
    const { critical, warning, informational } = this.dna.health_signals;
    return [...new Set([...critical, ...warning, ...informational])];
  }

  /** Edge types this node can participate in, per its DNA. */
  getSupportedEdgeTypes(): EdgeType[] {
    return this.dna.supported_edge_types;
  }

  /**
   * Evaluate the current health of this node from a set of readings.
   * Checks critical signals first, then warning signals.
   * Returns 'unknown' if no relevant readings provided.
   */
  evaluateHealth(readings: SignalReading[]): HealthReport {
    const readingMap = new Map<SignalName, number>();
    for (const r of readings) {
      if (r.node_id === this.node_id) {
        readingMap.set(r.signal as SignalName, r.value);
      }
    }

    if (readingMap.size === 0) {
      return {
        node_id: this.node_id,
        level: 'unknown',
        timestamp_ms: Date.now(),
        triggered_signals: [],
      };
    }

    const triggered: HealthReport['triggered_signals'] = [];

    // Check critical signals against reaction pattern triggers
    for (const sig of this.dna.health_signals.critical) {
      const value = readingMap.get(sig);
      if (value === undefined) continue;

      const pattern = this.dna.reaction_patterns.find(
        p => p.trigger.signal === sig && this._evaluateTrigger(p.trigger, value)
      );
      if (pattern) {
        triggered.push({
          signal: sig,
          value,
          severity: 'critical',
          reason: pattern.description,
        });
      }
    }

    // Check warning signals
    for (const sig of this.dna.health_signals.warning) {
      const value = readingMap.get(sig);
      if (value === undefined) continue;

      const pattern = this.dna.reaction_patterns.find(
        p => p.trigger.signal === sig && this._evaluateTrigger(p.trigger, value)
      );
      if (pattern) {
        triggered.push({
          signal: sig,
          value,
          severity: 'warning',
          reason: pattern.description,
        });
      }
    }

    const hasCritical = triggered.some(t => t.severity === 'critical');
    const hasWarning  = triggered.some(t => t.severity === 'warning');

    const level: HealthLevel =
      hasCritical ? 'critical' :
      hasWarning  ? 'degraded' :
      'healthy';

    const matchedSig = this.matchFailureSignature(readings);

    return {
      node_id: this.node_id,
      level,
      timestamp_ms: Date.now(),
      triggered_signals: triggered,
      matched_signature: matchedSig ?? undefined,
    };
  }

  /**
   * Match recent readings against known failure signatures.
   * Returns the best-matching signature or null.
   */
  matchFailureSignature(readings: SignalReading[]): FailureSignature | null {
    const presentSignals = new Set(readings.map(r => r.signal as SignalName));
    let bestMatch: FailureSignature | null = null;
    let bestScore = 0;

    for (const sig of this.dna.failure_signatures) {
      const matchedSteps = sig.signal_sequence.filter(
        step => presentSignals.has(step.signal as SignalName)
      );
      const score = matchedSteps.length / sig.signal_sequence.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sig;
      }
    }

    return bestScore >= 0.6 ? bestMatch : null;
  }

  /**
   * Given a signal and its current value, find what downstream effects
   * this node's DNA predicts for connected nodes.
   * Used by the causal engine to propagate anomalies.
   */
  getExpectedDownstreamEffects(signal: SignalName, value: number) {
    const effects = [];
    for (const pattern of this.dna.reaction_patterns) {
      if (
        pattern.trigger.signal === signal &&
        this._evaluateTrigger(pattern.trigger, value)
      ) {
        effects.push({
          pattern,
          effects: pattern.expected_downstream_effects,
          delay_ms: pattern.expected_delay_ms,
          confidence: pattern.confidence,
        });
      }
    }
    return effects;
  }

  private _evaluateTrigger(
    trigger: { op: string; value: number },
    actual: number
  ): boolean {
    switch (trigger.op) {
      case '>':  return actual > trigger.value;
      case '<':  return actual < trigger.value;
      case '>=': return actual >= trigger.value;
      case '<=': return actual <= trigger.value;
      case '==': return actual === trigger.value;
      default:   return false;
    }
  }
}
