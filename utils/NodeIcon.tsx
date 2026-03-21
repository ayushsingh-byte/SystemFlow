'use client';

import React from 'react';
import { BrandIcon } from './BrandIcons';

// ─── Simple Icons map: nodeType → brand key for BrandIcon ─────────────────────
// Maps node types to brand identifiers used by BrandIcon component
const SI: Record<string, { brand: string; hex: string; light?: boolean }> = {
  // Databases
  'redis':         { brand: 'redis',         hex: 'DC382D' },
  'postgresql':    { brand: 'postgresql',    hex: '336791' },
  'mongodb':       { brand: 'mongodb',       hex: '13AA52' },
  'mysql':         { brand: 'mysql',         hex: '4479A1' },
  'elasticsearch': { brand: 'elasticsearch', hex: '00BFB3' },
  'neo4j':         { brand: 'neo4j',         hex: '018BFF' },
  'influxdb':      { brand: 'influxdb',      hex: '22ADF6' },
  'clickhouse':    { brand: 'clickhouse',    hex: 'FFCC01' },
  'cockroachdb':   { brand: 'cockroachdb',   hex: '6933FF' },
  'supabase':      { brand: 'supabase',      hex: '3ECF8E' },
  'cassandra':     { brand: 'cassandra',     hex: '1287B1' },
  // Messaging
  'kafka':         { brand: 'kafka',         hex: 'FFFFFF', light: true },
  'rabbitmq':      { brand: 'rabbitmq',      hex: 'FF6600' },
  // Observability
  'prometheus':    { brand: 'prometheus',    hex: 'E6522C' },
  'grafana':       { brand: 'grafana',       hex: 'F2CC0C' },
  'datadog':       { brand: 'datadog',       hex: '632CA6' },
  // Container/Compute
  'container':     { brand: 'docker',        hex: '2496ED' },
  'kubernetes-pod':{ brand: 'kubernetes',    hex: '326CE5' },
  'serverless':    { brand: 'aws',           hex: 'FF9900' },
  // Cloud providers
  'aws-lambda':    { brand: 'aws',           hex: 'FF9900' },
  'aws-ec2':       { brand: 'aws',           hex: 'FF9900' },
  'aws-ecs':       { brand: 'aws',           hex: 'FF9900' },
  'aws-eks':       { brand: 'aws',           hex: 'FF9900' },
  'aws-rds':       { brand: 'aws',           hex: 'FF9900' },
  'aws-s3':        { brand: 'aws',           hex: 'FF9900' },
  'aws-sqs':       { brand: 'aws',           hex: 'FF9900' },
  'aws-sns':       { brand: 'aws',           hex: 'FF9900' },
  'aws-cloudfront':{ brand: 'aws',           hex: 'FF9900' },
  'aws-route53':   { brand: 'aws',           hex: 'FF9900' },
  'aws-alb':       { brand: 'aws',           hex: 'FF9900' },
  'aws-kinesis':   { brand: 'aws',           hex: 'FF9900' },
  'aws-elasticache':{ brand: 'aws',          hex: 'FF9900' },
  'aws-api-gateway':{ brand: 'aws',          hex: 'FF9900' },
  // GCP
  'firestore':     { brand: 'googlecloud',   hex: '4285F4' },
  'pubsub':        { brand: 'googlecloud',   hex: '4285F4' },
  // Storage
  's3-storage':    { brand: 'aws',           hex: 'FF9900' },
  'data-warehouse':{ brand: 'snowflake',     hex: '29B5E8' },
  // Network
  'reverse-proxy': { brand: 'nginx',         hex: '009639' },
  'web-server':    { brand: 'nginx',         hex: '009639' },
  'ingress':       { brand: 'kubernetes',    hex: '326CE5' },
};

// ─── Custom SVG icons for generic concepts ───────────────────────────────────

const GENERIC_ICONS: Record<string, (color: string, size: number) => React.ReactElement> = {
  'user': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={c} opacity="0.9"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
    </svg>
  ),
  'mobile-client': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="12" cy="18" r="1.2" fill={c}/>
      <rect x="9" y="5" width="6" height="1.5" rx="0.75" fill={c} opacity="0.5"/>
    </svg>
  ),
  'web-browser': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M2 12h20M12 2c-3 4-3 12 0 20M12 2c3 4 3 12 0 20" stroke={c} strokeWidth="1.5" fill="none" opacity="0.7"/>
    </svg>
  ),
  'desktop-app': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="14" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M8 21h8M12 18v3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <rect x="5" y="7" width="14" height="8" rx="1" fill={c} fillOpacity="0.2"/>
    </svg>
  ),
  'iot-device': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="8" width="14" height="10" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="12" cy="4" r="2" fill={c}/>
      <line x1="12" y1="6" x2="12" y2="8" stroke={c} strokeWidth="2"/>
      <circle cx="9" cy="13" r="1.5" fill={c} opacity="0.8"/>
      <circle cx="15" cy="13" r="1.5" fill={c} opacity="0.8"/>
    </svg>
  ),
  'bot': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="9" cy="14" r="2" fill={c}/>
      <circle cx="15" cy="14" r="2" fill={c}/>
      <path d="M10 18h4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="4" x2="12" y2="8" stroke={c} strokeWidth="2"/>
      <circle cx="12" cy="3" r="1.5" fill={c}/>
    </svg>
  ),
  'api-gateway': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="4" width="6" height="16" rx="1.5" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
      <path d="M3 9l6 3-6 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 9l-6 3 6 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'load-balancer': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="3" fill={c} fillOpacity="0.9"/>
      <circle cx="5" cy="19" r="2.5" fill={c} fillOpacity="0.5"/>
      <circle cx="12" cy="19" r="2.5" fill={c} fillOpacity="0.5"/>
      <circle cx="19" cy="19" r="2.5" fill={c} fillOpacity="0.5"/>
      <path d="M12 9v4M12 13L5 17M12 13l7 4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'cdn': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.08"/>
      <circle cx="12" cy="12" r="2.5" fill={c}/>
      <circle cx="4" cy="8" r="2" fill={c} opacity="0.6"/>
      <circle cx="20" cy="8" r="2" fill={c} opacity="0.6"/>
      <circle cx="4" cy="17" r="2" fill={c} opacity="0.6"/>
      <circle cx="20" cy="17" r="2" fill={c} opacity="0.6"/>
      <line x1="12" y1="12" x2="4" y2="8" stroke={c} strokeWidth="1.2" opacity="0.5"/>
      <line x1="12" y1="12" x2="20" y2="8" stroke={c} strokeWidth="1.2" opacity="0.5"/>
      <line x1="12" y1="12" x2="4" y2="17" stroke={c} strokeWidth="1.2" opacity="0.5"/>
      <line x1="12" y1="12" x2="20" y2="17" stroke={c} strokeWidth="1.2" opacity="0.5"/>
    </svg>
  ),
  'microservice': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4.5v9L12 21 4 16.5v-9z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" fill={c} opacity="0.8"/>
    </svg>
  ),
  'backend': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="5" rx="1.5" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.12"/>
      <rect x="3" y="13" width="18" height="5" rx="1.5" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.12"/>
      <circle cx="7" cy="7.5" r="1" fill={c}/>
      <circle cx="10" cy="7.5" r="1" fill={c}/>
      <circle cx="7" cy="15.5" r="1" fill={c}/>
      <circle cx="10" cy="15.5" r="1" fill={c}/>
    </svg>
  ),
  'worker': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.08"/>
      <path d="M12 7v5l3 3" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'rate-limiter': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.08"/>
      <path d="M8 12h8M12 8v8" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="none" stroke={c} strokeWidth="1.5"/>
    </svg>
  ),
  'circuit-breaker': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 12h5l2-5 3 10 2-8 2 3h4" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  'firewall': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <line x1="8" y1="6" x2="8" y2="18" stroke={c} strokeWidth="1.5" opacity="0.5"/>
      <line x1="16" y1="6" x2="16" y2="18" stroke={c} strokeWidth="1.5" opacity="0.5"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke={c} strokeWidth="1.5" opacity="0.5"/>
    </svg>
  ),
  'waf': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v5c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'network-firewall': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="8" width="20" height="8" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M6 12h12M12 8v8" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  'app-waf': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12"/>
      <path d="M8 12l3 3 5-5" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'ddos-scrubber': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'traffic-router': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" fill={c}/>
      <circle cx="19" cy="7" r="2.5" fill={c} opacity="0.7"/>
      <circle cx="19" cy="17" r="2.5" fill={c} opacity="0.7"/>
      <path d="M7.5 12H12l4.5-5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 12l4.5 5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'websocket-server': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 8c0-2.5 2-4 4-4s4 1.5 4 4v8c0 2.5 2 4 4 4" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M19 8c0-2.5-2-4-4-4S11 5.5 11 8v8c0 2.5-2 4-4 4" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  ),
  'queue': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5"  width="18" height="4" rx="1" fill={c} fillOpacity="0.9"/>
      <rect x="3" y="11" width="14" height="4" rx="1" fill={c} fillOpacity="0.6"/>
      <rect x="3" y="17" width="10" height="4" rx="1" fill={c} fillOpacity="0.35"/>
    </svg>
  ),
  'broker': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="18" height="6" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12"/>
      <line x1="7" y1="9" x2="7" y2="15" stroke={c} strokeWidth="1.5"/>
      <line x1="12" y1="9" x2="12" y2="15" stroke={c} strokeWidth="1.5"/>
      <line x1="17" y1="9" x2="17" y2="15" stroke={c} strokeWidth="1.5"/>
    </svg>
  ),
  'cache': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="7" rx="9" ry="4" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.15"/>
      <path d="M3 7v5c0 2.2 4 4 9 4s9-1.8 9-4V7" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M3 12v5c0 2.2 4 4 9 4s9-1.8 9-4v-5" stroke={c} strokeWidth="2" fill="none"/>
    </svg>
  ),
  'database': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="6" rx="9" ry="3.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.15"/>
      <path d="M3 6v6c0 1.93 4 3.5 9 3.5s9-1.57 9-3.5V6" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M3 12v6c0 1.93 4 3.5 9 3.5s9-1.57 9-3.5v-6" stroke={c} strokeWidth="2" fill="none"/>
    </svg>
  ),
  'api-proxy': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7 8h10M7 12h10M7 16h10" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="2" fill="none"/>
    </svg>
  ),
  'graphql-server': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8.66 5v10L12 23l-8.66-5V8z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1" strokeLinejoin="round"/>
      <circle cx="12" cy="3" r="1.5" fill={c}/>
      <circle cx="20.66" cy="8" r="1.5" fill={c} opacity="0.7"/>
      <circle cx="20.66" cy="16" r="1.5" fill={c} opacity="0.7"/>
      <circle cx="12" cy="21" r="1.5" fill={c} opacity="0.5"/>
      <circle cx="3.34" cy="16" r="1.5" fill={c} opacity="0.7"/>
      <circle cx="3.34" cy="8" r="1.5" fill={c} opacity="0.7"/>
    </svg>
  ),
  'grpc-server': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 8h16M4 12h16M4 16h16" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={c} strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  'vm': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <rect x="5" y="7" width="9" height="7" rx="1" fill={c} fillOpacity="0.3" stroke={c} strokeWidth="1.2"/>
      <circle cx="18" cy="10.5" r="2" fill={c} opacity="0.7"/>
    </svg>
  ),
  'edge-function': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 21,19 3,19" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12" strokeLinejoin="round"/>
      <line x1="12" y1="10" x2="12" y2="15" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="12" cy="17.5" r="1.2" fill={c}/>
    </svg>
  ),
  'dns': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill="none"/>
      <path d="M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18M3 12h18" stroke={c} strokeWidth="1.5"/>
    </svg>
  ),
  'nat-gateway': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="18" height="6" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M8 12l-3-3m0 0l3-3M5 9V12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 12l3-3m0 0l-3-3M19 9V12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'forward-proxy': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="4" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="18" cy="12" r="4" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M10 12h4M14 10l2 2-2 2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'batch-job': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M8 10l2 2 4-4M8 16l2 2 4-4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'cron-job': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M12 7v5l4 2" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  's3-storage': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 6l8-3 8 3v12l-8 3-8-3z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1" strokeLinejoin="round"/>
      <path d="M12 3v18M4 6l8 3 8-3" stroke={c} strokeWidth="1.5" opacity="0.6"/>
    </svg>
  ),
  'blob-storage': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="14" rx="9" ry="6" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M3 14v-4c0-3.3 4-6 9-6s9 2.7 9 6v4" stroke={c} strokeWidth="2"/>
    </svg>
  ),
  'file-system': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 7h5l2 2h11v11H3z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1" strokeLinejoin="round"/>
    </svg>
  ),
  'data-lake': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 17c3-3 6-3 9 0s6 3 9 0" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M3 12c3-3 6-3 9 0s6 3 9 0" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
      <path d="M3 7c3-3 6-3 9 0s6 3 9 0" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35"/>
    </svg>
  ),
  'vector-db': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={c}/>
      <circle cx="5" cy="6" r="2" fill={c} opacity="0.6"/>
      <circle cx="19" cy="6" r="2" fill={c} opacity="0.6"/>
      <circle cx="5" cy="18" r="2" fill={c} opacity="0.6"/>
      <circle cx="19" cy="18" r="2" fill={c} opacity="0.6"/>
      <line x1="12" y1="12" x2="5" y2="6"  stroke={c} strokeWidth="1.2" opacity="0.4"/>
      <line x1="12" y1="12" x2="19" y2="6"  stroke={c} strokeWidth="1.2" opacity="0.4"/>
      <line x1="12" y1="12" x2="5" y2="18" stroke={c} strokeWidth="1.2" opacity="0.4"/>
      <line x1="12" y1="12" x2="19" y2="18" stroke={c} strokeWidth="1.2" opacity="0.4"/>
    </svg>
  ),
  'hdfs': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5"  width="18" height="3.5" rx="1" fill={c} fillOpacity="0.8"/>
      <rect x="3" y="11" width="18" height="3.5" rx="1" fill={c} fillOpacity="0.5"/>
      <rect x="3" y="17" width="18" height="3.5" rx="1" fill={c} fillOpacity="0.3"/>
    </svg>
  ),
  'block-storage': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
    </svg>
  ),
  'cdn-storage': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="12" cy="12" r="4" fill={c} fillOpacity="0.8"/>
      <circle cx="4" cy="8" r="1.5" fill={c} opacity="0.5"/>
      <circle cx="20" cy="8" r="1.5" fill={c} opacity="0.5"/>
      <circle cx="4" cy="16" r="1.5" fill={c} opacity="0.5"/>
      <circle cx="20" cy="16" r="1.5" fill={c} opacity="0.5"/>
    </svg>
  ),
  'sqs': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="8" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <line x1="7" y1="12" x2="17" y2="12" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 9l3 3-3 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'sns': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3" fill={c}/>
      <circle cx="5" cy="18" r="2.5" fill={c} opacity="0.6"/>
      <circle cx="19" cy="18" r="2.5" fill={c} opacity="0.6"/>
      <path d="M12 11v4M12 15L5 18M12 15l7 3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'mqtt': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 12c1.5-5 10.5-5 12 0s-10.5 5-12 0z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="12" cy="12" r="2" fill={c}/>
      <path d="M3 6c2.5-2 7-3 9 0M3 18c2.5 2 7 3 9 0M21 6c-2.5-2-7-3-9 0M21 18c-2.5 2-7 3-9 0" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  ),
  'event-bus': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="10" width="18" height="4" rx="2" fill={c} fillOpacity="0.3"/>
      <circle cx="7" cy="12" r="2" fill={c}/>
      <circle cx="12" cy="12" r="2" fill={c}/>
      <circle cx="17" cy="12" r="2" fill={c}/>
      <path d="M7 5v5M12 5v5M17 5v5M7 14v5M12 14v5M17 14v5" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  'redis-streams': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <circle cx="7" cy="6" r="2.5" fill={c}/>
      <circle cx="12" cy="12" r="2.5" fill={c}/>
      <circle cx="17" cy="18" r="2.5" fill={c}/>
    </svg>
  ),
  'activemq': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M8 12l2 2 2-4 2 4 2-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  'nats': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M8 15l4-6 4 6" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="9.5" y1="13" x2="14.5" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'zeromq': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="3" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="18" cy="12" r="3" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <path d="M9 10l6 4M9 14l6-4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'health-check': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l2-7 3 14 2-10 2 7 2-4h3" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  'alert-manager': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L2 20h20z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12" strokeLinejoin="round"/>
      <line x1="12" y1="10" x2="12" y2="15" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="12" cy="18" r="1.3" fill={c}/>
    </svg>
  ),
  'jaeger': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="2" fill={c}/>
      <circle cx="18" cy="12" r="2" fill={c} opacity="0.7"/>
      <circle cx="10" cy="18" r="2" fill={c} opacity="0.5"/>
      <path d="M8 6h6M6 8v4l12-2v4L10 16" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  'newrelic': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M8 14V10l4-2 4 2v4l-4 2z" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2" strokeLinejoin="round"/>
    </svg>
  ),
  'ml-model': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={c} fillOpacity="0.8"/>
      <circle cx="4" cy="6" r="2" fill={c} opacity="0.5"/>
      <circle cx="20" cy="6" r="2" fill={c} opacity="0.5"/>
      <circle cx="4" cy="18" r="2" fill={c} opacity="0.5"/>
      <circle cx="20" cy="18" r="2" fill={c} opacity="0.5"/>
      <line x1="6" y1="7" x2="10" y2="10" stroke={c} strokeWidth="1.5"/>
      <line x1="18" y1="7" x2="14" y2="10" stroke={c} strokeWidth="1.5"/>
      <line x1="6" y1="17" x2="10" y2="14" stroke={c} strokeWidth="1.5"/>
      <line x1="18" y1="17" x2="14" y2="14" stroke={c} strokeWidth="1.5"/>
    </svg>
  ),
  'llm-api': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M7 10h10M7 14h6" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="18" cy="14" r="1.5" fill={c}/>
    </svg>
  ),
  'vector-database': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 6h6v6H3zM15 6h6v6h-6zM9 12h6v6H9z" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.15"/>
      <line x1="9" y1="9" x2="15" y2="9" stroke={c} strokeWidth="1.5"/>
      <line x1="12" y1="12" x2="12" y2="15" stroke={c} strokeWidth="1.5"/>
    </svg>
  ),
  'embedding-service': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="4" height="6" rx="1" fill={c} fillOpacity="0.8"/>
      <rect x="10" y="6" width="4" height="12" rx="1" fill={c} fillOpacity="0.5"/>
      <rect x="17" y="3" width="4" height="18" rx="1" fill={c} fillOpacity="0.3"/>
    </svg>
  ),
  'feature-store': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M7 8h10M7 12h10M7 16h6" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'model-registry': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" fill={c} fillOpacity="0.5"/>
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke={c} strokeWidth="2" fill="none"/>
    </svg>
  ),
  'inference-engine': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 3l7 9H4l9-9z" fill={c} fillOpacity="0.7"/>
      <path d="M11 21l-7-9h16l-9 9z" fill={c} fillOpacity="0.35"/>
    </svg>
  ),
  'training-cluster': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.2"/>
    </svg>
  ),
  'rag-pipeline': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l2-4 2 8 2-5 2 5 2-4h4" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  'ai-agent': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="8" width="12" height="12" rx="3" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.1"/>
      <circle cx="9.5" cy="13" r="1.5" fill={c}/>
      <circle cx="14.5" cy="13" r="1.5" fill={c}/>
      <path d="M9 17.5h6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 4h6M12 4v4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'sdk-client': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="12" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M7 12l-2 2 2 2M17 12l2 2-2 2M11 16l2-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'cli-client': (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.08"/>
      <path d="M7 9l3 3-3 3M14 15h4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ─── NodeIcon Component ───────────────────────────────────────────────────────

interface NodeIconProps {
  nodeType: string;
  color: string;       // the node's brand/border color from nc.border
  size?: number;
}

export default function NodeIcon({ nodeType, color, size = 24 }: NodeIconProps) {
  const si = SI[nodeType];

  if (si) {
    const iconColor = si.light ? '#ffffff' : `#${si.hex}`;
    return <BrandIcon brand={si.brand} size={size} color={iconColor} />;
  }

  // Generic SVG fallback
  const GenericSvg = GENERIC_ICONS[nodeType];
  if (GenericSvg) {
    return GenericSvg(color, size);
  }

  // Ultimate fallback: colored initials box
  const initials = nodeType.split('-').map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill={color} fillOpacity="0.18"/>
      <text
        x="12" y="16" textAnchor="middle"
        fill={color} fontSize="10" fontWeight="800" fontFamily="monospace"
      >
        {initials}
      </text>
    </svg>
  );
}
