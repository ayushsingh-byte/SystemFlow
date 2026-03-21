import { Node, Edge } from 'reactflow';
import { NodeData } from '@/simulation/types';
import { getNodeConfig } from '@/utils/nodeRegistry';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE: Partial<NodeData> = {
  cpu_cores: 4, ram_gb: 16, network_mbps: 1000,
  circuit_breaker_enabled: false, circuit_breaker_threshold: 50,
  circuit_breaker_timeout: 30000, cache_hit_rate: 70,
  response_size_kb: 50, tls_overhead_ms: 0,
  firewall_enabled: true, block_rate: 0, allowed_rps: 0,
  enabled: true, blocked_edges: [],
};

export function pn(
  id: string, type: string, label: string,
  pos: { x: number; y: number },
  overrides?: Partial<NodeData>
): Node<NodeData> {
  return {
    id, type: 'systemNode', position: pos,
    data: {
      label, nodeType: type,
      ...getNodeConfig(type).defaults,
      currentLoad: 0, status: 'idle',
      queue_limit: 100, queue_size: 0,
      latency_factor: 2.0, dropped_requests: 0,
      ...BASE, ...overrides,
    },
  };
}

export function pe(id: string, source: string, target: string): Edge {
  return { id, source, target, type: 'animatedEdge' };
}

// p(col, row) grid helper — col step 300px, row step 170px — generous spacing for readability
const p = (col: number, row: number) => ({ x: 120 + col * 300, y: 120 + row * 170 });

// ─── Template Metadata ──────────────────────────────────────────────────────

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodeCount: number;
  tags: string[];
  bottlenecks: string[];
  scalingNotes: string;
  category: string;
  premium?: boolean;
}

export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    description: 'Full production stack with CDN, WAF, DDoS protection, 8 microservices, Redis caching, read replicas, Kafka async processing, and real-time analytics.',
    icon: '🛒',
    category: 'Web Platform',
    nodeCount: 24,
    tags: ['microservices', 'kafka', 'redis', 'cdn', 'caching'],
    bottlenecks: ['Order Service', 'Orders DB', 'Kafka Broker'],
    scalingNotes: 'Scale Product/Cart services horizontally. Redis Cluster for cache. Shard Orders DB by user_id. Add more Kafka partitions.',
  },
  {
    id: 'social-media',
    name: 'Social Media Platform',
    description: 'Fan-out write / fan-in read architecture for social network with graph DB, media CDN, real-time feed generation, and ML recommendations.',
    icon: '📱',
    category: 'Web Platform',
    nodeCount: 24,
    tags: ['fan-out', 'graph-db', 'kafka', 'cdn', 'ml'],
    bottlenecks: ['Feed Service', 'Social Graph DB', 'Media CDN'],
    scalingNotes: 'Pre-compute feeds for high-follower accounts. Shard graph DB by user partitions. Use async fanout for writes.',
  },
  {
    id: 'video-streaming',
    name: 'Video Streaming (Netflix-like)',
    description: 'CDN-heavy architecture absorbing 80% of traffic at edge. Backend optimized for metadata, recommendation engine, and async transcoding pipeline.',
    icon: '🎬',
    category: 'Streaming',
    nodeCount: 22,
    tags: ['cdn', 'transcoding', 'kafka', 'recommendation', 'metadata'],
    bottlenecks: ['Transcoding Workers', 'Metadata DB', 'Recommendation Engine'],
    scalingNotes: 'CDN handles most load. Scale transcoding workers elastically. Cache popular content metadata aggressively.',
  },
  {
    id: 'realtime-chat',
    name: 'Real-Time Chat System',
    description: 'WebSocket-based real-time messaging with Redis Pub/Sub for cross-server delivery, Kafka for durability, presence detection, and media sharing.',
    icon: '💬',
    category: 'Real-Time',
    nodeCount: 22,
    tags: ['websocket', 'redis-pubsub', 'kafka', 'presence', 'realtime'],
    bottlenecks: ['WebSocket Gateways', 'Redis Pub/Sub', 'Messages DB'],
    scalingNotes: 'Add more WS gateway pods behind load balancer. Use Redis Cluster for pub/sub at scale. Partition messages DB by chat_room_id.',
  },
  {
    id: 'fintech',
    name: 'Fintech / Banking System',
    description: 'Strong-consistency financial system with MFA auth, fraud detection ML, risk engine, geo-distributed CockroachDB, full audit trail, compliance reporting, and regulatory data pipeline.',
    icon: '🏦',
    category: 'Finance',
    nodeCount: 28,
    tags: ['strong-consistency', 'audit', 'fraud-detection', 'mfa', 'compliance', 'geo-distributed'],
    bottlenecks: ['Transaction Service', 'Primary DB', 'Fraud Detection ML'],
    scalingNotes: 'Use CockroachDB for geo-distributed consistency. Cache fraud model features in Redis. Async compliance checks via Kafka.',
    premium: true,
  },
  {
    id: 'ride-sharing',
    name: 'Ride-Sharing (Uber-like)',
    description: 'Real-time geo-matching system with location service, dynamic surge pricing ML, WebSocket driver updates, and time-series location history.',
    icon: '🚗',
    category: 'Real-Time',
    nodeCount: 22,
    tags: ['geo', 'matching', 'websocket', 'timeseries', 'ml-pricing'],
    bottlenecks: ['Matching Service', 'Location Service', 'Geo Cache (Redis)'],
    scalingNotes: 'Partition location data by geo-cell. Use Redis Geo commands for proximity queries. Scale matching service during peak hours.',
  },
  {
    id: 'saas-platform',
    name: 'SaaS Application Platform',
    description: 'Multi-tenant SaaS with tenant isolation router, OAuth/SSO auth, billing, webhook delivery, full-text search, and per-tenant audit logging.',
    icon: '☁️',
    category: 'Web Platform',
    nodeCount: 22,
    tags: ['multi-tenant', 'oauth', 'billing', 'webhooks', 'saas'],
    bottlenecks: ['Tenant Router', 'App Data DB', 'Webhook Service'],
    scalingNotes: 'Shard app DB by tenant_id. Cache tenant config in Redis. Rate-limit webhook delivery per tenant. Use service mesh for inter-service mTLS.',
  },
  {
    id: 'iot-pipeline',
    name: 'IoT Data Pipeline',
    description: 'High-throughput IoT ingestion with MQTT gateways, schema validation, stream processing, time-series storage, rules engine, and real-time alerting.',
    icon: '🔌',
    category: 'Data Engineering',
    nodeCount: 22,
    tags: ['iot', 'kafka', 'timeseries', 'stream-processing', 'mqtt'],
    bottlenecks: ['Stream Processors', 'Kafka Broker', 'Time-Series DB'],
    scalingNotes: 'Scale IoT gateways horizontally. Add Kafka partitions per device class. Use InfluxDB downsampling for long-term retention.',
  },
  {
    id: 'search-engine',
    name: 'Search Engine System',
    description: 'Enterprise-grade distributed search with multi-tier query parsing, neural ranking (BERT), autocomplete with ML, web crawler pipeline, click-through feedback loop, A/B testing, and real-time analytics dashboard.',
    icon: '🔍',
    category: 'Data Engineering',
    nodeCount: 30,
    tags: ['elasticsearch', 'neural-ranking', 'crawler', 'autocomplete', 'analytics', 'ab-testing'],
    bottlenecks: ['Elasticsearch Cluster', 'Neural Ranking Engine', 'Index Updater'],
    scalingNotes: 'Add Elasticsearch shards for scale. Cache hot queries in Redis. Separate read/write clusters. Run index updates in off-peak windows.',
    premium: true,
  },
  {
    id: 'gaming-backend',
    name: 'Online Gaming Backend',
    description: 'Ultra-low-latency competitive gaming platform with dedicated game servers, real-time matchmaking with MMR, WebSocket state sync, anti-cheat ML pipeline, global leaderboards, in-game economy, and live tournament system.',
    icon: '🎮',
    category: 'Real-Time',
    nodeCount: 28,
    tags: ['websocket', 'matchmaking', 'gamestate', 'anti-cheat', 'leaderboard', 'economy'],
    bottlenecks: ['WebSocket Servers', 'Game State Cache', 'Matchmaking Service'],
    scalingNotes: 'Use dedicated game servers per match. Redis for sub-ms state reads. Async anti-cheat processing. Shard leaderboard by game mode.',
    premium: true,
  },
];

// ─── Template 1: E-Commerce Platform ────────────────────────────────────────

const ecommerce = (() => {
  const nodes: Node<NodeData>[] = [
    pn('ec-client', 'user',          'Shoppers',             p(0,3)),
    pn('ec-cdn',    'cdn',           'CloudFront CDN',       p(1,1), { cache_hit_rate: 85, processing_time: 3 }),
    pn('ec-waf',    'app-waf',       'AWS WAF',              p(1,3)),
    pn('ec-ddos',   'ddos-scrubber', 'DDoS Shield',          p(1,5)),
    pn('ec-gw',     'api-gateway',   'API Gateway',          p(2,3), { max_capacity: 3000 }),
    pn('ec-rl',     'rate-limiter',  'Rate Limiter',         p(3,2), { max_capacity: 2000 }),
    pn('ec-cb',     'circuit-breaker','Circuit Breaker',     p(3,4), { circuit_breaker_enabled: true }),
    pn('ec-auth',   'microservice',  'Auth Service',         p(4,0), { processing_time: 40, max_capacity: 800 }),
    pn('ec-prod',   'microservice',  'Product Service',      p(4,1), { processing_time: 60, max_capacity: 600 }),
    pn('ec-cart',   'microservice',  'Cart Service',         p(4,2), { processing_time: 30, max_capacity: 900 }),
    pn('ec-order',  'microservice',  'Order Service',        p(4,3), { processing_time: 120, max_capacity: 400 }),
    pn('ec-pay',    'microservice',  'Payment Service',      p(4,4), { processing_time: 200, max_capacity: 200, failure_rate: 1.5 }),
    pn('ec-inv',    'microservice',  'Inventory Service',    p(4,5), { processing_time: 80, max_capacity: 500 }),
    pn('ec-srch',   'microservice',  'Search Service',       p(4,6), { processing_time: 90, max_capacity: 500 }),
    pn('ec-rec',    'microservice',  'Recommendation Svc',   p(4,7), { processing_time: 150, max_capacity: 300 }),
    pn('ec-redis',  'redis',         'Session Cache (Redis)',p(5,0), { cache_hit_rate: 90, processing_time: 3 }),
    pn('ec-udb',    'postgresql',    'Users DB',             p(5,2), { processing_time: 45, max_capacity: 400 }),
    pn('ec-odb',    'postgresql',    'Orders DB',            p(5,3), { processing_time: 60, max_capacity: 250 }),
    pn('ec-pdb',    'postgresql',    'Products DB',          p(5,5), { processing_time: 50, max_capacity: 350 }),
    pn('ec-es',     'elasticsearch', 'Search Index (ES)',    p(5,6), { processing_time: 80, max_capacity: 300 }),
    pn('ec-kafka',  'kafka',         'Kafka Streaming',      p(6,3), { processing_time: 8, max_capacity: 15000, queue_limit: 500 }),
    pn('ec-notif',  'microservice',  'Notification Service', p(7,2), { processing_time: 80, max_capacity: 400 }),
    pn('ec-email',  'backend',       'Email Service',        p(7,4), { processing_time: 200, max_capacity: 200 }),
    pn('ec-analytics','clickhouse',  'Analytics DB',         p(7,6), { processing_time: 200, max_capacity: 100 }),
  ];
  const edges: Edge[] = [
    pe('ec-e1','ec-client','ec-cdn'),   pe('ec-e2','ec-client','ec-waf'),
    pe('ec-e3','ec-cdn','ec-gw'),       pe('ec-e4','ec-waf','ec-ddos'),
    pe('ec-e5','ec-ddos','ec-gw'),      pe('ec-e6','ec-gw','ec-rl'),
    pe('ec-e7','ec-rl','ec-cb'),        pe('ec-e8','ec-cb','ec-auth'),
    pe('ec-e9','ec-cb','ec-prod'),      pe('ec-e10','ec-cb','ec-cart'),
    pe('ec-e11','ec-cb','ec-order'),    pe('ec-e12','ec-cb','ec-pay'),
    pe('ec-e13','ec-cb','ec-inv'),      pe('ec-e14','ec-cb','ec-srch'),
    pe('ec-e15','ec-cb','ec-rec'),      pe('ec-e16','ec-auth','ec-redis'),
    pe('ec-e17','ec-auth','ec-udb'),    pe('ec-e18','ec-prod','ec-redis'),
    pe('ec-e19','ec-prod','ec-pdb'),    pe('ec-e20','ec-cart','ec-redis'),
    pe('ec-e21','ec-order','ec-odb'),   pe('ec-e22','ec-order','ec-kafka'),
    pe('ec-e23','ec-pay','ec-odb'),     pe('ec-e24','ec-pay','ec-kafka'),
    pe('ec-e25','ec-inv','ec-pdb'),     pe('ec-e26','ec-srch','ec-es'),
    pe('ec-e27','ec-rec','ec-redis'),   pe('ec-e28','ec-kafka','ec-notif'),
    pe('ec-e29','ec-kafka','ec-email'), pe('ec-e30','ec-kafka','ec-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Template 2: Social Media Platform ──────────────────────────────────────

const socialMedia = (() => {
  const nodes: Node<NodeData>[] = [
    pn('sm-mob',   'mobile-client', 'Mobile App',            p(0,1)),
    pn('sm-web',   'web-browser',   'Web Browser',           p(0,5)),
    pn('sm-cdn',   'cdn',           'Media CDN',             p(1,3), { cache_hit_rate: 80, processing_time: 4 }),
    pn('sm-gw',    'api-gateway',   'API Gateway',           p(2,3), { max_capacity: 4000 }),
    pn('sm-rl',    'rate-limiter',  'Rate Limiter',          p(3,1), { max_capacity: 3000 }),
    pn('sm-lb',    'load-balancer', 'Load Balancer',         p(3,3), { max_capacity: 5000 }),
    pn('sm-cb',    'circuit-breaker','Circuit Breaker',      p(3,5), { circuit_breaker_enabled: true }),
    pn('sm-auth',  'microservice',  'Auth Service',          p(4,0), { processing_time: 35, max_capacity: 1000 }),
    pn('sm-user',  'microservice',  'User Service',          p(4,1), { processing_time: 50, max_capacity: 600 }),
    pn('sm-post',  'microservice',  'Post Service',          p(4,2), { processing_time: 70, max_capacity: 500 }),
    pn('sm-feed',  'microservice',  'Feed Service',          p(4,3), { processing_time: 120, max_capacity: 300, failure_rate: 2 }),
    pn('sm-media', 'microservice',  'Media Service',         p(4,4), { processing_time: 200, max_capacity: 200 }),
    pn('sm-notif', 'microservice',  'Notification Service',  p(4,5), { processing_time: 60, max_capacity: 500 }),
    pn('sm-srch',  'microservice',  'Search Service',        p(4,6), { processing_time: 80, max_capacity: 400 }),
    pn('sm-redis', 'redis',         'Feed Cache (Redis)',     p(5,1), { cache_hit_rate: 75, processing_time: 4 }),
    pn('sm-udb',   'postgresql',    'Users DB',              p(5,2), { processing_time: 45, max_capacity: 400 }),
    pn('sm-pdb',   'postgresql',    'Posts DB',              p(5,3), { processing_time: 55, max_capacity: 300 }),
    pn('sm-graph', 'neo4j',         'Social Graph (Neo4j)',  p(5,4), { processing_time: 100, max_capacity: 150 }),
    pn('sm-s3',    's3-storage',    'Media Storage (S3)',    p(5,5), { processing_time: 20, max_capacity: 1000 }),
    pn('sm-es',    'elasticsearch', 'Search Index (ES)',     p(5,6), { processing_time: 80, max_capacity: 300 }),
    pn('sm-kafka', 'kafka',         'Kafka Streaming',       p(6,3), { processing_time: 8, max_capacity: 20000, queue_limit: 500 }),
    pn('sm-rec',   'ml-model',      'Recommendation ML',     p(7,2), { processing_time: 400, max_capacity: 50 }),
    pn('sm-analytics','clickhouse', 'Analytics (ClickHouse)',p(7,4), { processing_time: 200, max_capacity: 100 }),
    pn('sm-monitor','prometheus',   'Prometheus',            p(7,6)),
  ];
  const edges: Edge[] = [
    pe('sm-e1','sm-mob','sm-cdn'),    pe('sm-e2','sm-mob','sm-gw'),
    pe('sm-e3','sm-web','sm-cdn'),    pe('sm-e4','sm-web','sm-gw'),
    pe('sm-e5','sm-cdn','sm-s3'),     pe('sm-e6','sm-gw','sm-rl'),
    pe('sm-e7','sm-rl','sm-lb'),      pe('sm-e8','sm-lb','sm-cb'),
    pe('sm-e9','sm-lb','sm-auth'),    pe('sm-e10','sm-cb','sm-user'),
    pe('sm-e11','sm-cb','sm-post'),   pe('sm-e12','sm-cb','sm-feed'),
    pe('sm-e13','sm-cb','sm-media'),  pe('sm-e14','sm-cb','sm-notif'),
    pe('sm-e15','sm-cb','sm-srch'),   pe('sm-e16','sm-auth','sm-udb'),
    pe('sm-e17','sm-user','sm-udb'),  pe('sm-e18','sm-user','sm-graph'),
    pe('sm-e19','sm-post','sm-pdb'),  pe('sm-e20','sm-post','sm-kafka'),
    pe('sm-e21','sm-feed','sm-redis'),pe('sm-e22','sm-feed','sm-graph'),
    pe('sm-e23','sm-feed','sm-pdb'),  pe('sm-e24','sm-media','sm-s3'),
    pe('sm-e25','sm-media','sm-kafka'),pe('sm-e26','sm-srch','sm-es'),
    pe('sm-e27','sm-kafka','sm-rec'), pe('sm-e28','sm-kafka','sm-analytics'),
    pe('sm-e29','sm-kafka','sm-monitor'),pe('sm-e30','sm-rec','sm-redis'),
  ];
  return { nodes, edges };
})();

// ─── Template 3: Video Streaming ────────────────────────────────────────────

const videoStreaming = (() => {
  const nodes: Node<NodeData>[] = [
    pn('vs-client', 'user',          'Viewers',              p(0,3)),
    pn('vs-mob',    'mobile-client', 'Mobile Viewers',       p(0,5)),
    pn('vs-cdn',    'cdn',           'Video CDN (Edge)',      p(1,3), { cache_hit_rate: 82, processing_time: 5 }),
    pn('vs-ddos',   'ddos-scrubber', 'DDoS Shield',          p(2,1)),
    pn('vs-gw',     'api-gateway',   'API Gateway',          p(2,3), { max_capacity: 3000 }),
    pn('vs-rl',     'rate-limiter',  'Rate Limiter',         p(3,2), { max_capacity: 2500 }),
    pn('vs-auth',   'microservice',  'Auth & DRM Service',   p(4,1), { processing_time: 50, max_capacity: 700 }),
    pn('vs-content','microservice',  'Content Service',      p(4,2), { processing_time: 40, max_capacity: 600 }),
    pn('vs-stream', 'microservice',  'Streaming Service',    p(4,3), { processing_time: 80, max_capacity: 400 }),
    pn('vs-rec',    'microservice',  'Recommendation Svc',   p(4,4), { processing_time: 180, max_capacity: 250 }),
    pn('vs-srch',   'microservice',  'Search Service',       p(4,5), { processing_time: 70, max_capacity: 400 }),
    pn('vs-meta',   'microservice',  'Metadata Service',     p(4,6), { processing_time: 30, max_capacity: 800 }),
    pn('vs-redis',  'redis',         'Cache (Redis)',         p(5,1), { cache_hit_rate: 88, processing_time: 3 }),
    pn('vs-udb',    'postgresql',    'Users DB',             p(5,2), { processing_time: 45, max_capacity: 400 }),
    pn('vs-mdb',    'mongodb',       'Metadata DB (Mongo)',   p(5,3), { processing_time: 35, max_capacity: 500 }),
    pn('vs-cdb',    'clickhouse',    'Analytics (ClickHouse)',p(5,4), { processing_time: 200, max_capacity: 100 }),
    pn('vs-s3',     's3-storage',    'Video Storage (S3)',   p(5,5), { processing_time: 25, max_capacity: 800 }),
    pn('vs-kafka',  'kafka',         'Kafka Streaming',      p(6,3), { processing_time: 8, max_capacity: 15000 }),
    pn('vs-transcode','worker',      'Transcoding Workers',  p(7,2), { processing_time: 5000, max_capacity: 10, failure_rate: 2 }),
    pn('vs-analytics','microservice','Analytics Pipeline',   p(7,4), { processing_time: 300, max_capacity: 80 }),
    pn('vs-elk',    'elk-stack',     'Logging (ELK)',         p(7,5)),
    pn('vs-prom',   'prometheus',    'Monitoring',           p(6,6)),
  ];
  const edges: Edge[] = [
    pe('vs-e1','vs-client','vs-cdn'),    pe('vs-e2','vs-mob','vs-cdn'),
    pe('vs-e3','vs-client','vs-gw'),     pe('vs-e4','vs-mob','vs-gw'),
    pe('vs-e5','vs-cdn','vs-s3'),        pe('vs-e6','vs-gw','vs-ddos'),
    pe('vs-e7','vs-ddos','vs-rl'),       pe('vs-e8','vs-rl','vs-auth'),
    pe('vs-e9','vs-rl','vs-content'),    pe('vs-e10','vs-rl','vs-stream'),
    pe('vs-e11','vs-rl','vs-rec'),       pe('vs-e12','vs-rl','vs-srch'),
    pe('vs-e13','vs-rl','vs-meta'),      pe('vs-e14','vs-auth','vs-redis'),
    pe('vs-e15','vs-auth','vs-udb'),     pe('vs-e16','vs-content','vs-redis'),
    pe('vs-e17','vs-content','vs-mdb'),  pe('vs-e18','vs-stream','vs-s3'),
    pe('vs-e19','vs-stream','vs-mdb'),   pe('vs-e20','vs-rec','vs-redis'),
    pe('vs-e21','vs-srch','vs-mdb'),     pe('vs-e22','vs-meta','vs-mdb'),
    pe('vs-e23','vs-stream','vs-kafka'), pe('vs-e24','vs-kafka','vs-transcode'),
    pe('vs-e25','vs-kafka','vs-analytics'),pe('vs-e26','vs-kafka','vs-elk'),
    pe('vs-e27','vs-analytics','vs-cdb'),pe('vs-e28','vs-prom','vs-elk'),
  ];
  return { nodes, edges };
})();

// ─── Template 4: Real-Time Chat System ──────────────────────────────────────

const realtimeChat = (() => {
  const nodes: Node<NodeData>[] = [
    pn('rc-mob',    'mobile-client',    'iOS / Android',        p(0,2)),
    pn('rc-web',    'web-browser',      'Web Client',           p(0,4)),
    pn('rc-gw',     'api-gateway',      'HTTP API Gateway',     p(1,3), { max_capacity: 3000 }),
    pn('rc-lb',     'load-balancer',    'WebSocket LB',         p(2,3), { max_capacity: 8000 }),
    pn('rc-ws1',    'websocket-server', 'WebSocket GW 1',       p(3,1), { processing_time: 5, max_capacity: 3000 }),
    pn('rc-ws2',    'websocket-server', 'WebSocket GW 2',       p(3,3), { processing_time: 5, max_capacity: 3000 }),
    pn('rc-ws3',    'websocket-server', 'WebSocket GW 3',       p(3,5), { processing_time: 5, max_capacity: 3000 }),
    pn('rc-pres',   'microservice',     'Presence Service',     p(4,0), { processing_time: 20, max_capacity: 1000 }),
    pn('rc-chat1',  'microservice',     'Chat Service A',       p(4,2), { processing_time: 30, max_capacity: 800 }),
    pn('rc-chat2',  'microservice',     'Chat Service B',       p(4,4), { processing_time: 30, max_capacity: 800 }),
    pn('rc-media',  'microservice',     'Media Service',        p(4,6), { processing_time: 150, max_capacity: 200 }),
    pn('rc-redis',  'redis',            'Pub/Sub Cache',        p(5,1), { cache_hit_rate: 70, processing_time: 3, max_capacity: 5000 }),
    pn('rc-redis2', 'redis',            'Presence Store',       p(5,3), { processing_time: 3, max_capacity: 5000 }),
    pn('rc-kafka',  'kafka',            'Message Queue',        p(5,5), { processing_time: 8, max_capacity: 20000, queue_limit: 1000 }),
    pn('rc-mdb',    'mongodb',          'Messages DB',          p(6,2), { processing_time: 40, max_capacity: 500 }),
    pn('rc-udb',    'postgresql',       'Users DB',             p(6,4), { processing_time: 45, max_capacity: 400 }),
    pn('rc-s3',     's3-storage',       'Media Storage',        p(6,6), { processing_time: 20, max_capacity: 800 }),
    pn('rc-notif',  'microservice',     'Push Notifications',   p(7,1), { processing_time: 100, max_capacity: 300 }),
    pn('rc-srch',   'microservice',     'Message Search',       p(7,3), { processing_time: 80, max_capacity: 300 }),
    pn('rc-es',     'elasticsearch',    'Search Index',         p(7,5), { processing_time: 80, max_capacity: 300 }),
    pn('rc-analytics','clickhouse',     'Analytics',            p(6,0), { processing_time: 200, max_capacity: 80 }),
    pn('rc-monitor','prometheus',       'Monitoring',           p(7,7)),
  ];
  const edges: Edge[] = [
    pe('rc-e1','rc-mob','rc-gw'),      pe('rc-e2','rc-web','rc-gw'),
    pe('rc-e3','rc-mob','rc-lb'),      pe('rc-e4','rc-web','rc-lb'),
    pe('rc-e5','rc-lb','rc-ws1'),      pe('rc-e6','rc-lb','rc-ws2'),
    pe('rc-e7','rc-lb','rc-ws3'),      pe('rc-e8','rc-ws1','rc-pres'),
    pe('rc-e9','rc-ws1','rc-chat1'),   pe('rc-e10','rc-ws2','rc-chat1'),
    pe('rc-e11','rc-ws2','rc-chat2'),  pe('rc-e12','rc-ws3','rc-chat2'),
    pe('rc-e13','rc-ws3','rc-media'),  pe('rc-e14','rc-pres','rc-redis2'),
    pe('rc-e15','rc-chat1','rc-redis'),pe('rc-e16','rc-chat1','rc-kafka'),
    pe('rc-e17','rc-chat2','rc-redis'),pe('rc-e18','rc-chat2','rc-kafka'),
    pe('rc-e19','rc-media','rc-s3'),   pe('rc-e20','rc-kafka','rc-mdb'),
    pe('rc-e21','rc-kafka','rc-notif'),pe('rc-e22','rc-kafka','rc-srch'),
    pe('rc-e23','rc-kafka','rc-analytics'),pe('rc-e24','rc-srch','rc-es'),
    pe('rc-e25','rc-gw','rc-udb'),     pe('rc-e26','rc-monitor','rc-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Template 5: Fintech / Banking ──────────────────────────────────────────

const fintech = (() => {
  const nodes: Node<NodeData>[] = [
    pn('ft-mob',   'mobile-client',  'Banking App',           p(0,2)),
    pn('ft-web',   'web-browser',    'Web Banking',           p(0,4)),
    pn('ft-ddos',  'ddos-scrubber',  'DDoS Shield',           p(1,1)),
    pn('ft-waf',   'app-waf',        'WAF',                   p(1,3)),
    pn('ft-fw',    'network-firewall','Network Firewall',      p(1,5)),
    pn('ft-gw',    'api-gateway',    'API Gateway',           p(2,3), { max_capacity: 2000 }),
    pn('ft-auth',  'microservice',   'Auth + MFA',            p(3,2), { processing_time: 60, max_capacity: 500 }),
    pn('ft-rl',    'rate-limiter',   'Rate Limiter',          p(3,4), { max_capacity: 1500, allowed_rps: 100 }),
    pn('ft-cb',    'circuit-breaker','Circuit Breaker',       p(3,6), { circuit_breaker_enabled: true, circuit_breaker_threshold: 20 }),
    pn('ft-txn',   'microservice',   'Transaction Service',   p(4,1), { processing_time: 150, max_capacity: 200, failure_rate: 0.5 }),
    pn('ft-ledger','microservice',   'Ledger Service',        p(4,3), { processing_time: 100, max_capacity: 300 }),
    pn('ft-fraud', 'microservice',   'Fraud Detection',       p(4,5), { processing_time: 300, max_capacity: 150, failure_rate: 0.2 }),
    pn('ft-risk',  'microservice',   'Risk Engine',           p(5,1), { processing_time: 200, max_capacity: 150 }),
    pn('ft-redis', 'redis',          'Session & Rate Cache',  p(5,3), { processing_time: 3, max_capacity: 3000 }),
    pn('ft-kafka', 'kafka',          'Event Stream',          p(5,5), { processing_time: 8, max_capacity: 10000, queue_limit: 500 }),
    pn('ft-primary','cockroachdb',   'Primary DB (Geo-Dist)', p(6,2), { processing_time: 80, max_capacity: 300, failure_rate: 0.1 }),
    pn('ft-replica','postgresql',    'Read Replica',          p(6,4), { processing_time: 40, max_capacity: 500 }),
    pn('ft-audit', 'postgresql',     'Audit Log DB',          p(6,0), { processing_time: 50, max_capacity: 500 }),
    pn('ft-notif', 'microservice',   'Notification Service',  p(7,1), { processing_time: 80, max_capacity: 300 }),
    pn('ft-comply','microservice',   'Compliance Service',    p(7,3), { processing_time: 300, max_capacity: 100 }),
    pn('ft-analytics','clickhouse',  'Analytics DB',          p(7,5), { processing_time: 200, max_capacity: 100 }),
    pn('ft-elk',   'elk-stack',      'Log Aggregation (ELK)', p(7,7)),
  ];
  const edges: Edge[] = [
    pe('ft-e1','ft-mob','ft-ddos'),   pe('ft-e2','ft-web','ft-ddos'),
    pe('ft-e3','ft-ddos','ft-waf'),   pe('ft-e4','ft-waf','ft-fw'),
    pe('ft-e5','ft-fw','ft-gw'),      pe('ft-e6','ft-gw','ft-auth'),
    pe('ft-e7','ft-gw','ft-rl'),      pe('ft-e8','ft-rl','ft-cb'),
    pe('ft-e9','ft-cb','ft-txn'),     pe('ft-e10','ft-cb','ft-ledger'),
    pe('ft-e11','ft-cb','ft-fraud'),  pe('ft-e12','ft-auth','ft-redis'),
    pe('ft-e13','ft-txn','ft-risk'),  pe('ft-e14','ft-txn','ft-primary'),
    pe('ft-e15','ft-txn','ft-kafka'), pe('ft-e16','ft-ledger','ft-primary'),
    pe('ft-e17','ft-ledger','ft-replica'),pe('ft-e18','ft-fraud','ft-redis'),
    pe('ft-e19','ft-risk','ft-primary'),pe('ft-e20','ft-primary','ft-audit'),
    pe('ft-e21','ft-kafka','ft-notif'),pe('ft-e22','ft-kafka','ft-comply'),
    pe('ft-e23','ft-kafka','ft-analytics'),pe('ft-e24','ft-kafka','ft-elk'),
    pe('ft-e25','ft-comply','ft-audit'),
  ];
  return { nodes, edges };
})();

// ─── Template 6: Ride-Sharing ────────────────────────────────────────────────

const rideSharing = (() => {
  const nodes: Node<NodeData>[] = [
    pn('rs-rider',  'mobile-client',    'Rider App',            p(0,1)),
    pn('rs-driver', 'mobile-client',    'Driver App',           p(0,5)),
    pn('rs-gw',     'api-gateway',      'API Gateway',          p(1,3), { max_capacity: 3000 }),
    pn('rs-rl',     'rate-limiter',     'Rate Limiter',         p(2,1), { max_capacity: 2500 }),
    pn('rs-lb',     'load-balancer',    'Load Balancer',        p(2,3), { max_capacity: 5000 }),
    pn('rs-ws',     'websocket-server', 'Real-Time WS',         p(2,5), { processing_time: 5, max_capacity: 5000 }),
    pn('rs-auth',   'microservice',     'Auth Service',         p(3,0), { processing_time: 40, max_capacity: 800 }),
    pn('rs-match',  'microservice',     'Matching Service',     p(3,2), { processing_time: 200, max_capacity: 150, failure_rate: 2 }),
    pn('rs-loc',    'microservice',     'Location Service',     p(3,4), { processing_time: 30, max_capacity: 1000 }),
    pn('rs-trip',   'microservice',     'Trip Service',         p(3,6), { processing_time: 80, max_capacity: 500 }),
    pn('rs-price',  'microservice',     'Pricing Service',      p(4,1), { processing_time: 100, max_capacity: 400 }),
    pn('rs-drvsvc', 'microservice',     'Driver Service',       p(4,3), { processing_time: 60, max_capacity: 600 }),
    pn('rs-notif',  'microservice',     'Notification Service', p(4,5), { processing_time: 80, max_capacity: 400 }),
    pn('rs-redis',  'redis',            'Geo Cache (Redis)',     p(5,1), { processing_time: 3, max_capacity: 5000 }),
    pn('rs-influx', 'influxdb',         'Location History (TS)',p(5,3), { processing_time: 40, max_capacity: 2000 }),
    pn('rs-udb',    'postgresql',       'Users & Trips DB',     p(5,5), { processing_time: 55, max_capacity: 400 }),
    pn('rs-kafka',  'kafka',            'Event Stream',         p(6,3), { processing_time: 8, max_capacity: 15000 }),
    pn('rs-surge',  'ml-model',         'Surge Pricing ML',     p(7,1), { processing_time: 200, max_capacity: 100 }),
    pn('rs-analytics','clickhouse',     'Analytics',            p(7,3), { processing_time: 200, max_capacity: 100 }),
    pn('rs-pay',    'microservice',     'Payment Service',      p(6,5), { processing_time: 200, max_capacity: 200, failure_rate: 1 }),
    pn('rs-pdb',    'postgresql',       'Payment DB',           p(7,5), { processing_time: 60, max_capacity: 200 }),
    pn('rs-monitor','prometheus',       'Monitoring',           p(7,7)),
  ];
  const edges: Edge[] = [
    pe('rs-e1','rs-rider','rs-gw'),   pe('rs-e2','rs-driver','rs-gw'),
    pe('rs-e3','rs-rider','rs-ws'),   pe('rs-e4','rs-driver','rs-ws'),
    pe('rs-e5','rs-gw','rs-rl'),      pe('rs-e6','rs-rl','rs-lb'),
    pe('rs-e7','rs-lb','rs-auth'),    pe('rs-e8','rs-lb','rs-match'),
    pe('rs-e9','rs-lb','rs-loc'),     pe('rs-e10','rs-lb','rs-trip'),
    pe('rs-e11','rs-ws','rs-loc'),    pe('rs-e12','rs-match','rs-redis'),
    pe('rs-e13','rs-match','rs-price'),pe('rs-e14','rs-loc','rs-redis'),
    pe('rs-e15','rs-loc','rs-influx'),pe('rs-e16','rs-trip','rs-udb'),
    pe('rs-e17','rs-trip','rs-kafka'),pe('rs-e18','rs-price','rs-surge'),
    pe('rs-e19','rs-drvsvc','rs-udb'),pe('rs-e20','rs-drvsvc','rs-kafka'),
    pe('rs-e21','rs-kafka','rs-notif'),pe('rs-e22','rs-kafka','rs-analytics'),
    pe('rs-e23','rs-kafka','rs-pay'), pe('rs-e24','rs-pay','rs-pdb'),
    pe('rs-e25','rs-surge','rs-redis'),pe('rs-e26','rs-monitor','rs-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Template 7: SaaS Platform ──────────────────────────────────────────────

const saasPlatform = (() => {
  const nodes: Node<NodeData>[] = [
    pn('ss-user',   'user',          'Customers',             p(0,3)),
    pn('ss-cdn',    'cdn',           'CDN',                   p(1,2), { cache_hit_rate: 75, processing_time: 4 }),
    pn('ss-waf',    'app-waf',       'WAF',                   p(1,4)),
    pn('ss-gw',     'api-gateway',   'API Gateway',           p(2,3), { max_capacity: 3000 }),
    pn('ss-auth',   'microservice',  'Auth / OAuth / SSO',    p(3,2), { processing_time: 50, max_capacity: 600 }),
    pn('ss-rl',     'rate-limiter',  'Rate Limiter',          p(3,4), { max_capacity: 2000 }),
    pn('ss-mesh',   'service-mesh',  'Service Mesh (Istio)',  p(4,0), { processing_time: 5, max_capacity: 10000 }),
    pn('ss-tenant', 'microservice',  'Tenant Router',         p(4,2), { processing_time: 30, max_capacity: 800 }),
    pn('ss-core',   'backend',       'Core API Service',      p(4,4), { processing_time: 100, max_capacity: 400 }),
    pn('ss-billing','microservice',  'Billing Service',       p(4,6), { processing_time: 200, max_capacity: 150, failure_rate: 1 }),
    pn('ss-webhook','microservice',  'Webhook Delivery',      p(5,7), { processing_time: 300, max_capacity: 100 }),
    pn('ss-redis',  'redis',         'Cache (Redis)',          p(5,1), { cache_hit_rate: 80, processing_time: 3 }),
    pn('ss-tdb',    'postgresql',    'Tenant Config DB',      p(5,2), { processing_time: 40, max_capacity: 400 }),
    pn('ss-adb',    'postgresql',    'App Data DB',           p(5,3), { processing_time: 60, max_capacity: 300 }),
    pn('ss-bdb',    'postgresql',    'Billing DB',            p(5,5), { processing_time: 60, max_capacity: 200 }),
    pn('ss-audit',  'postgresql',    'Audit Log DB',          p(5,0), { processing_time: 50, max_capacity: 500 }),
    pn('ss-s3',     's3-storage',    'File Storage (S3)',     p(5,6), { processing_time: 20, max_capacity: 800 }),
    pn('ss-kafka',  'kafka',         'Event Bus (Kafka)',     p(6,3), { processing_time: 8, max_capacity: 10000, queue_limit: 500 }),
    pn('ss-email',  'microservice',  'Email Service',         p(7,2), { processing_time: 200, max_capacity: 200 }),
    pn('ss-analytics','clickhouse',  'Analytics',             p(7,4), { processing_time: 200, max_capacity: 80 }),
    pn('ss-srch',   'elasticsearch', 'Full-Text Search',      p(6,5), { processing_time: 80, max_capacity: 300 }),
    pn('ss-monitor','datadog',       'DataDog Monitoring',   p(7,6)),
  ];
  const edges: Edge[] = [
    pe('ss-e1','ss-user','ss-cdn'),    pe('ss-e2','ss-user','ss-waf'),
    pe('ss-e3','ss-cdn','ss-gw'),      pe('ss-e4','ss-waf','ss-gw'),
    pe('ss-e5','ss-gw','ss-auth'),     pe('ss-e6','ss-gw','ss-rl'),
    pe('ss-e7','ss-rl','ss-mesh'),     pe('ss-e8','ss-mesh','ss-tenant'),
    pe('ss-e9','ss-mesh','ss-core'),   pe('ss-e10','ss-mesh','ss-billing'),
    pe('ss-e11','ss-auth','ss-redis'), pe('ss-e12','ss-tenant','ss-redis'),
    pe('ss-e13','ss-tenant','ss-tdb'), pe('ss-e14','ss-core','ss-adb'),
    pe('ss-e15','ss-core','ss-kafka'), pe('ss-e16','ss-core','ss-srch'),
    pe('ss-e17','ss-billing','ss-bdb'),pe('ss-e18','ss-billing','ss-kafka'),
    pe('ss-e19','ss-core','ss-s3'),    pe('ss-e20','ss-kafka','ss-email'),
    pe('ss-e21','ss-kafka','ss-webhook'),pe('ss-e22','ss-kafka','ss-analytics'),
    pe('ss-e23','ss-core','ss-audit'), pe('ss-e24','ss-monitor','ss-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Template 8: IoT Data Pipeline ──────────────────────────────────────────

const iotPipeline = (() => {
  const nodes: Node<NodeData>[] = [
    pn('io-dev1',   'iot-device',     'Temp Sensors',         p(0,1), { max_capacity: 10000 }),
    pn('io-dev2',   'iot-device',     'Motion Detectors',     p(0,3), { max_capacity: 10000 }),
    pn('io-dev3',   'iot-device',     'Smart Meters',         p(0,5), { max_capacity: 5000 }),
    pn('io-lb',     'load-balancer',  'MQTT / HTTP LB',       p(1,3), { max_capacity: 30000 }),
    pn('io-gw1',    'backend',        'IoT Gateway 1',        p(2,1), { processing_time: 10, max_capacity: 10000 }),
    pn('io-gw2',    'backend',        'IoT Gateway 2',        p(2,3), { processing_time: 10, max_capacity: 10000 }),
    pn('io-gw3',    'backend',        'IoT Gateway 3',        p(2,5), { processing_time: 10, max_capacity: 10000 }),
    pn('io-schema', 'microservice',   'Schema Registry',      p(3,1), { processing_time: 20, max_capacity: 3000 }),
    pn('io-rl',     'rate-limiter',   'Per-Device Throttle',  p(3,3), { max_capacity: 20000 }),
    pn('io-rules',  'microservice',   'Rules Engine',         p(3,5), { processing_time: 40, max_capacity: 2000 }),
    pn('io-ingest', 'stream-processor','Ingest Service',      p(4,2), { processing_time: 30, max_capacity: 5000 }),
    pn('io-proc1',  'stream-processor','Stream Processor A',  p(4,4), { processing_time: 50, max_capacity: 3000 }),
    pn('io-kafka',  'kafka',          'Kafka (Multi-Topic)',   p(5,3), { processing_time: 8, max_capacity: 50000, queue_limit: 2000 }),
    pn('io-redis',  'redis',          'Device State Cache',   p(6,1), { processing_time: 3, max_capacity: 10000 }),
    pn('io-ts',     'influxdb',       'Time-Series DB',       p(6,3), { processing_time: 30, max_capacity: 5000 }),
    pn('io-cold',   's3-storage',     'Cold Storage (S3)',    p(6,5), { processing_time: 20, max_capacity: 2000 }),
    pn('io-devices','mongodb',        'Device Registry',      p(5,6), { processing_time: 40, max_capacity: 500 }),
    pn('io-analytics','microservice', 'Analytics Engine',     p(7,2), { processing_time: 200, max_capacity: 200 }),
    pn('io-alert',  'microservice',   'Alert Service',        p(7,4), { processing_time: 80, max_capacity: 500 }),
    pn('io-dash',   'backend',        'Real-Time Dashboard',  p(7,6), { processing_time: 60, max_capacity: 300 }),
    pn('io-dw',     'data-warehouse', 'Data Warehouse',       p(8,3), { processing_time: 500, max_capacity: 20 }),
    pn('io-monitor','prometheus',     'Monitoring',           p(8,5)),
  ];
  const edges: Edge[] = [
    pe('io-e1','io-dev1','io-lb'),    pe('io-e2','io-dev2','io-lb'),
    pe('io-e3','io-dev3','io-lb'),    pe('io-e4','io-lb','io-gw1'),
    pe('io-e5','io-lb','io-gw2'),     pe('io-e6','io-lb','io-gw3'),
    pe('io-e7','io-gw1','io-schema'), pe('io-e8','io-gw2','io-rl'),
    pe('io-e9','io-gw3','io-rules'),  pe('io-e10','io-schema','io-ingest'),
    pe('io-e11','io-rl','io-ingest'), pe('io-e12','io-rules','io-proc1'),
    pe('io-e13','io-ingest','io-kafka'),pe('io-e14','io-proc1','io-kafka'),
    pe('io-e15','io-kafka','io-redis'),pe('io-e16','io-kafka','io-ts'),
    pe('io-e17','io-kafka','io-cold'),pe('io-e18','io-kafka','io-alert'),
    pe('io-e19','io-kafka','io-analytics'),pe('io-e20','io-gw1','io-devices'),
    pe('io-e21','io-analytics','io-dw'),pe('io-e22','io-analytics','io-dash'),
    pe('io-e23','io-alert','io-dash'),pe('io-e24','io-monitor','io-ts'),
  ];
  return { nodes, edges };
})();

// ─── Template 9: Search Engine System ───────────────────────────────────────

const searchEngine = (() => {
  const nodes: Node<NodeData>[] = [
    pn('se-user',   'user',          'Search Users',          p(0,3)),
    pn('se-bot',    'bot',           'Web Crawlers',          p(0,5)),
    pn('se-cdn',    'cdn',           'Query Cache CDN',       p(1,2), { cache_hit_rate: 60, processing_time: 5 }),
    pn('se-gw',     'api-gateway',   'API Gateway',           p(1,4), { max_capacity: 5000 }),
    pn('se-rl',     'rate-limiter',  'Rate Limiter',          p(2,3), { max_capacity: 4000 }),
    pn('se-parser', 'microservice',  'Query Parser',          p(3,2), { processing_time: 20, max_capacity: 2000 }),
    pn('se-spell',  'microservice',  'Spell Check',           p(3,4), { processing_time: 30, max_capacity: 1000 }),
    pn('se-urlq',   'kafka',         'URL Frontier',          p(3,6), { processing_time: 8, max_capacity: 10000 }),
    pn('se-planner','microservice',  'Query Planner',         p(4,1), { processing_time: 30, max_capacity: 1500 }),
    pn('se-rank',   'microservice',  'Ranking Engine (ML)',   p(4,3), { processing_time: 150, max_capacity: 300, failure_rate: 1 }),
    pn('se-suggest','microservice',  'Autocomplete',          p(4,5), { processing_time: 20, max_capacity: 2000 }),
    pn('se-crawler','microservice',  'Crawler Service',       p(4,7), { processing_time: 500, max_capacity: 50 }),
    pn('se-lb',     'load-balancer', 'Search Cluster LB',    p(5,2), { max_capacity: 5000 }),
    pn('se-redis',  'redis',         'Query Result Cache',    p(5,4), { cache_hit_rate: 65, processing_time: 3 }),
    pn('se-kafka',  'kafka',         'Index Event Stream',    p(5,6), { processing_time: 8, max_capacity: 10000 }),
    pn('se-es1',    'elasticsearch', 'Search Node 1',         p(6,1), { processing_time: 70, max_capacity: 500 }),
    pn('se-es2',    'elasticsearch', 'Search Node 2',         p(6,3), { processing_time: 70, max_capacity: 500 }),
    pn('se-es3',    'elasticsearch', 'Search Node 3',         p(6,5), { processing_time: 70, max_capacity: 500 }),
    pn('se-updater','worker',        'Index Updater',         p(7,1), { processing_time: 300, max_capacity: 80 }),
    pn('se-click',  'microservice',  'Click Tracker',         p(7,3), { processing_time: 50, max_capacity: 500 }),
    pn('se-analytics','clickhouse',  'Analytics (ClickHouse)',p(7,5), { processing_time: 200, max_capacity: 100 }),
    pn('se-monitor','prometheus',    'Monitoring',            p(7,7)),
  ];
  const edges: Edge[] = [
    pe('se-e1','se-user','se-cdn'),    pe('se-e2','se-user','se-gw'),
    pe('se-e3','se-bot','se-urlq'),    pe('se-e4','se-cdn','se-gw'),
    pe('se-e5','se-gw','se-rl'),       pe('se-e6','se-rl','se-parser'),
    pe('se-e7','se-rl','se-spell'),    pe('se-e8','se-parser','se-planner'),
    pe('se-e9','se-spell','se-planner'),pe('se-e10','se-planner','se-rank'),
    pe('se-e11','se-planner','se-suggest'),pe('se-e12','se-rank','se-lb'),
    pe('se-e13','se-rank','se-redis'), pe('se-e14','se-lb','se-es1'),
    pe('se-e15','se-lb','se-es2'),     pe('se-e16','se-lb','se-es3'),
    pe('se-e17','se-kafka','se-updater'),pe('se-e18','se-updater','se-es1'),
    pe('se-e19','se-updater','se-es2'),pe('se-e20','se-updater','se-es3'),
    pe('se-e21','se-urlq','se-crawler'),pe('se-e22','se-crawler','se-kafka'),
    pe('se-e23','se-click','se-analytics'),pe('se-e24','se-rank','se-click'),
    pe('se-e25','se-monitor','se-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Template 10: Online Gaming Backend ─────────────────────────────────────

const gamingBackend = (() => {
  const nodes: Node<NodeData>[] = [
    pn('gm-pc',     'desktop-app',      'PC Game Client',       p(0,1)),
    pn('gm-mob',    'mobile-client',    'Mobile Game Client',   p(0,5)),
    pn('gm-lb',     'load-balancer',    'Game Server LB',       p(1,3), { max_capacity: 10000 }),
    pn('gm-match',  'microservice',     'Matchmaking Service',  p(2,1), { processing_time: 200, max_capacity: 200, failure_rate: 2 }),
    pn('gm-gs1',    'backend',          'Game Server 1',        p(2,3), { processing_time: 20, max_capacity: 500 }),
    pn('gm-gs2',    'backend',          'Game Server 2',        p(2,5), { processing_time: 20, max_capacity: 500 }),
    pn('gm-ws',     'websocket-server', 'Realtime WS Hub',      p(3,3), { processing_time: 3, max_capacity: 5000 }),
    pn('gm-state',  'microservice',     'Game State Service',   p(3,1), { processing_time: 15, max_capacity: 1000 }),
    pn('gm-anti',   'microservice',     'Anti-Cheat Service',   p(3,5), { processing_time: 100, max_capacity: 300 }),
    pn('gm-leader', 'microservice',     'Leaderboard Service',  p(4,2), { processing_time: 30, max_capacity: 800 }),
    pn('gm-chat',   'microservice',     'In-Game Chat',         p(4,4), { processing_time: 20, max_capacity: 1000 }),
    pn('gm-economy','microservice',     'Economy / Shop',       p(4,6), { processing_time: 100, max_capacity: 300, failure_rate: 1 }),
    pn('gm-redis1', 'redis',            'Game State Cache',     p(5,1), { processing_time: 2, max_capacity: 8000 }),
    pn('gm-redis2', 'redis',            'Session & Lobby Cache',p(5,3), { processing_time: 2, max_capacity: 5000 }),
    pn('gm-pdb',    'mongodb',          'Player Profiles (Mongo)',p(5,5), { processing_time: 35, max_capacity: 600 }),
    pn('gm-gdb',    'postgresql',       'Game Data DB',         p(5,2), { processing_time: 50, max_capacity: 400 }),
    pn('gm-kafka',  'kafka',            'Event Bus',            p(6,3), { processing_time: 8, max_capacity: 20000, queue_limit: 1000 }),
    pn('gm-monitor','prometheus',       'Prometheus',           p(6,1)),
    pn('gm-analytics','clickhouse',     'Game Analytics',       p(7,2), { processing_time: 200, max_capacity: 100 }),
    pn('gm-achieve','microservice',     'Achievement Service',  p(7,4), { processing_time: 100, max_capacity: 300 }),
    pn('gm-notif',  'microservice',     'Push Notifications',   p(7,6), { processing_time: 100, max_capacity: 400 }),
    pn('gm-pay',    'microservice',     'In-App Purchases',     p(6,5), { processing_time: 300, max_capacity: 150, failure_rate: 1.5 }),
  ];
  const edges: Edge[] = [
    pe('gm-e1','gm-pc','gm-lb'),       pe('gm-e2','gm-mob','gm-lb'),
    pe('gm-e3','gm-lb','gm-match'),    pe('gm-e4','gm-lb','gm-gs1'),
    pe('gm-e5','gm-lb','gm-gs2'),      pe('gm-e6','gm-gs1','gm-ws'),
    pe('gm-e7','gm-gs2','gm-ws'),      pe('gm-e8','gm-ws','gm-state'),
    pe('gm-e9','gm-ws','gm-chat'),     pe('gm-e10','gm-match','gm-redis2'),
    pe('gm-e11','gm-state','gm-redis1'),pe('gm-e12','gm-state','gm-gdb'),
    pe('gm-e13','gm-gs1','gm-anti'),   pe('gm-e14','gm-gs2','gm-anti'),
    pe('gm-e15','gm-leader','gm-redis1'),pe('gm-e16','gm-leader','gm-gdb'),
    pe('gm-e17','gm-chat','gm-kafka'), pe('gm-e18','gm-economy','gm-pdb'),
    pe('gm-e19','gm-economy','gm-pay'),pe('gm-e20','gm-state','gm-kafka'),
    pe('gm-e21','gm-kafka','gm-analytics'),pe('gm-e22','gm-kafka','gm-achieve'),
    pe('gm-e23','gm-kafka','gm-notif'),pe('gm-e24','gm-achieve','gm-pdb'),
    pe('gm-e25','gm-monitor','gm-analytics'),
  ];
  return { nodes, edges };
})();

// ─── Exports ────────────────────────────────────────────────────────────────

export const ADVANCED_PRESETS: Record<string, { nodes: Node<NodeData>[]; edges: Edge[] }> = {
  ecommerce:      ecommerce,
  'social-media': socialMedia,
  'video-streaming': videoStreaming,
  'realtime-chat': realtimeChat,
  fintech:        fintech,
  'ride-sharing': rideSharing,
  'saas-platform': saasPlatform,
  'iot-pipeline': iotPipeline,
  'search-engine': searchEngine,
  'gaming-backend': gamingBackend,
};

export type AdvancedPresetId = keyof typeof ADVANCED_PRESETS;
