import { Node, Edge } from 'reactflow';
import { NodeData } from '@/simulation/types';

export interface Issue {
  severity: 'critical' | 'warning' | 'good';
  message: string;
  detail?: string;
}

export interface HealthAnalysis {
  score: number;
  grade: string;
  issues: Issue[];
  improvements: string[];
  slaEstimate: { percent: number; nines: number; label: string };
  costEstimate: number;
}

export const CDN_TYPES = new Set(['cdn', 'aws-cloudfront', 'edge-function', 'cdn-storage']);
export const LB_TYPES = new Set(['load-balancer', 'aws-alb', 'ingress', 'traffic-router']);
export const CB_TYPES = new Set(['circuit-breaker']);
export const CACHE_TYPES = new Set(['redis', 'cache', 'aws-elasticache']);
export const QUEUE_TYPES = new Set(['kafka', 'rabbitmq', 'queue', 'broker', 'aws-sqs', 'event-bus']);
export const MONITOR_TYPES = new Set(['prometheus', 'grafana', 'datadog', 'elk-stack', 'health-check', 'alert-manager']);
export const DB_TYPES = new Set(['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'neo4j', 'influxdb', 'clickhouse', 'cockroachdb', 'supabase', 'cassandra', 'database', 'aws-rds']);
export const RATELIMIT_TYPES = new Set(['rate-limiter', 'aws-api-gateway', 'api-gateway']);
export const WAF_TYPES = new Set(['waf', 'firewall', 'app-waf', 'network-firewall', 'ddos-scrubber']);
export const COMPUTE_TYPES = new Set(['microservice', 'backend', 'serverless', 'worker', 'aws-lambda', 'aws-ec2', 'aws-ecs', 'container', 'kubernetes-pod', 'vm']);

export function getNodeTypes(nodes: Node<NodeData>[]) {
  const types = new Set(nodes.map(n => n.data?.nodeType ?? ''));
  return types;
}

export function hasAny(types: Set<string>, check: Set<string>) {
  for (const t of types) {
    if (check.has(t)) return true;
  }
  return false;
}

export function countType(nodes: Node<NodeData>[], check: Set<string>): number {
  return nodes.filter(n => check.has(n.data?.nodeType ?? '')).length;
}

export function findSPOF(nodes: Node<NodeData>[], edges: Edge[]): string[] {
  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};
  for (const n of nodes) {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
  }
  for (const e of edges) {
    if (e.target in inDegree) inDegree[e.target]++;
    if (e.source in outDegree) outDegree[e.source]++;
  }
  const spofs: string[] = [];
  for (const n of nodes) {
    if (inDegree[n.id] >= 3 && !LB_TYPES.has(n.data?.nodeType ?? '')) {
      spofs.push(n.data?.label ?? n.id);
    }
  }
  return spofs;
}

export function calcSLA(nodes: Node<NodeData>[]): { percent: number; nines: number; label: string } {
  let availability = 1.0;
  for (const n of nodes) {
    const fr = n.data?.failure_rate ?? 0;
    const nodeAvail = fr === 0 ? 0.9999 : Math.max(0, 1 - fr / 100);
    availability *= nodeAvail;
  }
  const pct = Math.max(0, Math.min(100, availability * 100));
  const ninesStr = pct.toFixed(4);
  let nines = 0;
  const afterDecimal = ninesStr.split('.')[1] || '';
  if (pct >= 99) {
    nines = 2;
    let rem = afterDecimal;
    while (rem.startsWith('9')) {
      nines++;
      rem = rem.slice(1);
    }
  } else if (pct >= 90) {
    nines = 1;
  } else {
    nines = 0;
  }

  const label = nines === 0 ? 'No SLA' :
    nines === 1 ? '1 nine (90%)' :
    nines === 2 ? '2 nines (99%)' :
    nines === 3 ? '3 nines (99.9%)' :
    nines === 4 ? '4 nines (99.99%)' : '5 nines (99.999%)';

  return { percent: pct, nines, label };
}

export function estimateCost(nodes: Node<NodeData>[]): number {
  let total = 0;
  for (const n of nodes) {
    const nt = n.data?.nodeType ?? '';
    const cap = n.data?.max_capacity ?? 100;
    const scaleFactor = Math.max(1, cap / 100);

    if (COMPUTE_TYPES.has(nt)) {
      total += Math.round(50 + scaleFactor * 50);
    } else if (DB_TYPES.has(nt)) {
      total += Math.round(100 + scaleFactor * 100);
    } else if (CDN_TYPES.has(nt)) {
      total += 20;
    } else if (LB_TYPES.has(nt)) {
      total += 20;
    } else if (QUEUE_TYPES.has(nt)) {
      total += 40;
    } else if (MONITOR_TYPES.has(nt)) {
      total += 30;
    } else {
      total += 15;
    }
  }
  return total;
}

export function analyzeArchitecture(nodes: Node<NodeData>[], edges: Edge[]): HealthAnalysis {
  const types = getNodeTypes(nodes);
  const issues: Issue[] = [];
  const improvements: string[] = [];
  let score = 0;

  const hasCDN = hasAny(types, CDN_TYPES);
  const hasLB = hasAny(types, LB_TYPES);
  const hasCB = hasAny(types, CB_TYPES);
  const hasCache = hasAny(types, CACHE_TYPES);
  const hasQueue = hasAny(types, QUEUE_TYPES);
  const hasMonitor = hasAny(types, MONITOR_TYPES);
  const hasRateLimit = hasAny(types, RATELIMIT_TYPES);
  const hasWAF = hasAny(types, WAF_TYPES);
  const dbCount = countType(nodes, DB_TYPES);

  if (hasCDN) {
    score += 10;
    issues.push({ severity: 'good', message: 'CDN detected', detail: 'Reduces latency for global users' });
  } else {
    issues.push({ severity: 'warning', message: 'No CDN detected', detail: 'Add CloudFront or Fastly to reduce latency by 60-80%' });
    improvements.push('Add a CDN (CloudFront, Fastly) to cache static assets at edge locations');
  }

  if (hasLB) {
    score += 10;
    issues.push({ severity: 'good', message: 'Load balancer present', detail: 'Enables horizontal scaling' });
  } else {
    issues.push({ severity: 'critical', message: 'No load balancer', detail: 'Single endpoint is a reliability risk — add ALB or Nginx' });
    improvements.push('Add a load balancer (AWS ALB, Nginx) to distribute traffic and enable zero-downtime deploys');
  }

  if (hasCB) {
    score += 10;
    issues.push({ severity: 'good', message: 'Circuit breaker present', detail: 'Prevents cascade failures' });
  } else {
    if (nodes.length >= 3) {
      issues.push({ severity: 'warning', message: 'No circuit breaker', detail: 'Add circuit breakers to prevent cascade failures between services' });
      improvements.push('Implement circuit breakers (Hystrix, Resilience4j) to stop cascade failures');
    }
  }

  if (hasCache) {
    score += 10;
    issues.push({ severity: 'good', message: 'Cache layer present', detail: 'Redis/ElastiCache reduces DB load' });
  } else if (dbCount > 0) {
    issues.push({ severity: 'warning', message: 'No cache layer', detail: 'Add Redis to reduce database pressure and improve latency' });
    improvements.push('Add Redis cache to reduce DB load by 80-90% for read-heavy workloads');
  }

  if (hasQueue) {
    score += 10;
    issues.push({ severity: 'good', message: 'Message queue present', detail: 'Enables async processing and decoupling' });
  } else if (nodes.length >= 4) {
    issues.push({ severity: 'warning', message: 'No message queue', detail: 'Consider Kafka or RabbitMQ for async workloads' });
    improvements.push('Add a message queue (Kafka, RabbitMQ) for async processing and decoupling services');
  }

  const spofs = findSPOF(nodes, edges);
  if (spofs.length === 0) {
    score += 10;
    if (nodes.length > 2) {
      issues.push({ severity: 'good', message: 'No obvious SPOFs detected' });
    }
  } else {
    issues.push({ severity: 'critical', message: `Potential SPOF: ${spofs.slice(0, 2).join(', ')}`, detail: 'These nodes have 3+ dependencies — consider redundancy' });
    improvements.push(`Add redundancy for high-dependency nodes: ${spofs.slice(0,2).join(', ')}`);
  }

  if (hasMonitor) {
    score += 10;
    issues.push({ severity: 'good', message: 'Observability stack present', detail: 'Monitoring, alerting and metrics configured' });
  } else if (nodes.length >= 3) {
    issues.push({ severity: 'warning', message: 'No monitoring/observability', detail: 'Add Prometheus + Grafana or Datadog for production readiness' });
    improvements.push('Add monitoring (Prometheus + Grafana, Datadog) — you cannot fix what you cannot see');
  }

  if (dbCount >= 2) {
    score += 10;
    issues.push({ severity: 'good', message: 'Multiple database instances', detail: 'Enables replication and read scalability' });
  } else if (dbCount === 1) {
    issues.push({ severity: 'warning', message: 'Single database instance', detail: 'Add read replicas or multi-AZ for high availability' });
    improvements.push('Add read replicas to your database for read scalability and HA');
  }

  if (hasRateLimit) {
    score += 5;
    issues.push({ severity: 'good', message: 'Rate limiting present' });
  } else {
    improvements.push('Add rate limiting (API Gateway, nginx rate limit) to protect against abuse');
  }

  if (hasWAF) {
    score += 5;
    issues.push({ severity: 'good', message: 'WAF / security layer present' });
  } else {
    improvements.push('Add WAF protection to guard against SQL injection, XSS, and DDoS attacks');
  }

  const grade = score >= 90 ? 'A+' :
    score >= 80 ? 'A' :
    score >= 70 ? 'B' :
    score >= 60 ? 'C' :
    score >= 40 ? 'D' : 'F';

  const slaEstimate = calcSLA(nodes);
  const costEstimate = estimateCost(nodes);

  return { score, grade, issues, improvements, slaEstimate, costEstimate };
}
