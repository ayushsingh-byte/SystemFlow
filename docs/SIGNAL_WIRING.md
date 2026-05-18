# Signal Wiring Checklist

Every signal must pass all 5 checkboxes before Phase 1 closes.
A signal that is partially wired will cause the causal engine to blame the wrong node.

## Wiring Steps (required for every signal)

1. **Collected** — Go collector reads the raw value from kernel/proc/API
2. **Typed** — Signal name exists in `collector/internal/signals/signals.go` AllSignals
3. **Published** — Kafka publisher validates + sends to `systemflow.signals` topic
4. **Stored** — VictoriaMetrics receives via Remote Write, queryable via /api/v1/query_range
5. **DNA** — Included in at least one NodeDNA file's health_signals or reaction_patterns

## Status

| Signal | Collected | Typed | Published | Stored | DNA |
|--------|-----------|-------|-----------|--------|-----|
| cpu_usage | 🔲 stub | ✅ | ✅ | 🔲 needs VM | ✅ linux-host |
| cpu_steal | 🔲 stub | ✅ | ✅ | 🔲 | ✅ linux-host |
| cpu_iowait | 🔲 stub | ✅ | ✅ | 🔲 | ✅ linux-host |
| ram_used | 🔲 stub | ✅ | ✅ | 🔲 | ✅ redis + linux-host |
| ram_pressure | 🔲 stub | ✅ | ✅ | 🔲 | ✅ postgresql |
| swap_usage | 🔲 stub | ✅ | ✅ | 🔲 | ✅ linux-host |
| load_avg_1/5/15 | 🔲 stub | ✅ | ✅ | 🔲 | ✅ linux-host |
| **bandwidth_in** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx |
| **bandwidth_out** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx |
| **bandwidth_saturation** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx + redis |
| **network_latency_p50/p95/p99** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host |
| **packet_loss_rate** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host |
| **tcp_retransmits** | 🔲 MISSING | ✅ | ✅ | 🔲 | 🔲 |
| **connection_count_active** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx + redis + pg |
| **connection_count_waiting/idle** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx |
| **connection_pool_saturation** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ redis + pg |
| **dns_resolution_time** | 🔲 MISSING | ✅ | ✅ | 🔲 | 🔲 |
| **tcp_handshake_time** | 🔲 MISSING | ✅ | ✅ | 🔲 | 🔲 |
| **disk_iops_read/write** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ postgresql |
| **disk_iops_saturation** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ postgresql |
| **disk_throughput_read/write** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ postgresql |
| **disk_io_wait** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host + pg |
| **disk_queue_depth** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host |
| **disk_capacity_used** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host |
| **disk_latency_read/write** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ linux-host + pg |
| **request_rate** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ all nodes |
| **request_latency_p50/p95/p99** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ all nodes |
| **request_queue_depth** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs + nginx |
| **error_rate_4xx/5xx/timeout** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nginx + nodejs |
| **circuit_breaker_state** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs |
| **gc_pause_time** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs |
| **event_loop_lag** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs |
| **thread_pool_saturation** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs + pg |
| **active_sessions** | 🔲 MISSING | ✅ | ✅ | 🔲 | ✅ nodejs |
| rate_of_change | computed in baseline | ✅ | via ML | ✅ | implicit |
| time_to_saturation | computed in baseline | ✅ | via ML | ✅ | implicit |
| seasonal_baseline_deviation | computed in baseline | ✅ | via ML | ✅ | implicit |

## Legend
- ✅ Done
- 🔲 TODO
- **Bold signal** = currently missing from platform (Flaw 1 from spec)

## Rule
No signal moves to Phase 2 column ("stored") without a passing integration test:
`make test-signal SIGNAL=<name>` must emit a reading and verify it appears in VictoriaMetrics.
