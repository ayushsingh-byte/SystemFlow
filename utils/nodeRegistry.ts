export type NodeCategory =
  | 'clients'
  | 'network'
  | 'compute'
  | 'servers'
  | 'database'
  | 'storage'
  | 'messaging'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'security'
  | 'observability'
  | 'ai-ml';

export interface NodeColorConfig {
  bg: string;
  border: string;
  glow: string;
  text: string;
  category: string;
}

export interface NodeTypeConfig {
  id: string;
  label: string;
  category: NodeCategory;
  emoji: string;
  description: string;
  tagline: string;
  color: NodeColorConfig;
  defaults: {
    processing_time: number;
    max_capacity: number;
    failure_rate: number;
    timeout_ms: number;
    retry_count: number;
  };
  tags: string[];
  premium?: boolean;
}

// ─── Color palette by category ─────────────────────────────────────────────
const C = {
  clients:     { bg: '#040d19', border: '#00d4ff', glow: '#00d4ff', text: '#7ee3ff',  category: 'Clients' },
  network:     { bg: '#06112a', border: '#3b82f6', glow: '#3b82f6', text: '#93c5fd',  category: 'Network' },
  compute:     { bg: '#0d0520', border: '#8b5cf6', glow: '#8b5cf6', text: '#c4b5fd',  category: 'Compute' },
  database:    { bg: '#1a0d00', border: '#f59e0b', glow: '#f59e0b', text: '#fde68a',  category: 'Database' },
  storage:     { bg: '#1a1000', border: '#eab308', glow: '#eab308', text: '#fef08a',  category: 'Storage' },
  messaging:   { bg: '#1a0218', border: '#ec4899', glow: '#ec4899', text: '#fbcfe8',  category: 'Messaging' },
  aws:         { bg: '#1a0d00', border: '#ff9900', glow: '#ff9900', text: '#fed7aa',  category: 'AWS' },
  gcp:         { bg: '#040e23', border: '#4285f4', glow: '#4285f4', text: '#93c5fd',  category: 'GCP' },
  azure:       { bg: '#040d1a', border: '#0078d4', glow: '#0078d4', text: '#7dd3fc',  category: 'Azure' },
  security:    { bg: '#1a0404', border: '#ef4444', glow: '#ef4444', text: '#fca5a5',  category: 'Security' },
  observability:{ bg: '#041a0d', border: '#10b981', glow: '#10b981', text: '#6ee7b7', category: 'Observability' },
  'ai-ml':     { bg: '#0d0416', border: '#a855f7', glow: '#a855f7', text: '#d8b4fe',  category: 'AI / ML' },
  servers:     { bg: '#0d1a05', border: '#22c55e', glow: '#22c55e', text: '#86efac',  category: 'Servers' },
};

// ─── Default params by category ────────────────────────────────────────────
const D = {
  clients:      { processing_time: 0,    max_capacity: 999,   failure_rate: 0,   timeout_ms: 0,    retry_count: 0 },
  network_fast: { processing_time: 3,    max_capacity: 999,   failure_rate: 0.1, timeout_ms: 2000, retry_count: 0 },
  network_mid:  { processing_time: 20,   max_capacity: 999,   failure_rate: 0.5, timeout_ms: 3000, retry_count: 1 },
  compute_fast: { processing_time: 30,   max_capacity: 500,   failure_rate: 1,   timeout_ms: 5000, retry_count: 1 },
  compute_mid:  { processing_time: 100,  max_capacity: 200,   failure_rate: 2,   timeout_ms: 8000, retry_count: 1 },
  compute_slow: { processing_time: 300,  max_capacity: 50,    failure_rate: 3,   timeout_ms: 30000,retry_count: 0 },
  db_fast:      { processing_time: 5,    max_capacity: 999,   failure_rate: 0.2, timeout_ms: 1000, retry_count: 0 },
  db_mid:       { processing_time: 50,   max_capacity: 200,   failure_rate: 1,   timeout_ms: 8000, retry_count: 0 },
  db_slow:      { processing_time: 150,  max_capacity: 50,    failure_rate: 2,   timeout_ms: 30000,retry_count: 0 },
  storage:      { processing_time: 20,   max_capacity: 999,   failure_rate: 0.1, timeout_ms: 5000, retry_count: 1 },
  messaging:    { processing_time: 10,   max_capacity: 999,   failure_rate: 0.1, timeout_ms: 0,    retry_count: 0 },
  managed:      { processing_time: 15,   max_capacity: 999,   failure_rate: 0.2, timeout_ms: 5000, retry_count: 1 },
  security_svc: { processing_time: 5,    max_capacity: 999,   failure_rate: 0.1, timeout_ms: 2000, retry_count: 0 },
  obs:          { processing_time: 50,   max_capacity: 500,   failure_rate: 0.5, timeout_ms: 5000, retry_count: 0 },
  ai:           { processing_time: 500,  max_capacity: 20,    failure_rate: 2,   timeout_ms: 60000,retry_count: 1 },
  ai_fast:      { processing_time: 50,   max_capacity: 200,   failure_rate: 1,   timeout_ms: 10000,retry_count: 1 },
  servers:      { processing_time: 30,   max_capacity: 500,   failure_rate: 0.5, timeout_ms: 30000,retry_count: 1 },
};

export const NODE_REGISTRY: NodeTypeConfig[] = [
  // ───── CLIENTS ─────────────────────────────────────────────────────────────
  { id: 'user',         label: 'User',           category: 'clients', emoji: '👤', tagline: 'Human traffic source', description: 'End user generating requests', color: C.clients, defaults: D.clients, tags: ['source', 'traffic'] },
  { id: 'mobile-client',label: 'Mobile App',     category: 'clients', emoji: '📱', tagline: 'iOS / Android client', description: 'Mobile application sending API requests', color: C.clients, defaults: D.clients, tags: ['client', 'mobile'] },
  { id: 'web-browser',  label: 'Web Browser',    category: 'clients', emoji: '🌐', tagline: 'Browser client', description: 'Browser-based frontend application', color: C.clients, defaults: D.clients, tags: ['client', 'browser', 'web'] },
  { id: 'desktop-app',  label: 'Desktop App',    category: 'clients', emoji: '🖥️', tagline: 'Native desktop client', description: 'Native app on macOS/Windows/Linux', color: C.clients, defaults: D.clients, tags: ['client', 'desktop'] },
  { id: 'iot-device',   label: 'IoT Device',     category: 'clients', emoji: '🔌', tagline: 'Sensor / actuator', description: 'IoT device sending telemetry or commands', color: C.clients, defaults: { ...D.clients, max_capacity: 999 }, tags: ['iot', 'edge', 'hardware'] },
  { id: 'bot',          label: 'Bot / Scraper',  category: 'clients', emoji: '🤖', tagline: 'Automated traffic', description: 'Bot, web scraper, or automated test client', color: C.clients, defaults: { ...D.clients, max_capacity: 999 }, tags: ['bot', 'automation'] },
  { id: 'cli-client',   label: 'CLI Client',     category: 'clients', emoji: '⌨️', tagline: 'Terminal / scripts', description: 'Command-line tools and shell scripts', color: C.clients, defaults: D.clients, tags: ['cli', 'scripts'] },
  { id: 'sdk-client',   label: 'SDK / Library',  category: 'clients', emoji: '📦', tagline: 'SDK-based client', description: 'Third-party service calling your API via SDK', color: C.clients, defaults: D.clients, tags: ['sdk', 'library'] },

  // ───── NETWORK ─────────────────────────────────────────────────────────────
  { id: 'api-gateway',    label: 'API Gateway',      category: 'network', emoji: '🔀', tagline: 'Single API entry point', description: 'Routes requests, handles auth & rate limiting', color: C.network, defaults: D.network_mid, tags: ['gateway', 'routing'] },
  { id: 'load-balancer',  label: 'Load Balancer',    category: 'network', emoji: '⚖️', tagline: 'Distributes traffic', description: 'L4/L7 load balancer distributing requests across backends', color: C.network, defaults: { ...D.network_fast, max_capacity: 999 }, tags: ['lb', 'routing', 'ha'] },
  { id: 'cdn',            label: 'CDN',              category: 'network', emoji: '🌍', tagline: 'Edge caching layer', description: 'Content delivery network serving cached responses at edge', color: C.network, defaults: D.network_fast, tags: ['cdn', 'cache', 'edge'] },
  { id: 'reverse-proxy',  label: 'Reverse Proxy',    category: 'network', emoji: '↩️', tagline: 'Nginx / HAProxy', description: 'Terminates TLS and proxies to upstream services', color: C.network, defaults: { ...D.network_fast, max_capacity: 999 }, tags: ['proxy', 'nginx', 'tls'] },
  { id: 'forward-proxy',  label: 'Forward Proxy',    category: 'network', emoji: '↪️', tagline: 'Outbound proxy', description: 'Proxies outbound requests from internal services', color: C.network, defaults: D.network_fast, tags: ['proxy', 'egress'] },
  { id: 'dns',            label: 'DNS Server',       category: 'network', emoji: '📡', tagline: 'Name resolution', description: 'Domain name system resolving hostnames to IPs', color: C.network, defaults: { ...D.network_fast, processing_time: 1, max_capacity: 999 }, tags: ['dns', 'network'] },
  { id: 'firewall',       label: 'Firewall',         category: 'network', emoji: '🔥', tagline: 'Packet filtering', description: 'Network firewall filtering ingress/egress traffic', color: C.network, defaults: { ...D.network_fast, processing_time: 2 }, tags: ['security', 'firewall', 'network'] },
  { id: 'waf',            label: 'WAF',              category: 'network', emoji: '🛡️', tagline: 'Web app firewall', description: 'Inspects HTTP requests for attacks (SQLi, XSS, etc.)', color: C.network, defaults: { ...D.network_fast, processing_time: 8 }, tags: ['waf', 'security', 'owasp'] },
  { id: 'vpn',            label: 'VPN Gateway',      category: 'network', emoji: '🔒', tagline: 'Encrypted tunnel', description: 'VPN gateway for secure site-to-site or client access', color: C.network, defaults: { ...D.network_mid, processing_time: 5 }, tags: ['vpn', 'security', 'tunnel'] },
  { id: 'nat-gateway',    label: 'NAT Gateway',      category: 'network', emoji: '🔄', tagline: 'IP translation', description: 'Network address translation for private subnet egress', color: C.network, defaults: D.network_fast, tags: ['nat', 'network', 'egress'] },
  { id: 'ingress',        label: 'Ingress Controller',category: 'network', emoji: '⬇️', tagline: 'K8s ingress', description: 'Kubernetes Ingress controller routing external traffic', color: C.network, defaults: D.network_mid, tags: ['kubernetes', 'ingress', 'k8s'] },
  { id: 'service-mesh',   label: 'Service Mesh',     category: 'network', emoji: '🕸️', tagline: 'Istio / Linkerd', description: 'Service mesh handling mTLS, observability and traffic policies', color: C.network, defaults: { ...D.network_fast, processing_time: 5 }, tags: ['istio', 'mesh', 'mtls'] },
  { id: 'traffic-router', label: 'Traffic Router',   category: 'network', emoji: '🚦', tagline: 'Smart routing', description: 'Routes traffic based on headers, paths, or weights', color: C.network, defaults: D.network_fast, tags: ['routing', 'ab-test', 'canary'] },
  { id: 'api-proxy',      label: 'API Proxy',        category: 'network', emoji: '🔁', tagline: 'Protocol bridge', description: 'Translates protocols (REST↔GraphQL, REST↔gRPC)', color: C.network, defaults: D.network_mid, tags: ['proxy', 'protocol', 'graphql', 'grpc'] },
  { id: 'rate-limiter',   label: 'Rate Limiter',     category: 'network', emoji: '🛡️', tagline: 'Throttles requests', description: 'Limits request rate per client/IP/token', color: C.network, defaults: { processing_time: 2, max_capacity: 100, failure_rate: 0, timeout_ms: 100, retry_count: 0 }, tags: ['rate-limit', 'throttle'] },

  // ───── COMPUTE ─────────────────────────────────────────────────────────────
  { id: 'backend',         label: 'Backend Service',  category: 'compute', emoji: '⚙️',  tagline: 'Core app logic', description: 'General-purpose backend application service', color: C.compute, defaults: D.compute_mid, tags: ['api', 'service', 'app'] },
  { id: 'microservice',    label: 'Microservice',     category: 'compute', emoji: '🔬',  tagline: 'Domain service', description: 'Isolated microservice owning a single business domain', color: C.compute, defaults: D.compute_mid, tags: ['microservice', 'domain', 'bounded-context'] },
  { id: 'web-server',      label: 'Web Server',       category: 'compute', emoji: '🌐',  tagline: 'Nginx / Apache', description: 'Static file server and HTTP handler', color: C.compute, defaults: { ...D.compute_fast, max_capacity: 999 }, tags: ['nginx', 'apache', 'static'] },
  { id: 'worker',          label: 'Worker',           category: 'compute', emoji: '👷',  tagline: 'Background processor', description: 'Background worker processing async jobs from a queue', color: C.compute, defaults: { ...D.compute_mid, processing_time: 500 }, tags: ['worker', 'async', 'background'] },
  { id: 'serverless',      label: 'Serverless',       category: 'compute', emoji: '⚡',  tagline: 'FaaS function', description: 'Stateless function with cold start overhead', color: C.compute, defaults: { processing_time: 200, max_capacity: 999, failure_rate: 1, timeout_ms: 15000, retry_count: 2 }, tags: ['lambda', 'faas', 'function'] },
  { id: 'container',       label: 'Container',        category: 'compute', emoji: '🐳',  tagline: 'Docker container', description: 'Containerized workload running in Docker', color: C.compute, defaults: D.compute_mid, tags: ['docker', 'container', 'oci'] },
  { id: 'kubernetes-pod',  label: 'K8s Pod',          category: 'compute', emoji: '☸️',  tagline: 'Pod replica', description: 'Kubernetes pod running one or more containers', color: C.compute, defaults: D.compute_mid, tags: ['kubernetes', 'k8s', 'pod'] },
  { id: 'vm',              label: 'Virtual Machine',  category: 'compute', emoji: '💻',  tagline: 'IaaS instance', description: 'Virtual machine instance (EC2, GCE, Azure VM)', color: C.compute, defaults: { ...D.compute_mid, processing_time: 150 }, tags: ['vm', 'ec2', 'compute', 'iaas'], premium: true },
  { id: 'edge-function',   label: 'Edge Function',    category: 'compute', emoji: '🔮',  tagline: 'Runs at the edge', description: 'Cloudflare Worker / Vercel Edge Function at CDN edge', color: C.compute, defaults: { ...D.compute_fast, processing_time: 10 }, tags: ['edge', 'cloudflare', 'vercel'], premium: true },
  { id: 'batch-job',       label: 'Batch Job',        category: 'compute', emoji: '📋',  tagline: 'Scheduled batch', description: 'Large-scale batch processing job running on schedule', color: C.compute, defaults: { processing_time: 5000, max_capacity: 10, failure_rate: 2, timeout_ms: 300000, retry_count: 3 }, tags: ['batch', 'etl', 'scheduled'] },
  { id: 'stream-processor',label: 'Stream Processor', category: 'compute', emoji: '🌊',  tagline: 'Flink / Spark Streaming', description: 'Real-time stream processing engine (Flink, Spark Streaming)', color: C.compute, defaults: { processing_time: 50, max_capacity: 999, failure_rate: 0.5, timeout_ms: 10000, retry_count: 1 }, tags: ['flink', 'spark', 'streaming', 'realtime'] },
  { id: 'cron-job',        label: 'Cron Job',         category: 'compute', emoji: '⏰',  tagline: 'Scheduled task', description: 'Periodic task triggered on a schedule', color: C.compute, defaults: { processing_time: 1000, max_capacity: 5, failure_rate: 1, timeout_ms: 60000, retry_count: 1 }, tags: ['cron', 'scheduler', 'periodic'] },
  { id: 'graphql-server',  label: 'GraphQL Server',   category: 'compute', emoji: '◈',   tagline: 'Query language API', description: 'GraphQL API server with flexible querying', color: C.compute, defaults: D.compute_fast, tags: ['graphql', 'api', 'query'] },
  { id: 'grpc-server',     label: 'gRPC Server',      category: 'compute', emoji: '⚡',  tagline: 'High-perf RPC', description: 'gRPC server for high-performance inter-service communication', color: C.compute, defaults: { ...D.compute_fast, processing_time: 20, max_capacity: 999 }, tags: ['grpc', 'rpc', 'protobuf'] },

  // ───── DATABASES ───────────────────────────────────────────────────────────
  { id: 'postgresql',   label: 'PostgreSQL',    category: 'database', emoji: '🐘', tagline: 'Relational DB', description: 'ACID-compliant relational database (PostgreSQL)', color: C.database, defaults: D.db_mid, tags: ['sql', 'relational', 'acid', 'postgres'] },
  { id: 'mysql',        label: 'MySQL',         category: 'database', emoji: '🐬', tagline: 'Relational DB', description: 'MySQL/MariaDB relational database', color: C.database, defaults: D.db_mid, tags: ['sql', 'mysql', 'relational'] },
  { id: 'mongodb',      label: 'MongoDB',       category: 'database', emoji: '🍃', tagline: 'Document DB', description: 'Schema-flexible document database', color: C.database, defaults: { ...D.db_mid, processing_time: 30 }, tags: ['nosql', 'document', 'mongo'] },
  { id: 'cassandra',    label: 'Cassandra',     category: 'database', emoji: '💫', tagline: 'Wide-column store', description: 'Highly available distributed wide-column store (AP)', color: C.database, defaults: { ...D.db_mid, max_capacity: 500, processing_time: 20 }, tags: ['cassandra', 'wide-column', 'distributed'] },
  { id: 'redis',        label: 'Redis',         category: 'database', emoji: '⚡', tagline: 'In-memory cache', description: 'In-memory data structure store, used as cache or DB', color: C.database, defaults: D.db_fast, tags: ['cache', 'redis', 'in-memory', 'key-value'] },
  { id: 'dynamodb',     label: 'DynamoDB',      category: 'database', emoji: '⚡', tagline: 'AWS key-value/doc', description: 'AWS fully managed NoSQL database with single-digit ms latency', color: C.database, defaults: { ...D.db_fast, processing_time: 10 }, tags: ['dynamodb', 'aws', 'nosql', 'serverless'] },
  { id: 'elasticsearch',label: 'Elasticsearch', category: 'database', emoji: '🔍', tagline: 'Search & analytics', description: 'Distributed full-text search and analytics engine', color: C.database, defaults: { ...D.db_mid, processing_time: 80 }, tags: ['search', 'elasticsearch', 'elk', 'lucene'] },
  { id: 'neo4j',        label: 'Neo4j',         category: 'database', emoji: '🕸️', tagline: 'Graph database', description: 'Graph database for connected data and relationship queries', color: C.database, defaults: { ...D.db_mid, processing_time: 100 }, tags: ['graph', 'neo4j', 'cypher'] },
  { id: 'influxdb',     label: 'InfluxDB',      category: 'database', emoji: '📈', tagline: 'Time-series DB', description: 'Optimized time-series database for metrics & events', color: C.database, defaults: { ...D.db_mid, max_capacity: 500 }, tags: ['timeseries', 'influx', 'metrics', 'iot'] },
  { id: 'clickhouse',   label: 'ClickHouse',    category: 'database', emoji: '🏎️', tagline: 'OLAP columnar DB', description: 'Column-oriented DBMS for real-time analytics (OLAP)', color: C.database, defaults: { ...D.db_mid, processing_time: 200, max_capacity: 100 }, tags: ['olap', 'clickhouse', 'analytics', 'columnar'], premium: true },
  { id: 'sqlite',       label: 'SQLite',        category: 'database', emoji: '📁', tagline: 'Embedded DB', description: 'Embedded relational database, single file', color: C.database, defaults: { ...D.db_fast, max_capacity: 50 }, tags: ['sqlite', 'embedded', 'local'] },
  { id: 'cockroachdb',  label: 'CockroachDB',   category: 'database', emoji: '🪳', tagline: 'Distributed SQL', description: 'Distributed SQL database with global transactions', color: C.database, defaults: { ...D.db_mid, processing_time: 80, max_capacity: 300 }, tags: ['cockroach', 'distributed', 'sql', 'global'], premium: true },
  { id: 'aurora',       label: 'Aurora',        category: 'database', emoji: '✨', tagline: 'AWS serverless SQL', description: 'AWS Aurora serverless relational DB (MySQL/Postgres compat)', color: C.database, defaults: { ...D.db_mid, max_capacity: 300 }, tags: ['aurora', 'aws', 'serverless', 'sql'] },
  { id: 'supabase',     label: 'Supabase',      category: 'database', emoji: '💚', tagline: 'Firebase alternative', description: 'Open-source Firebase alternative with Postgres backend', color: C.database, defaults: D.db_mid, tags: ['supabase', 'postgres', 'baas'] },
  { id: 'firestore',    label: 'Firestore',     category: 'database', emoji: '🔥', tagline: 'GCP document DB', description: 'Google Cloud Firestore — serverless document database', color: C.database, defaults: { ...D.db_fast, processing_time: 20 }, tags: ['firestore', 'gcp', 'nosql', 'document'] },
  { id: 'mssql',        label: 'SQL Server',    category: 'database', emoji: '🪟', tagline: 'Microsoft SQL', description: 'Microsoft SQL Server relational database', color: C.database, defaults: D.db_mid, tags: ['mssql', 'sqlserver', 'microsoft', 'sql'] },
  { id: 'oracle-db',    label: 'Oracle DB',     category: 'database', emoji: '🏛️', tagline: 'Enterprise SQL', description: 'Oracle Database enterprise relational database', color: C.database, defaults: { ...D.db_slow, max_capacity: 200 }, tags: ['oracle', 'enterprise', 'sql'], premium: true },

  // ───── STORAGE ─────────────────────────────────────────────────────────────
  { id: 's3-storage',     label: 'Object Storage',  category: 'storage', emoji: '🪣', tagline: 'S3-compatible blobs', description: 'Object storage like S3, GCS, or Azure Blob (files, backups)', color: C.storage, defaults: D.storage, tags: ['s3', 'object', 'blob', 'files'] },
  { id: 'blob-storage',   label: 'Blob Storage',    category: 'storage', emoji: '💾', tagline: 'Binary large objects', description: 'Raw blob storage for unstructured binary data', color: C.storage, defaults: D.storage, tags: ['blob', 'binary', 'azure'] },
  { id: 'file-system',    label: 'File System',     category: 'storage', emoji: '📂', tagline: 'NFS / EFS', description: 'Shared network file system (NFS, EFS, CIFS)', color: C.storage, defaults: { ...D.storage, max_capacity: 200 }, tags: ['nfs', 'efs', 'filesystem'] },
  { id: 'data-lake',      label: 'Data Lake',       category: 'storage', emoji: '🏔️', tagline: 'Raw data at scale', description: 'Stores raw structured and unstructured data at petabyte scale', color: C.storage, defaults: { ...D.storage, processing_time: 200, max_capacity: 50 }, tags: ['datalake', 'hdfs', 's3', 'analytics'] },
  { id: 'data-warehouse',  label: 'Data Warehouse',  category: 'storage', emoji: '🏭', tagline: 'OLAP analytics store', description: 'Snowflake/BigQuery/Redshift for BI and analytics workloads', color: C.storage, defaults: { ...D.storage, processing_time: 500, max_capacity: 20 }, tags: ['warehouse', 'snowflake', 'bigquery', 'redshift', 'olap'], premium: true },
  { id: 'vector-db',      label: 'Vector Database', category: 'storage', emoji: '🧮', tagline: 'Embeddings store', description: 'Stores and queries high-dimensional vectors (Pinecone, Weaviate, Qdrant)', color: C.storage, defaults: { ...D.storage, processing_time: 80 }, tags: ['vector', 'embeddings', 'ai', 'pinecone', 'weaviate'] },
  { id: 'hdfs',           label: 'HDFS',            category: 'storage', emoji: '🗃️', tagline: 'Hadoop distributed FS', description: 'Hadoop Distributed File System for big data processing', color: C.storage, defaults: { ...D.storage, processing_time: 300, max_capacity: 30 }, tags: ['hdfs', 'hadoop', 'bigdata'] },
  { id: 'cdn-storage',    label: 'CDN / Edge Store',category: 'storage', emoji: '🌏', tagline: 'Edge cached assets', description: 'Static assets cached at CDN edge nodes globally', color: C.storage, defaults: { ...D.storage, processing_time: 5, max_capacity: 999 }, tags: ['cdn', 'edge', 'static', 'assets'] },
  { id: 'block-storage',  label: 'Block Storage',   category: 'storage', emoji: '🧱', tagline: 'EBS / Persistent disk', description: 'Raw block storage volumes attached to VMs (EBS, PD)', color: C.storage, defaults: { ...D.storage, processing_time: 10, max_capacity: 500 }, tags: ['ebs', 'block', 'disk', 'volume'] },

  // ───── MESSAGING ────────────────────────────────────────────────────────────
  { id: 'kafka',           label: 'Kafka',          category: 'messaging', emoji: '📨', tagline: 'Distributed log', description: 'Apache Kafka distributed event streaming platform', color: C.messaging, defaults: { ...D.messaging, max_capacity: 999 }, tags: ['kafka', 'events', 'streaming', 'log'] },
  { id: 'rabbitmq',        label: 'RabbitMQ',       category: 'messaging', emoji: '🐰', tagline: 'AMQP message broker', description: 'RabbitMQ AMQP message broker with routing and exchanges', color: C.messaging, defaults: D.messaging, tags: ['rabbitmq', 'amqp', 'broker'] },
  { id: 'sqs',             label: 'SQS',            category: 'messaging', emoji: '📬', tagline: 'AWS managed queue', description: 'AWS Simple Queue Service — managed message queue', color: C.messaging, defaults: { ...D.messaging, processing_time: 20 }, tags: ['sqs', 'aws', 'queue', 'managed'] },
  { id: 'sns',             label: 'SNS',            category: 'messaging', emoji: '📢', tagline: 'AWS pub/sub fanout', description: 'AWS Simple Notification Service — fan-out pub/sub', color: C.messaging, defaults: { ...D.messaging, processing_time: 15 }, tags: ['sns', 'aws', 'pubsub', 'fanout'] },
  { id: 'pubsub',          label: 'Pub/Sub',        category: 'messaging', emoji: '📡', tagline: 'GCP messaging', description: 'Google Cloud Pub/Sub managed messaging service', color: C.messaging, defaults: D.messaging, tags: ['pubsub', 'gcp', 'messaging'] },
  { id: 'mqtt',            label: 'MQTT Broker',    category: 'messaging', emoji: '📻', tagline: 'IoT messaging', description: 'MQTT protocol broker for IoT device messaging (low bandwidth)', color: C.messaging, defaults: { ...D.messaging, max_capacity: 999 }, tags: ['mqtt', 'iot', 'lightweight'] },
  { id: 'websocket-server',label: 'WebSocket',      category: 'messaging', emoji: '🔌', tagline: 'Real-time duplex', description: 'WebSocket server for full-duplex real-time communication', color: C.messaging, defaults: { ...D.messaging, processing_time: 5, max_capacity: 999 }, tags: ['websocket', 'realtime', 'duplex'] },
  { id: 'event-bus',       label: 'Event Bus',      category: 'messaging', emoji: '🚌', tagline: 'In-process events', description: 'Internal event bus for loosely-coupled components', color: C.messaging, defaults: { ...D.messaging, max_capacity: 999 }, tags: ['events', 'bus', 'reactive'] },
  { id: 'nats',            label: 'NATS',           category: 'messaging', emoji: '💬', tagline: 'Cloud-native messaging', description: 'NATS — high-performance cloud-native messaging system', color: C.messaging, defaults: { ...D.messaging, processing_time: 3, max_capacity: 999 }, tags: ['nats', 'cloud-native', 'messaging'] },
  { id: 'zeromq',          label: 'ZeroMQ',         category: 'messaging', emoji: '⚡', tagline: 'Socket patterns', description: 'ZeroMQ async messaging library with socket patterns', color: C.messaging, defaults: { ...D.messaging, processing_time: 2, max_capacity: 999 }, tags: ['zeromq', 'zmq', 'sockets'] },
  { id: 'redis-streams',   label: 'Redis Streams',  category: 'messaging', emoji: '🌊', tagline: 'In-memory streams', description: 'Redis Streams — append-only log in Redis for event sourcing', color: C.messaging, defaults: { ...D.messaging, processing_time: 5, max_capacity: 999 }, tags: ['redis', 'streams', 'events', 'log'] },
  { id: 'activemq',        label: 'ActiveMQ',       category: 'messaging', emoji: '🔗', tagline: 'JMS broker', description: 'Apache ActiveMQ JMS-compatible message broker', color: C.messaging, defaults: D.messaging, tags: ['activemq', 'jms', 'java', 'broker'] },

  // ───── AWS ─────────────────────────────────────────────────────────────────
  { id: 'aws-lambda',         label: 'AWS Lambda',        category: 'aws', emoji: 'λ',  tagline: 'Serverless compute', description: 'AWS Lambda — event-driven serverless compute service', color: C.aws, defaults: { processing_time: 200, max_capacity: 999, failure_rate: 0.5, timeout_ms: 15000, retry_count: 2 }, tags: ['aws', 'lambda', 'serverless', 'faas'], premium: true },
  { id: 'aws-ec2',            label: 'AWS EC2',           category: 'aws', emoji: '🖥️', tagline: 'Virtual server', description: 'AWS Elastic Compute Cloud virtual machine instance', color: C.aws, defaults: D.compute_mid, tags: ['aws', 'ec2', 'vm', 'compute'], premium: true },
  { id: 'aws-ecs',            label: 'AWS ECS',           category: 'aws', emoji: '🐳', tagline: 'Container service', description: 'AWS Elastic Container Service for Docker workloads', color: C.aws, defaults: D.compute_mid, tags: ['aws', 'ecs', 'docker', 'container'], premium: true },
  { id: 'aws-eks',            label: 'AWS EKS',           category: 'aws', emoji: '☸️', tagline: 'Managed Kubernetes', description: 'AWS Elastic Kubernetes Service — managed K8s control plane', color: C.aws, defaults: D.compute_mid, tags: ['aws', 'eks', 'kubernetes', 'k8s'], premium: true },
  { id: 'aws-rds',            label: 'AWS RDS',           category: 'aws', emoji: '🗄️', tagline: 'Managed relational DB', description: 'AWS Relational Database Service (MySQL, Postgres, Oracle)', color: C.aws, defaults: D.db_mid, tags: ['aws', 'rds', 'sql', 'managed'], premium: true },
  { id: 'aws-elasticache',    label: 'AWS ElastiCache',   category: 'aws', emoji: '⚡', tagline: 'Managed Redis/Memcached', description: 'AWS managed Redis and Memcached in-memory caching', color: C.aws, defaults: D.db_fast, tags: ['aws', 'elasticache', 'redis', 'cache'], premium: true },
  { id: 'aws-s3',             label: 'AWS S3',            category: 'aws', emoji: '🪣', tagline: 'Object storage', description: 'AWS Simple Storage Service — scalable object storage', color: C.aws, defaults: D.storage, tags: ['aws', 's3', 'object', 'storage'], premium: true },
  { id: 'aws-sqs',            label: 'AWS SQS',           category: 'aws', emoji: '📬', tagline: 'Managed queue', description: 'AWS Simple Queue Service — managed message queue', color: C.aws, defaults: D.messaging, tags: ['aws', 'sqs', 'queue'], premium: true },
  { id: 'aws-sns',            label: 'AWS SNS',           category: 'aws', emoji: '📢', tagline: 'Push notification', description: 'AWS Simple Notification Service for pub/sub', color: C.aws, defaults: D.messaging, tags: ['aws', 'sns', 'notifications', 'pubsub'], premium: true },
  { id: 'aws-api-gateway',    label: 'AWS API GW',        category: 'aws', emoji: '🔀', tagline: 'Managed API gateway', description: 'AWS managed API gateway with auth, caching, throttling', color: C.aws, defaults: D.network_mid, tags: ['aws', 'api-gateway', 'managed'], premium: true },
  { id: 'aws-cloudfront',     label: 'AWS CloudFront',    category: 'aws', emoji: '☁️', tagline: 'Global CDN', description: 'AWS CloudFront global CDN with 400+ edge locations', color: C.aws, defaults: D.network_fast, tags: ['aws', 'cloudfront', 'cdn', 'edge'], premium: true },
  { id: 'aws-route53',        label: 'AWS Route 53',      category: 'aws', emoji: '🌐', tagline: 'DNS & routing', description: 'AWS Route 53 DNS, health checks, and traffic routing', color: C.aws, defaults: { ...D.network_fast, processing_time: 1 }, tags: ['aws', 'route53', 'dns', 'routing'], premium: true },
  { id: 'aws-alb',            label: 'AWS ALB',           category: 'aws', emoji: '⚖️', tagline: 'L7 load balancer', description: 'AWS Application Load Balancer with path-based routing', color: C.aws, defaults: { ...D.network_fast, max_capacity: 999 }, tags: ['aws', 'alb', 'load-balancer', 'l7'], premium: true },
  { id: 'aws-kinesis',        label: 'AWS Kinesis',       category: 'aws', emoji: '🌊', tagline: 'Data streaming', description: 'AWS Kinesis Data Streams for real-time data ingestion', color: C.aws, defaults: { ...D.messaging, max_capacity: 999 }, tags: ['aws', 'kinesis', 'streaming', 'realtime'], premium: true },
  { id: 'aws-step-functions', label: 'AWS Step Functions',category: 'aws', emoji: '🔗', tagline: 'Workflow orchestration', description: 'AWS Step Functions for serverless workflow orchestration', color: C.aws, defaults: { ...D.compute_slow, processing_time: 100 }, tags: ['aws', 'step-functions', 'workflow', 'orchestration'], premium: true },
  { id: 'aws-cognito',        label: 'AWS Cognito',       category: 'aws', emoji: '🔐', tagline: 'User identity pool', description: 'AWS Cognito for user authentication and identity management', color: C.aws, defaults: D.security_svc, tags: ['aws', 'cognito', 'auth', 'identity'], premium: true },
  { id: 'aws-secrets-manager',label: 'AWS Secrets Mgr',  category: 'aws', emoji: '🔒', tagline: 'Secrets vault', description: 'AWS Secrets Manager for storing and rotating credentials', color: C.aws, defaults: D.security_svc, tags: ['aws', 'secrets', 'vault', 'credentials'], premium: true },

  // ───── GCP ─────────────────────────────────────────────────────────────────
  { id: 'gcp-cloud-run',   label: 'GCP Cloud Run',   category: 'gcp', emoji: '🏃', tagline: 'Serverless containers', description: 'Google Cloud Run — fully managed serverless containers', color: C.gcp, defaults: { ...D.compute_fast, max_capacity: 500 }, tags: ['gcp', 'cloud-run', 'serverless', 'containers'], premium: true },
  { id: 'gcp-functions',   label: 'GCP Functions',   category: 'gcp', emoji: '⚡', tagline: 'Serverless FaaS', description: 'Google Cloud Functions — event-driven serverless functions', color: C.gcp, defaults: { processing_time: 200, max_capacity: 500, failure_rate: 0.5, timeout_ms: 60000, retry_count: 2 }, tags: ['gcp', 'functions', 'faas', 'serverless'], premium: true },
  { id: 'gcp-gke',         label: 'GCP GKE',         category: 'gcp', emoji: '☸️', tagline: 'Managed Kubernetes', description: 'Google Kubernetes Engine — managed K8s with Autopilot', color: C.gcp, defaults: D.compute_mid, tags: ['gcp', 'gke', 'kubernetes'], premium: true },
  { id: 'gcp-sql',         label: 'GCP Cloud SQL',   category: 'gcp', emoji: '🗄️', tagline: 'Managed SQL', description: 'Google Cloud SQL — fully managed MySQL/Postgres/SQL Server', color: C.gcp, defaults: D.db_mid, tags: ['gcp', 'cloud-sql', 'managed', 'sql'], premium: true },
  { id: 'gcp-firestore',   label: 'GCP Firestore',   category: 'gcp', emoji: '🔥', tagline: 'Serverless document DB', description: 'Google Cloud Firestore — serverless document DB', color: C.gcp, defaults: { ...D.db_fast, processing_time: 20 }, tags: ['gcp', 'firestore', 'nosql', 'document'], premium: true },
  { id: 'gcp-bigtable',    label: 'GCP Bigtable',    category: 'gcp', emoji: '📊', tagline: 'Wide-column NoSQL', description: 'Google Cloud Bigtable — HBase-compatible wide-column store', color: C.gcp, defaults: { ...D.db_fast, processing_time: 15, max_capacity: 999 }, tags: ['gcp', 'bigtable', 'hbase', 'wide-column'], premium: true },
  { id: 'gcp-pubsub',      label: 'GCP Pub/Sub',     category: 'gcp', emoji: '📡', tagline: 'Managed messaging', description: 'Google Cloud Pub/Sub — durable managed messaging service', color: C.gcp, defaults: D.messaging, tags: ['gcp', 'pubsub', 'messaging'], premium: true },
  { id: 'gcp-storage',     label: 'GCP Storage',     category: 'gcp', emoji: '🪣', tagline: 'Object storage', description: 'Google Cloud Storage — scalable object storage (S3 compatible)', color: C.gcp, defaults: D.storage, tags: ['gcp', 'gcs', 'object', 'storage'], premium: true },
  { id: 'gcp-load-balancer',label: 'GCP Load Balancer',category: 'gcp', emoji: '⚖️', tagline: 'Global L7 LB', description: 'Google Cloud Load Balancing — global anycast load balancer', color: C.gcp, defaults: { ...D.network_fast, max_capacity: 999 }, tags: ['gcp', 'load-balancer', 'global'], premium: true },
  { id: 'gcp-spanner',     label: 'GCP Spanner',     category: 'gcp', emoji: '💫', tagline: 'Global SQL', description: 'Google Cloud Spanner — globally distributed ACID SQL database', color: C.gcp, defaults: { ...D.db_mid, max_capacity: 400, processing_time: 30 }, tags: ['gcp', 'spanner', 'global', 'distributed', 'sql'], premium: true },
  { id: 'gcp-memorystore', label: 'GCP Memorystore', category: 'gcp', emoji: '⚡', tagline: 'Managed Redis', description: 'Google Cloud Memorystore — fully managed Redis/Memcached', color: C.gcp, defaults: D.db_fast, tags: ['gcp', 'memorystore', 'redis', 'cache'], premium: true },

  // ───── AZURE ───────────────────────────────────────────────────────────────
  { id: 'azure-functions',       label: 'Azure Functions',     category: 'azure', emoji: '⚡', tagline: 'Serverless compute', description: 'Azure Functions — event-driven serverless compute', color: C.azure, defaults: { processing_time: 200, max_capacity: 500, failure_rate: 0.5, timeout_ms: 30000, retry_count: 2 }, tags: ['azure', 'functions', 'serverless', 'faas'], premium: true },
  { id: 'azure-aks',             label: 'Azure AKS',           category: 'azure', emoji: '☸️', tagline: 'Managed Kubernetes', description: 'Azure Kubernetes Service — managed K8s', color: C.azure, defaults: D.compute_mid, tags: ['azure', 'aks', 'kubernetes'], premium: true },
  { id: 'azure-sql',             label: 'Azure SQL',           category: 'azure', emoji: '🗄️', tagline: 'Managed SQL Server', description: 'Azure SQL Database — managed SQL Server in the cloud', color: C.azure, defaults: D.db_mid, tags: ['azure', 'sql', 'managed'], premium: true },
  { id: 'azure-cosmos',          label: 'Azure Cosmos DB',     category: 'azure', emoji: '🌌', tagline: 'Multi-model global DB', description: 'Azure Cosmos DB — globally distributed multi-model database', color: C.azure, defaults: { ...D.db_fast, processing_time: 15 }, tags: ['azure', 'cosmos', 'nosql', 'global', 'multi-model'], premium: true },
  { id: 'azure-service-bus',     label: 'Azure Service Bus',   category: 'azure', emoji: '🚌', tagline: 'Enterprise messaging', description: 'Azure Service Bus — enterprise-grade message broker', color: C.azure, defaults: D.messaging, tags: ['azure', 'service-bus', 'messaging', 'broker'], premium: true },
  { id: 'azure-blob',            label: 'Azure Blob',          category: 'azure', emoji: '💾', tagline: 'Object storage', description: 'Azure Blob Storage — scalable unstructured data storage', color: C.azure, defaults: D.storage, tags: ['azure', 'blob', 'object', 'storage'], premium: true },
  { id: 'azure-event-hub',       label: 'Azure Event Hub',     category: 'azure', emoji: '🎪', tagline: 'Data streaming', description: 'Azure Event Hubs — big data streaming and event ingestion', color: C.azure, defaults: { ...D.messaging, max_capacity: 999 }, tags: ['azure', 'event-hub', 'streaming', 'kafka-compatible'], premium: true },
  { id: 'azure-container-apps',  label: 'Azure Container Apps',category: 'azure', emoji: '📦', tagline: 'Serverless containers', description: 'Azure Container Apps — serverless Kubernetes-based containers', color: C.azure, defaults: D.compute_fast, tags: ['azure', 'container-apps', 'serverless', 'containers'], premium: true },
  { id: 'azure-cache',           label: 'Azure Cache',         category: 'azure', emoji: '⚡', tagline: 'Managed Redis', description: 'Azure Cache for Redis — managed Redis caching service', color: C.azure, defaults: D.db_fast, tags: ['azure', 'cache', 'redis', 'managed'], premium: true },
  { id: 'azure-front-door',      label: 'Azure Front Door',    category: 'azure', emoji: '🚪', tagline: 'Global CDN & LB', description: 'Azure Front Door — global CDN with WAF and intelligent routing', color: C.azure, defaults: D.network_fast, tags: ['azure', 'front-door', 'cdn', 'waf', 'global'], premium: true },
  { id: 'azure-api-management',  label: 'Azure API Mgmt',      category: 'azure', emoji: '🔀', tagline: 'API gateway', description: 'Azure API Management — publish, secure, and analyze APIs', color: C.azure, defaults: D.network_mid, tags: ['azure', 'apim', 'gateway', 'managed'], premium: true },

  // ───── SECURITY ────────────────────────────────────────────────────────────
  { id: 'auth-service',          label: 'Auth Service',        category: 'security', emoji: '🔐', tagline: 'Authentication layer', description: 'Custom authentication and authorization service', color: C.security, defaults: D.security_svc, tags: ['auth', 'authz', 'jwt', 'session'] },
  { id: 'oauth2',                label: 'OAuth2 / OIDC',       category: 'security', emoji: '🎫', tagline: 'Federated identity', description: 'OAuth2/OIDC provider for federated login (Google, GitHub etc.)', color: C.security, defaults: D.security_svc, tags: ['oauth', 'oidc', 'sso', 'identity'] },
  { id: 'jwt-validator',         label: 'JWT Validator',       category: 'security', emoji: '🔑', tagline: 'Token verification', description: 'Validates and decodes JWT tokens, checks signatures and claims', color: C.security, defaults: { ...D.security_svc, processing_time: 2 }, tags: ['jwt', 'token', 'validation'] },
  { id: 'vault',                 label: 'Secrets Vault',       category: 'security', emoji: '🔒', tagline: 'HashiCorp Vault', description: 'Centralized secrets management, encryption-as-a-service', color: C.security, defaults: D.security_svc, tags: ['vault', 'hashicorp', 'secrets', 'encryption'] },
  { id: 'ddos-protection',       label: 'DDoS Protection',     category: 'security', emoji: '🏰', tagline: 'Attack mitigation', description: 'DDoS scrubbing and rate-based attack mitigation at edge', color: C.security, defaults: { ...D.security_svc, max_capacity: 999 }, tags: ['ddos', 'protection', 'edge', 'scrubbing'] },
  { id: 'certificate-authority', label: 'Certificate Authority',category: 'security', emoji: '📜', tagline: 'TLS cert issuance', description: 'Internal CA issuing and rotating TLS certificates', color: C.security, defaults: { ...D.security_svc, processing_time: 100, max_capacity: 100 }, tags: ['pki', 'tls', 'x509', 'mtls'] },
  { id: 'siem',                  label: 'SIEM',                category: 'security', emoji: '👁️', tagline: 'Security monitoring', description: 'Security Information & Event Management — log correlation and alerting', color: C.security, defaults: D.obs, tags: ['siem', 'security', 'logging', 'alerts'] },
  { id: 'ids-ips',               label: 'IDS/IPS',             category: 'security', emoji: '🚨', tagline: 'Intrusion detection', description: 'Intrusion Detection and Prevention System', color: C.security, defaults: { ...D.security_svc, processing_time: 5, max_capacity: 999 }, tags: ['ids', 'ips', 'intrusion', 'security'] },
  { id: 'zero-trust',            label: 'Zero Trust Proxy',    category: 'security', emoji: '🛡️', tagline: 'BeyondCorp / ZTNA', description: 'Zero-trust network access proxy (BeyondCorp, Cloudflare Access)', color: C.security, defaults: { ...D.security_svc, processing_time: 15 }, tags: ['zero-trust', 'ztna', 'beyondcorp', 'access'] },
  { id: 'api-key-manager',       label: 'API Key Manager',     category: 'security', emoji: '🗝️', tagline: 'Key lifecycle mgmt', description: 'Issues, rotates, and validates API keys and service tokens', color: C.security, defaults: D.security_svc, tags: ['apikey', 'credentials', 'rotation'] },
  { id: 'network-firewall',      label: 'Network Firewall',    category: 'security', emoji: '🧱', tagline: 'Stateful packet filtering', description: 'Network firewall filtering traffic by rules', color: C.security, defaults: { processing_time: 2, max_capacity: 999, failure_rate: 0.05, timeout_ms: 0, retry_count: 0 }, tags: ['security', 'network', 'filter', 'block'] },
  { id: 'app-waf',               label: 'WAF (Security)',       category: 'security', emoji: '🛡', tagline: 'Web Application Firewall', description: 'Layer 7 application firewall', color: C.security, defaults: { processing_time: 5, max_capacity: 999, failure_rate: 0.1, timeout_ms: 2000, retry_count: 0 }, tags: ['security', 'waf', 'l7', 'filter'] },
  { id: 'circuit-breaker',       label: 'Circuit Breaker',     category: 'network',  emoji: '⚡', tagline: 'Failure isolation pattern', description: 'Trips open on failure threshold to protect downstream', color: C.network, defaults: { processing_time: 1, max_capacity: 999, failure_rate: 0, timeout_ms: 5000, retry_count: 0 }, tags: ['resilience', 'circuit', 'breaker', 'pattern'] },
  { id: 'ddos-scrubber',         label: 'DDoS Protection',     category: 'security', emoji: '🔰', tagline: 'Absorbs volumetric attacks', description: 'DDoS mitigation layer scrubbing malicious traffic', color: C.security, defaults: { processing_time: 3, max_capacity: 999, failure_rate: 0.01, timeout_ms: 0, retry_count: 0 }, tags: ['ddos', 'security', 'protection', 'scrubbing'] },

  // ───── OBSERVABILITY ───────────────────────────────────────────────────────
  { id: 'prometheus',    label: 'Prometheus',      category: 'observability', emoji: '📊', tagline: 'Metrics scraping', description: 'Open-source metrics collection and alerting system', color: C.observability, defaults: D.obs, tags: ['prometheus', 'metrics', 'scraping', 'tsdb'] },
  { id: 'grafana',       label: 'Grafana',         category: 'observability', emoji: '📈', tagline: 'Metrics dashboard', description: 'Visualization platform for metrics, logs, and traces', color: C.observability, defaults: D.obs, tags: ['grafana', 'dashboard', 'visualization'] },
  { id: 'jaeger',        label: 'Jaeger',          category: 'observability', emoji: '🔭', tagline: 'Distributed tracing', description: 'Distributed request tracing and performance analysis', color: C.observability, defaults: D.obs, tags: ['jaeger', 'tracing', 'spans', 'opentelemetry'] },
  { id: 'elk-stack',     label: 'ELK Stack',       category: 'observability', emoji: '📦', tagline: 'Log aggregation', description: 'Elasticsearch + Logstash + Kibana for centralized logging', color: C.observability, defaults: { ...D.obs, max_capacity: 999 }, tags: ['elk', 'elasticsearch', 'kibana', 'logstash', 'logs'], premium: true },
  { id: 'datadog',       label: 'Datadog',         category: 'observability', emoji: '🐕', tagline: 'Cloud monitoring', description: 'Full-stack cloud monitoring: metrics, APM, logs, RUM', color: C.observability, defaults: D.obs, tags: ['datadog', 'apm', 'monitoring', 'saas'], premium: true },
  { id: 'newrelic',      label: 'New Relic',       category: 'observability', emoji: '📡', tagline: 'Observability platform', description: 'New Relic observability — APM, infrastructure, and browser monitoring', color: C.observability, defaults: D.obs, tags: ['newrelic', 'apm', 'observability'] },
  { id: 'health-check',  label: 'Health Check',    category: 'observability', emoji: '❤️', tagline: 'Liveness probes', description: 'Periodic health and readiness probes for services', color: C.observability, defaults: { processing_time: 10, max_capacity: 999, failure_rate: 0, timeout_ms: 5000, retry_count: 0 }, tags: ['health', 'probe', 'liveness', 'readiness'] },
  { id: 'alert-manager', label: 'Alert Manager',   category: 'observability', emoji: '🚨', tagline: 'Alert routing', description: 'Routes and deduplicates alerts from Prometheus or Grafana', color: C.observability, defaults: D.obs, tags: ['alerts', 'pagerduty', 'oncall', 'routing'] },
  { id: 'zipkin',        label: 'Zipkin',          category: 'observability', emoji: '🔍', tagline: 'Trace aggregation', description: 'Zipkin distributed tracing system for latency analysis', color: C.observability, defaults: D.obs, tags: ['zipkin', 'tracing', 'latency'] },
  { id: 'opentelemetry', label: 'OpenTelemetry',   category: 'observability', emoji: '🌡️', tagline: 'OTel collector', description: 'OpenTelemetry collector for vendor-agnostic observability', color: C.observability, defaults: D.obs, tags: ['otel', 'opentelemetry', 'traces', 'metrics', 'logs'], premium: true },

  // ───── AI / ML ─────────────────────────────────────────────────────────────
  { id: 'ml-model',         label: 'ML Model',         category: 'ai-ml', emoji: '🧠', tagline: 'Trained model', description: 'Deployed machine learning model (classification, regression, etc.)', color: C['ai-ml'], defaults: D.ai, tags: ['ml', 'model', 'sklearn', 'tensorflow', 'pytorch'], premium: true },
  { id: 'llm-api',          label: 'LLM API',          category: 'ai-ml', emoji: '💬', tagline: 'GPT / Claude / Gemini', description: 'Large Language Model API (OpenAI, Anthropic, Google)', color: C['ai-ml'], defaults: { processing_time: 2000, max_capacity: 10, failure_rate: 1, timeout_ms: 120000, retry_count: 2 }, tags: ['llm', 'gpt', 'claude', 'openai', 'anthropic'], premium: true },
  { id: 'vector-database',  label: 'Vector DB',        category: 'ai-ml', emoji: '🧮', tagline: 'Embedding store', description: 'Vector database for semantic search (Pinecone, Weaviate, Qdrant)', color: C['ai-ml'], defaults: { ...D.ai_fast, processing_time: 80, max_capacity: 200 }, tags: ['vector', 'embeddings', 'pinecone', 'weaviate', 'qdrant'], premium: true },
  { id: 'embedding-service',label: 'Embedding Service',category: 'ai-ml', emoji: '🔢', tagline: 'Text/image encoder', description: 'Generates dense vector embeddings from text or images', color: C['ai-ml'], defaults: { ...D.ai_fast, processing_time: 200 }, tags: ['embeddings', 'encoder', 'sentence-transformers'], premium: true },
  { id: 'feature-store',    label: 'Feature Store',    category: 'ai-ml', emoji: '📊', tagline: 'ML feature registry', description: 'Centralized store for ML feature computation and retrieval (Feast)', color: C['ai-ml'], defaults: { ...D.db_mid, processing_time: 30 }, tags: ['features', 'feast', 'ml-platform'], premium: true },
  { id: 'model-registry',   label: 'Model Registry',   category: 'ai-ml', emoji: '🗃️', tagline: 'Model versioning', description: 'MLflow/Sagemaker model registry for versioning and deployment', color: C['ai-ml'], defaults: { ...D.storage, processing_time: 100 }, tags: ['mlflow', 'sagemaker', 'versioning', 'registry'], premium: true },
  { id: 'inference-engine', label: 'Inference Engine', category: 'ai-ml', emoji: '🔮', tagline: 'Model serving', description: 'Optimized model serving layer (TorchServe, Triton, ONNX Runtime)', color: C['ai-ml'], defaults: D.ai_fast, tags: ['triton', 'torchserve', 'serving', 'inference'], premium: true },
  { id: 'training-cluster', label: 'Training Cluster', category: 'ai-ml', emoji: '🏋️', tagline: 'GPU training', description: 'GPU cluster for distributed model training (Ray, Horovod)', color: C['ai-ml'], defaults: { processing_time: 10000, max_capacity: 5, failure_rate: 3, timeout_ms: 0, retry_count: 1 }, tags: ['gpu', 'training', 'ray', 'horovod', 'distributed'], premium: true },
  { id: 'rag-pipeline',     label: 'RAG Pipeline',     category: 'ai-ml', emoji: '🔄', tagline: 'Retrieval-augmented gen', description: 'Retrieval-Augmented Generation pipeline: retrieve → augment → generate', color: C['ai-ml'], defaults: { processing_time: 1500, max_capacity: 20, failure_rate: 2, timeout_ms: 60000, retry_count: 1 }, tags: ['rag', 'retrieval', 'generation', 'llm', 'vector'], premium: true },
  { id: 'ai-agent',         label: 'AI Agent',         category: 'ai-ml', emoji: '🤖', tagline: 'Autonomous agent', description: 'Autonomous AI agent with tool-use and planning capabilities', color: C['ai-ml'], defaults: { processing_time: 5000, max_capacity: 10, failure_rate: 5, timeout_ms: 120000, retry_count: 2 }, tags: ['agent', 'llm', 'autonomous', 'tools'], premium: true },

  // ───── NETWORK (DNS/CDN additions) ─────────────────────────────────────────
  { id: 'cloudflare',         label: 'Cloudflare',      category: 'network', emoji: 'cf',  tagline: 'DNS + CDN + DDoS', description: 'Cloudflare — DNS, CDN, DDoS protection, WAF, and edge computing in one', color: C.network, defaults: { ...D.network_fast, processing_time: 2, max_capacity: 500 }, tags: ['cloudflare', 'cdn', 'dns', 'ddos', 'waf'] },
  { id: 'route53',            label: 'Route 53',         category: 'network', emoji: 'r53', tagline: 'AWS DNS service', description: 'AWS Route 53 — scalable DNS and health checking', color: C.network, defaults: { ...D.network_fast, processing_time: 1, max_capacity: 800 }, tags: ['route53', 'aws', 'dns'] },
  { id: 'cloudflare-workers', label: 'CF Workers',       category: 'network', emoji: 'cfw', tagline: 'Edge compute', description: 'Cloudflare Workers — serverless at the edge, 200+ global PoPs', color: C.network, defaults: { ...D.network_fast, processing_time: 5, max_capacity: 300 }, tags: ['cloudflare', 'edge', 'serverless', 'workers'] },
  { id: 'dns-resolver',       label: 'DNS Resolver',     category: 'network', emoji: 'dns', tagline: 'Recursive resolver', description: 'Recursive DNS resolver for name resolution (8.8.8.8, 1.1.1.1)', color: C.network, defaults: { ...D.network_fast, processing_time: 1, max_capacity: 999 }, tags: ['dns', 'resolver', 'recursive'] },

  // ───── SERVERS ─────────────────────────────────────────────────────────────
  { id: 'web-server-apache',  label: 'Apache Server',   category: 'servers', emoji: 'srv', tagline: 'Apache HTTP server', description: 'Apache HTTP Server — classic, battle-tested web server', color: C.servers, defaults: { processing_time: 20, max_capacity: 500, failure_rate: 0.5, timeout_ms: 30000, retry_count: 1 }, tags: ['apache', 'web', 'http', 'server'] },
  { id: 'nginx-server',       label: 'Nginx Server',    category: 'servers', emoji: 'srv', tagline: 'High-perf HTTP server', description: 'Nginx — high performance web server and reverse proxy', color: C.servers, defaults: { processing_time: 10, max_capacity: 800, failure_rate: 0.2, timeout_ms: 30000, retry_count: 1 }, tags: ['nginx', 'web', 'http', 'server'] },
  { id: 'app-server',         label: 'App Server',      category: 'servers', emoji: 'srv', tagline: 'Application runtime', description: 'Application server running business logic (Tomcat, Gunicorn, Node)', color: C.servers, defaults: { processing_time: 80, max_capacity: 300, failure_rate: 1, timeout_ms: 30000, retry_count: 2 }, tags: ['app', 'server', 'runtime', 'tomcat'] },
  { id: 'file-server',        label: 'File Server',     category: 'servers', emoji: 'srv', tagline: 'File sharing', description: 'File server for shared storage access (SMB, NFS)', color: C.servers, defaults: { processing_time: 50, max_capacity: 200, failure_rate: 0.5, timeout_ms: 10000, retry_count: 1 }, tags: ['file', 'server', 'smb', 'nfs'] },
  { id: 'mail-server',        label: 'Mail Server',     category: 'servers', emoji: 'srv', tagline: 'SMTP / IMAP', description: 'Email server handling SMTP sending and IMAP/POP3 retrieval', color: C.servers, defaults: { processing_time: 200, max_capacity: 100, failure_rate: 1, timeout_ms: 60000, retry_count: 3 }, tags: ['mail', 'smtp', 'imap', 'email'] },
  { id: 'game-server',        label: 'Game Server',     category: 'servers', emoji: 'srv', tagline: 'Real-time game logic', description: 'Dedicated game server managing real-time game state and players', color: C.servers, defaults: { processing_time: 16, max_capacity: 100, failure_rate: 0.5, timeout_ms: 5000, retry_count: 0 }, tags: ['game', 'server', 'realtime', 'udp'] },
  { id: 'media-server',       label: 'Media Server',    category: 'servers', emoji: 'srv', tagline: 'Video/audio streaming', description: 'Media server for live streaming or VOD (Wowza, ffmpeg, HLS)', color: C.servers, defaults: { processing_time: 100, max_capacity: 200, failure_rate: 1, timeout_ms: 30000, retry_count: 1 }, tags: ['media', 'stream', 'hls', 'rtmp', 'video'] },
  { id: 'proxy-server',       label: 'Proxy Server',    category: 'servers', emoji: 'srv', tagline: 'Forward/reverse proxy', description: 'Proxy server for request forwarding, caching, and anonymization', color: C.servers, defaults: { processing_time: 5, max_capacity: 999, failure_rate: 0.1, timeout_ms: 10000, retry_count: 0 }, tags: ['proxy', 'server', 'squid'] },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────
const _byId = new Map<string, NodeTypeConfig>(NODE_REGISTRY.map(n => [n.id, n]));

export function getNodeConfig(nodeType: string): NodeTypeConfig {
  return _byId.get(nodeType) ?? {
    id: nodeType, label: nodeType, category: 'compute', emoji: '⬡',
    tagline: 'Custom node', description: 'User-defined custom node type',
    color: { bg: '#0d0520', border: '#8b5cf6', glow: '#8b5cf6', text: '#c4b5fd', category: 'Custom' },
    defaults: { processing_time: 100, max_capacity: 200, failure_rate: 1, timeout_ms: 5000, retry_count: 1 },
    tags: ['custom'],
  };
}

export function getNodesByCategory(): Map<NodeCategory, NodeTypeConfig[]> {
  const map = new Map<NodeCategory, NodeTypeConfig[]>();
  for (const n of NODE_REGISTRY) {
    const arr = map.get(n.category) || [];
    arr.push(n);
    map.set(n.category, arr);
  }
  return map;
}

export function searchNodes(query: string): NodeTypeConfig[] {
  const q = query.toLowerCase().trim();
  if (!q) return NODE_REGISTRY;
  return NODE_REGISTRY.filter(n =>
    n.id.includes(q) ||
    n.label.toLowerCase().includes(q) ||
    n.tagline.toLowerCase().includes(q) ||
    n.tags.some(t => t.includes(q)) ||
    n.category.includes(q)
  );
}

export const CATEGORY_META: Record<NodeCategory, { label: string; emoji: string; color: string }> = {
  clients:      { label: 'Clients',       emoji: '👤', color: '#00d4ff' },
  network:      { label: 'Network',       emoji: '🔀', color: '#3b82f6' },
  compute:      { label: 'Compute',       emoji: '⚙️', color: '#8b5cf6' },
  servers:      { label: 'Servers',       emoji: 'srv', color: '#22c55e' },
  database:     { label: 'Database',      emoji: '🗄️', color: '#f59e0b' },
  storage:      { label: 'Storage',       emoji: '💾', color: '#eab308' },
  messaging:    { label: 'Messaging',     emoji: '📨', color: '#ec4899' },
  aws:          { label: 'AWS',           emoji: '☁️', color: '#ff9900' },
  gcp:          { label: 'GCP',           emoji: '🌥️', color: '#4285f4' },
  azure:        { label: 'Azure',         emoji: '🔷', color: '#0078d4' },
  security:     { label: 'Security',      emoji: '🔐', color: '#ef4444' },
  observability:{ label: 'Observability', emoji: '📊', color: '#10b981' },
  'ai-ml':      { label: 'AI / ML',       emoji: '🧠', color: '#a855f7' },
};
