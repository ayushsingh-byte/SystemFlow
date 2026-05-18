# SystemFlow Intelligence Platform — Tech Stack

## Decisions

### Signal Collection: Go
**Why:** Go produces a single static binary per node type (easy to deploy as sidecar),
has excellent /proc/* parsing libraries (gopsutil), and handles tight collection loops
with no GC pauses at 15-second intervals. Python would add 50-100ms cold-start overhead
per tick and has GIL contention in multi-goroutine scenarios.

**Trade-off:** More verbose than Python for data munging, but this code runs on every
monitored host — performance matters more than development speed.

### Message Broker: Kafka
**Why:** Handles 1M+ signal readings/sec, durable (replayed on consumer restart),
compacted topics enable "latest value" semantics per (node_id, signal).
Kafka-go library makes Go integration trivial.

**Trade-off:** Heavier than NATS for dev. Use NATS in a future lightweight mode
if single-node deployments are needed.

### Time-Series DB: VictoriaMetrics
**Why:** Drop-in Prometheus-compatible Remote Write API. 10x more memory-efficient
than Prometheus for long retention (90d vs. 15d default). Single binary, no
Cortex/Thanos complexity. Fast range queries for baseline computation.

**Trade-off:** Less ecosystem tooling than InfluxDB, but VictoriaMetrics's Grafana
plugin covers 95% of visualization needs.

### Graph DB: Neo4j
**Why:** Native graph traversal (Cypher) for N-hop neighborhood queries is the
core operation of the causal engine. Neo4j's APOC library adds graph algorithms
(shortest path, centrality) useful for Phase 5.

**Trade-off:** Memory-heavy for dev (≥512MB heap). DGraph is a lighter alternative
if Neo4j becomes a constraint.

### ML Layer: Python (scikit-learn + PyTorch)
**Why:** scikit-learn Isolation Forest is 2 lines to implement and already battle-tested.
PyTorch has the best LSTM ecosystem for Phase 4. ONNX export lets the model run
in a Go binary for latency-critical inference paths later.

**Trade-off:** Separate process from Go/Node.js adds an HTTP hop. Acceptable because
ML inference is not on the hot path — it runs async on the Kafka consumer.

### API Layer: Node.js / Express (extending existing backend)
**Why:** Already present in the repo. The new /api/intel/* routes bolt onto the
existing Express app without a new port or process. Keeps deployment simple.

**Trade-off:** Node.js single thread is not ideal for CPU-heavy work, but the intel
API routes are thin proxies to VictoriaMetrics, Neo4j, and the Python ML service.
Heavy computation stays in Go (collectors) and Python (ML).

### Frontend: Existing React (public/*.jsx)
**Why:** UNTOUCHED. The existing canvas/simulation UI is the product — we add
an intelligence view panel, not replace the existing UI.

## Ports

| Service            | Port  |
|--------------------|-------|
| SystemFlow App     | 4000  |
| VictoriaMetrics    | 8428  |
| Neo4j Browser      | 7474  |
| Neo4j Bolt         | 7687  |
| Kafka              | 9092  |
| ML Service (Python)| 8000  |
