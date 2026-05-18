// Package signals defines every signal name as a typed constant.
// Adding a new signal = add one line here. No other special-casing required.
package signals

// Name is the canonical identifier for a signal.
type Name string

// Reading is one data point from a collector.
type Reading struct {
	NodeID    string  `json:"node_id"`
	Signal    Name    `json:"signal"`
	Value     float64 `json:"value"`
	Timestamp int64   `json:"timestamp_ms"`
	Unit      string  `json:"unit"`
}

// NodeType identifies the family of infrastructure node.
type NodeType string

const (
	NodeTypeLinuxHost  NodeType = "linux-host"
	NodeTypeNGINX      NodeType = "nginx"
	NodeTypePostgres   NodeType = "postgresql"
	NodeTypeRedis      NodeType = "redis"
	NodeTypeNodeJS     NodeType = "nodejs-app"
	NodeTypeDocker     NodeType = "docker-container"
)

// ── Compute signals ─────────────────────────────────────────────────────────
const (
	CPUUsage     Name = "cpu_usage"
	CPUSteal     Name = "cpu_steal"
	CPUIoWait    Name = "cpu_iowait"
	RAMUsed      Name = "ram_used"
	RAMPressure  Name = "ram_pressure"
	SwapUsage    Name = "swap_usage"
	LoadAvg1     Name = "load_avg_1"
	LoadAvg5     Name = "load_avg_5"
	LoadAvg15    Name = "load_avg_15"
)

// ── Network signals (CRITICAL — currently missing from platform) ─────────────
const (
	BandwidthIn              Name = "bandwidth_in"
	BandwidthOut             Name = "bandwidth_out"
	BandwidthSaturation      Name = "bandwidth_saturation"
	NetworkLatencyP50        Name = "network_latency_p50"
	NetworkLatencyP95        Name = "network_latency_p95"
	NetworkLatencyP99        Name = "network_latency_p99"
	PacketLossRate           Name = "packet_loss_rate"
	TCPRetransmits           Name = "tcp_retransmits"
	ConnectionCountActive    Name = "connection_count_active"
	ConnectionCountWaiting   Name = "connection_count_waiting"
	ConnectionCountIdle      Name = "connection_count_idle"
	ConnectionPoolSaturation Name = "connection_pool_saturation"
	DNSResolutionTime        Name = "dns_resolution_time"
	TCPHandshakeTime         Name = "tcp_handshake_time"
)

// ── Storage / IO signals (CRITICAL — currently missing from platform) ────────
const (
	DiskIOPSRead        Name = "disk_iops_read"
	DiskIOPSWrite       Name = "disk_iops_write"
	DiskIOPSSaturation  Name = "disk_iops_saturation"
	DiskThroughputRead  Name = "disk_throughput_read"
	DiskThroughputWrite Name = "disk_throughput_write"
	DiskIOWait          Name = "disk_io_wait"
	DiskQueueDepth      Name = "disk_queue_depth"
	DiskCapacityUsed    Name = "disk_capacity_used"
	DiskLatencyRead     Name = "disk_latency_read"
	DiskLatencyWrite    Name = "disk_latency_write"
)

// ── Application-layer signals (CRITICAL — currently missing from platform) ──
const (
	RequestRate          Name = "request_rate"
	RequestLatencyP50    Name = "request_latency_p50"
	RequestLatencyP95    Name = "request_latency_p95"
	RequestLatencyP99    Name = "request_latency_p99"
	RequestQueueDepth    Name = "request_queue_depth"
	ErrorRate4xx         Name = "error_rate_4xx"
	ErrorRate5xx         Name = "error_rate_5xx"
	ErrorRateTimeout     Name = "error_rate_timeout"
	CircuitBreakerState  Name = "circuit_breaker_state"
	GCPauseTime          Name = "gc_pause_time"
	EventLoopLag         Name = "event_loop_lag"
	ThreadPoolSaturation Name = "thread_pool_saturation"
	ActiveSessions       Name = "active_sessions"
)

// ── Time-series context signals (derived, computed on ingest) ────────────────
const (
	RateOfChange             Name = "rate_of_change"
	TimeToSaturation         Name = "time_to_saturation"
	SeasonalBaselineDeviation Name = "seasonal_baseline_deviation"
)

// AllSignals is the complete registry. Every signal must appear here.
var AllSignals = []Name{
	CPUUsage, CPUSteal, CPUIoWait, RAMUsed, RAMPressure, SwapUsage,
	LoadAvg1, LoadAvg5, LoadAvg15,
	BandwidthIn, BandwidthOut, BandwidthSaturation,
	NetworkLatencyP50, NetworkLatencyP95, NetworkLatencyP99,
	PacketLossRate, TCPRetransmits,
	ConnectionCountActive, ConnectionCountWaiting, ConnectionCountIdle,
	ConnectionPoolSaturation, DNSResolutionTime, TCPHandshakeTime,
	DiskIOPSRead, DiskIOPSWrite, DiskIOPSSaturation,
	DiskThroughputRead, DiskThroughputWrite, DiskIOWait,
	DiskQueueDepth, DiskCapacityUsed, DiskLatencyRead, DiskLatencyWrite,
	RequestRate, RequestLatencyP50, RequestLatencyP95, RequestLatencyP99,
	RequestQueueDepth, ErrorRate4xx, ErrorRate5xx, ErrorRateTimeout,
	CircuitBreakerState, GCPauseTime, EventLoopLag,
	ThreadPoolSaturation, ActiveSessions,
	RateOfChange, TimeToSaturation, SeasonalBaselineDeviation,
}
