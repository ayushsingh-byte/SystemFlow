import { BaseNode } from '../BaseNode.js';
import type { NodeDNA, SignalReading, SignalName } from '../../types.js';

/**
 * MessageBroker — Kafka, RabbitMQ, NATS, Pulsar.
 * Primary bottleneck: disk_io (durable brokers) or memory (in-memory brokers).
 */
export class MessageBroker extends BaseNode {
  static readonly FAMILY = 'MessageBroker';

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
   * Returns the current consumer lag.
   *
   * This is a placeholder — real consumer lag requires a broker-specific API
   * call (e.g., Kafka AdminClient, RabbitMQ management API) that is outside
   * the scope of generic signal readings.
   */
  getConsumerLag(): number | null {
    return null;
  }

  /**
   * True when producers are likely blocked.
   * request_queue_depth > 1000 indicates a full send buffer;
   * disk_iops_saturation > 0.85 means the journal can't keep up with ingest.
   */
  isProducerBlocked(readings: SignalReading[]): boolean {
    const queueDepth = this.getVal(readings, 'request_queue_depth');
    const diskSat    = this.getVal(readings, 'disk_iops_saturation');
    return queueDepth > 1000 || diskSat > 0.85;
  }
}
