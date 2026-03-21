// Re-export everything from the registry as the canonical source
export { getNodeConfig, getNodesByCategory, searchNodes, NODE_REGISTRY, CATEGORY_META } from './nodeRegistry';
export type { NodeTypeConfig, NodeCategory, NodeColorConfig } from './nodeRegistry';

import { getNodeConfig } from './nodeRegistry';

// Legacy compat wrappers used by existing components
export function NODE_EMOJI_FOR(nodeType: string): string {
  return getNodeConfig(nodeType).emoji;
}

export function NODE_COLORS_FOR(nodeType: string) {
  return getNodeConfig(nodeType).color;
}

export function NODE_DESC_FOR(nodeType: string): string {
  return getNodeConfig(nodeType).tagline;
}

export function NODE_DEFAULTS_FOR(nodeType: string) {
  return getNodeConfig(nodeType).defaults;
}

// Status color map (unchanged)
export const STATUS_COLORS = {
  idle:       { border: '#1e2d3d', glow: 'transparent', dot: '#374151', label: 'Idle' },
  healthy:    { border: '#10b981', glow: '#10b98160',   dot: '#10b981', label: 'Healthy' },
  stressed:   { border: '#f59e0b', glow: '#f59e0b60',   dot: '#f59e0b', label: 'Stressed' },
  overloaded: { border: '#ef4444', glow: '#ef444460',   dot: '#ef4444', label: 'Overloaded' },
  failed:     { border: '#dc2626', glow: '#dc262680',   dot: '#dc2626', label: 'Failed' },
};
