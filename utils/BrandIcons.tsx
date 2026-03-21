'use client';

import React from 'react';

// Brand color map
const BRAND_COLORS: Record<string, string> = {
  aws: '#FF9900',
  googlecloud: '#4285F4',
  azure: '#0078D4',
  redis: '#DC382D',
  postgresql: '#336791',
  mongodb: '#13AA52',
  mysql: '#4479A1',
  elasticsearch: '#00BFB3',
  kafka: '#FFFFFF',
  rabbitmq: '#FF6600',
  docker: '#2496ED',
  kubernetes: '#326CE5',
  nginx: '#009639',
  grafana: '#F2CC0C',
  datadog: '#632CA6',
  prometheus: '#E6522C',
  github: '#ffffff',
  shopify: '#96BF48',
  meta: '#0082FB',
  netflix: '#E50914',
  slack: '#4A154B',
  stripe: '#008CDD',
  uber: '#000000',
  salesforce: '#00A1E0',
  steam: '#1b2838',
  snowflake: '#29B5E8',
  supabase: '#3ECF8E',
  cockroachdb: '#6933FF',
  influxdb: '#22ADF6',
  clickhouse: '#FFCC01',
  cassandra: '#1287B1',
  neo4j: '#018BFF',
};

// SVG brand mark renderers
const BRAND_SVGS: Record<string, (size: number, color: string) => React.ReactElement> = {
  aws: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* AWS smile/arrow */}
      <text x="4" y="18" fontSize="10" fontWeight="900" fill={color} fontFamily="monospace">AWS</text>
      <path d="M4 22 Q16 28 28 22" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M25 20 L28 22 L25 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  googlecloud: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Google G shape */}
      <path d="M28 16.5h-12v4h7c-0.7 3.3-3.5 5.5-7 5.5-4.4 0-8-3.6-8-8s3.6-8 8-8c2 0 3.8 0.7 5.2 1.9l3-3C21.8 6.6 19 5.5 16 5.5 9.6 5.5 4.4 10.7 4.4 17.1S9.6 28.7 16 28.7c6 0 11.2-4.4 11.2-11.2 0-0.7-0.1-1.3-0.2-2z" fill="#4285F4"/>
      <path d="M28 16.5h-12v4h7c-0.7 3.3-3.5 5.5-7 5.5v4.7c6 0 11.2-4.4 11.2-11.2 0-0.7-0.1-1.3-0.2-2z" fill="#34A853" opacity="0"/>
      {/* Simplified G */}
      <circle cx="16" cy="16" r="11" stroke="none" fill="none"/>
      <path d="M26 16h-10v3.5h6c-0.6 2.8-3 4.5-6 4.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.4 0 2.7 0.5 3.7 1.3l2.5-2.5C20.3 8.9 18.3 8 16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8c4.4 0 8-3.2 8-8 0-0.3 0-0.7-0.1-1h7.1z" fill="none"/>
      <text x="9" y="20" fontSize="9" fontWeight="900" fontFamily="sans-serif" fill="#4285F4">G</text>
      <path d="M18 16h8" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  azure: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Azure A shape */}
      <path d="M13 6 L6 26 L13 26 L16 20 L22 26 L28 26 L18 14 Z" fill={color} opacity="0.9"/>
      <path d="M16 6 L10 26" stroke="none" fill={color}/>
      <polygon points="13,6 20,6 28,26 22,26 16,14 10,26 6,26" fill={color}/>
    </svg>
  ),
  redis: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Redis cube/star */}
      <ellipse cx="16" cy="26" rx="11" ry="3" fill={color} opacity="0.3"/>
      <polygon points="16,8 27,14 27,20 16,26 5,20 5,14" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
      <polygon points="16,8 27,14 16,20 5,14" fill={color} opacity="0.5"/>
      <text x="11" y="18" fontSize="6" fontWeight="900" fill={color} fontFamily="monospace">REDIS</text>
    </svg>
  ),
  postgresql: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Elephant silhouette simplified */}
      <ellipse cx="15" cy="18" rx="8" ry="9" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
      <ellipse cx="22" cy="14" rx="4" ry="5" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5"/>
      <circle cx="23" cy="12" r="1.5" fill={color}/>
      <path d="M18 24 Q18 29 15 30" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <text x="10" y="21" fontSize="5" fontWeight="900" fill={color} fontFamily="monospace">PG</text>
    </svg>
  ),
  mongodb: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* MongoDB leaf */}
      <path d="M16 4 C16 4 22 10 22 18 C22 23 19 27 16 28 C13 27 10 23 10 18 C10 10 16 4 16 4 Z" fill={color}/>
      <path d="M16 28 L16 22" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  mysql: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Dolphin silhouette simplified */}
      <ellipse cx="14" cy="17" rx="9" ry="6" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
      <path d="M22 13 Q28 8 27 15 Q26 18 22 17" fill={color} opacity="0.5"/>
      <path d="M10 20 Q8 26 12 25" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="11" cy="15" r="1.5" fill={color}/>
    </svg>
  ),
  elasticsearch: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Elastic E circles */}
      <circle cx="16" cy="12" r="7" fill={color} opacity="0.8"/>
      <circle cx="16" cy="20" r="7" fill={color} opacity="0.5"/>
      <rect x="9" y="15" width="14" height="2" fill={color} opacity="0.9"/>
      <text x="11" y="24" fontSize="5" fontWeight="900" fill="white" fontFamily="monospace">ES</text>
    </svg>
  ),
  kafka: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Kafka K shape */}
      <circle cx="16" cy="10" r="3.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2"/>
      <circle cx="8" cy="19" r="3.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2"/>
      <circle cx="24" cy="19" r="3.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2"/>
      <line x1="16" y1="13" x2="10" y2="17" stroke={color} strokeWidth="1.5"/>
      <line x1="16" y1="13" x2="22" y2="17" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  rabbitmq: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Rabbit ears + body */}
      <rect x="9" y="12" width="14" height="12" rx="4" fill={color}/>
      <rect x="10" y="5" width="4" height="10" rx="2" fill={color}/>
      <rect x="18" y="5" width="4" height="10" rx="2" fill={color}/>
      <rect x="17" y="16" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
    </svg>
  ),
  docker: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Docker whale + containers */}
      <rect x="5" y="11" width="4" height="4" rx="0.5" fill={color}/>
      <rect x="10" y="11" width="4" height="4" rx="0.5" fill={color}/>
      <rect x="15" y="11" width="4" height="4" rx="0.5" fill={color}/>
      <rect x="10" y="6" width="4" height="4" rx="0.5" fill={color}/>
      <rect x="15" y="6" width="4" height="4" rx="0.5" fill={color}/>
      <path d="M2 18 Q8 14 14 17 Q20 20 28 17" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M22 15 Q26 12 27 15" stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  kubernetes: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* K8s helm wheel */}
      <circle cx="16" cy="16" r="4" stroke={color} strokeWidth="2" fill="none"/>
      <circle cx="16" cy="16" r="10" stroke={color} strokeWidth="1.5" fill="none"/>
      {[0,60,120,180,240,300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 16 + 4 * Math.cos(rad);
        const y1 = 16 + 4 * Math.sin(rad);
        const x2 = 16 + 10 * Math.cos(rad);
        const y2 = 16 + 10 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5"/>;
      })}
    </svg>
  ),
  nginx: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Nginx N */}
      <polygon points="6,26 6,6 26,26 26,6" fill={color} opacity="0.15" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="6" y1="6" x2="26" y2="26" stroke={color} strokeWidth="2.5"/>
    </svg>
  ),
  grafana: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Grafana G logo */}
      <circle cx="16" cy="16" r="11" fill={color} opacity="0.1" stroke={color} strokeWidth="1.5"/>
      <path d="M16 16 h6 M22 16 v-4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="3" fill={color} opacity="0.8"/>
      <path d="M10 10 A8 8 0 1 1 10 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  datadog: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Datadog D logo */}
      <rect x="8" y="7" width="5" height="18" rx="1" fill={color}/>
      <path d="M13 7 Q24 7 24 16 Q24 25 13 25" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="20" cy="16" r="3" fill={color} opacity="0.3"/>
    </svg>
  ),
  prometheus: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Prometheus fire / circle */}
      <circle cx="16" cy="16" r="11" fill={color} opacity="0.15" stroke={color} strokeWidth="1.5"/>
      <path d="M16 8 C16 8 12 12 12 16 C12 18 13.5 19.5 16 20 C18.5 19.5 20 18 20 16 C20 12 16 8 16 8Z" fill={color} opacity="0.8"/>
      <circle cx="16" cy="22" r="2" fill={color}/>
    </svg>
  ),
  github: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* GitHub octocat simplified */}
      <circle cx="16" cy="14" r="9" fill={color} opacity="0.9"/>
      <circle cx="16" cy="14" r="5" fill="#0d1117"/>
      <path d="M10 21 Q8 26 12 28" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M22 21 Q24 26 20 28" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="12" y="26" width="8" height="3" rx="1" fill={color}/>
    </svg>
  ),
  shopify: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Shopify S bag */}
      <path d="M22 8 C22 8 21 5 19 5 C18 5 17 6 16 7 L14 7 C14 7 10 8 10 24 L26 24 L26 10 Z" fill={color} opacity="0.9"/>
      <path d="M16 7 C16 7 16 5 14 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M14 11 C12 11 12 14 14 14 C17 14 18 17 16 19 C14 21 12 20 12 20" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  meta: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Meta infinity / M */}
      <path d="M5 20 C5 13 8 8 11 8 C13 8 14 10 16 14 C18 10 19 8 21 8 C24 8 27 13 27 20 C27 24 25 26 23 26 C21 26 20 24 16 18 C12 24 11 26 9 26 C7 26 5 24 5 20 Z" fill={color}/>
    </svg>
  ),
  netflix: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Netflix N */}
      <rect x="8" y="5" width="4" height="22" rx="1" fill={color}/>
      <rect x="20" y="5" width="4" height="22" rx="1" fill={color}/>
      <path d="M12 5 L20 27" stroke={color} strokeWidth="4"/>
    </svg>
  ),
  slack: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Slack hashtag */}
      <rect x="11" y="6" width="4" height="9" rx="2" fill="#E01E5A"/>
      <rect x="17" y="17" width="4" height="9" rx="2" fill="#2EB67D"/>
      <rect x="6" y="11" width="9" height="4" rx="2" fill="#36C5F0"/>
      <rect x="17" y="17" width="9" height="4" rx="2" fill="#ECB22E"/>
      <circle cx="11" cy="21" r="3" fill="#E01E5A"/>
      <circle cx="21" cy="11" r="3" fill="#2EB67D"/>
    </svg>
  ),
  stripe: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Stripe S */}
      <rect x="6" y="6" width="20" height="20" rx="4" fill={color} opacity="0.1"/>
      <path d="M12 18 C12 16 14 15 16 16 C19 17 20 16 20 14 C20 12 18 11 16 11" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M20 14 C20 16 18 17 16 16 C13 15 12 16 12 18 C12 20 14 21 16 21" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  uber: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Uber U */}
      <rect x="6" y="6" width="20" height="20" rx="4" fill={color}/>
      <path d="M11 10 L11 19 C11 22 13 24 16 24 C19 24 21 22 21 19 L21 10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  salesforce: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cloud shape */}
      <path d="M10 22 Q4 22 4 16 Q4 11 8 11 Q8 6 13 6 Q16 4 19 7 Q21 5 24 6 Q28 7 28 12 Q32 13 28 18 Q26 22 22 22 Z" fill={color} opacity="0.9"/>
    </svg>
  ),
  steam: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Steam logo simplified */}
      <circle cx="16" cy="13" r="9" fill={color} opacity="0.9"/>
      <circle cx="16" cy="13" r="4" fill="white" opacity="0.3"/>
      <path d="M16 22 L12 28 Q14 30 16 30 Q18 30 20 28 Z" fill={color} opacity="0.9"/>
      <circle cx="13" cy="26" r="2.5" fill="#1b2838" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  snowflake: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Snowflake */}
      <line x1="16" y1="5" x2="16" y2="27" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="16" x2="27" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="8" x2="24" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="8" x2="8" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="3" fill={color}/>
    </svg>
  ),
  supabase: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Supabase lightning bolt */}
      <path d="M18 4 L8 18 L15 18 L14 28 L24 14 L17 14 Z" fill={color}/>
    </svg>
  ),
  cockroachdb: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cockroach simplified antenna + body */}
      <ellipse cx="16" cy="19" rx="7" ry="8" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
      <ellipse cx="16" cy="13" rx="5" ry="5" fill={color} opacity="0.5" stroke={color} strokeWidth="1.2"/>
      <path d="M13 8 Q10 4 8 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M19 8 Q22 4 24 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="9" y1="20" x2="5" y2="18" stroke={color} strokeWidth="1.2"/>
      <line x1="9" y1="23" x2="5" y2="24" stroke={color} strokeWidth="1.2"/>
      <line x1="23" y1="20" x2="27" y2="18" stroke={color} strokeWidth="1.2"/>
      <line x1="23" y1="23" x2="27" y2="24" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
  influxdb: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* InfluxDB arrow/flow */}
      <path d="M6 16 Q10 8 16 8 Q22 8 24 14 Q26 20 20 24 Q14 28 8 24" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <polygon points="6,16 2,12 2,20" fill={color}/>
    </svg>
  ),
  clickhouse: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* ClickHouse columns */}
      <rect x="5" y="8" width="4" height="16" rx="1" fill={color}/>
      <rect x="11" y="8" width="4" height="16" rx="1" fill={color}/>
      <rect x="17" y="8" width="4" height="16" rx="1" fill={color}/>
      <rect x="23" y="8" width="4" height="6" rx="1" fill={color} opacity="0.5"/>
    </svg>
  ),
  cassandra: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cassandra eye */}
      <path d="M4 16 Q16 4 28 16 Q16 28 4 16 Z" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="5" fill={color} opacity="0.8"/>
      <circle cx="16" cy="16" r="2" fill="white" opacity="0.4"/>
    </svg>
  ),
  neo4j: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Neo4j graph nodes */}
      <circle cx="10" cy="10" r="4.5" fill={color} opacity="0.9"/>
      <circle cx="22" cy="22" r="4.5" fill={color} opacity="0.9"/>
      <circle cx="22" cy="10" r="4.5" fill={color} opacity="0.4"/>
      <line x1="10" y1="10" x2="22" y2="22" stroke={color} strokeWidth="2"/>
      <line x1="10" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" opacity="0.5"/>
    </svg>
  ),
};

export function BrandIcon({ brand, size, color }: { brand: string; size: number; color?: string }): React.ReactElement {
  const brandKey = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const brandColor = color || BRAND_COLORS[brandKey] || '#8fa3b8';
  const renderer = BRAND_SVGS[brandKey];

  if (renderer) {
    return renderer(size, brandColor);
  }

  // Fallback: initials
  const initials = brand.slice(0, 2).toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="6" fill={brandColor} fillOpacity="0.2"/>
      <text x="16" y="22" textAnchor="middle" fill={brandColor} fontSize="10" fontWeight="800" fontFamily="monospace">
        {initials}
      </text>
    </svg>
  );
}

export { BRAND_COLORS };
