/**
 * Full topology analysis engine for SystemFlow
 */

/**
 * Build adjacency list graph from nodes and edges
 */
function buildGraph(nodes, edges) {
  const graph = {};
  const reverseGraph = {};
  const nodeMap = {};

  nodes.forEach((node) => {
    graph[node.id] = [];
    reverseGraph[node.id] = [];
    nodeMap[node.id] = node;
  });

  edges.forEach((edge) => {
    if (graph[edge.source] !== undefined) {
      graph[edge.source].push(edge.target);
    }
    if (reverseGraph[edge.target] !== undefined) {
      reverseGraph[edge.target].push(edge.source);
    }
  });

  return { graph, reverseGraph, nodeMap };
}

/**
 * Calculate in-degree for each node
 */
function calculateInDegrees(nodes, edges) {
  const inDegree = {};
  nodes.forEach((n) => (inDegree[n.id] = 0));
  edges.forEach((e) => {
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target]++;
    }
  });
  return inDegree;
}

/**
 * BFS to find all paths from a start node to leaf nodes
 */
function findAllPaths(graph, startId, leafIds) {
  const paths = [];
  const queue = [[startId]];

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const lastNode = currentPath[currentPath.length - 1];

    // Avoid infinite loops in cyclic graphs
    if (currentPath.length > 50) continue;

    const neighbors = graph[lastNode] || [];

    if (neighbors.length === 0 || leafIds.has(lastNode)) {
      paths.push([...currentPath]);
      continue;
    }

    for (const neighbor of neighbors) {
      // Prevent revisiting nodes in current path
      if (!currentPath.includes(neighbor)) {
        queue.push([...currentPath, neighbor]);
      } else {
        // If cycle, terminate this path
        paths.push([...currentPath]);
      }
    }
  }

  return paths;
}

/**
 * Detect bottleneck nodes: max_capacity < 200 AND inDegree >= 2
 */
function detectBottlenecks(nodes, inDegree) {
  return nodes.filter((node) => {
    const capacity = node.data?.max_capacity ?? node.data?.maxCapacity ?? node.data?.capacity ?? Infinity;
    const degree = inDegree[node.id] || 0;
    return capacity < 200 && degree >= 2;
  });
}

/**
 * Detect SPOFs: nodes that appear on ALL paths from entry nodes to leaf nodes
 */
function detectSPOFs(allPaths, nodes) {
  if (allPaths.length === 0) return [];

  const nodeIds = nodes.map((n) => n.id);
  const spofs = [];

  for (const nodeId of nodeIds) {
    // A SPOF appears on every path
    const onAllPaths = allPaths.every((path) => path.includes(nodeId));
    if (onAllPaths && allPaths.length > 1) {
      spofs.push(nodeId);
    }
  }

  return spofs;
}

/**
 * Get processing time of a node
 */
function getNodeLatency(node) {
  return (
    node.data?.processing_time ??
    node.data?.processingTime ??
    node.data?.latency ??
    node.data?.response_time ??
    10
  );
}

/**
 * Calculate total latency along a path
 */
function calculateTotalLatency(path, nodeMap) {
  return path.reduce((sum, nodeId) => {
    const node = nodeMap[nodeId];
    if (!node) return sum;
    return sum + getNodeLatency(node);
  }, 0);
}

/**
 * Find the critical path (longest latency path)
 */
function findCriticalPath(allPaths, nodeMap) {
  if (allPaths.length === 0) return { path: [], latency: 0 };

  let maxLatency = -Infinity;
  let criticalPath = [];

  for (const path of allPaths) {
    const latency = calculateTotalLatency(path, nodeMap);
    if (latency > maxLatency) {
      maxLatency = latency;
      criticalPath = path;
    }
  }

  return { path: criticalPath, latency: maxLatency };
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(nodes, bottlenecks, spofIds, inDegree, graph) {
  const suggestions = [];
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  // Suggestion: Add Redis cache before DB nodes with high load
  nodes.forEach((node) => {
    const type = (node.data?.type || node.type || '').toLowerCase();
    const label = (node.data?.label || node.data?.name || node.id).toLowerCase();
    const isDb = type.includes('database') || type.includes('db') || label.includes('db') || label.includes('database') || label.includes('mongo') || label.includes('postgres') || label.includes('mysql') || label.includes('redis');
    const inDeg = inDegree[node.id] || 0;

    if (isDb && inDeg >= 2) {
      suggestions.push({
        type: 'cache',
        nodeId: node.id,
        message: `Add Redis cache before ${node.data?.label || node.id} to reduce database load`,
        priority: 'high',
      });
    }
  });

  // Suggestion: Increase capacity for bottlenecks
  bottlenecks.forEach((node) => {
    const capacity = node.data?.max_capacity ?? node.data?.maxCapacity ?? node.data?.capacity ?? 0;
    suggestions.push({
      type: 'capacity',
      nodeId: node.id,
      message: `Increase max_capacity for ${node.data?.label || node.id} (current: ${capacity}) to handle higher traffic`,
      priority: 'high',
    });
  });

  // Suggestion: Add redundancy for SPOFs
  spofIds.forEach((nodeId) => {
    const node = nodeMap[nodeId];
    if (!node) return;
    suggestions.push({
      type: 'redundancy',
      nodeId,
      message: `Add redundancy for ${node.data?.label || nodeId} — it is a single point of failure`,
      priority: 'critical',
    });
  });

  // Suggestion: Add load balancer if single backend with high traffic
  const backendNodes = nodes.filter((node) => {
    const type = (node.data?.type || node.type || '').toLowerCase();
    const label = (node.data?.label || node.data?.name || '').toLowerCase();
    return type.includes('service') || type.includes('server') || type.includes('api') || label.includes('service') || label.includes('server') || label.includes('api') || label.includes('backend');
  });

  backendNodes.forEach((node) => {
    const inDeg = inDegree[node.id] || 0;
    const hasMultipleIncoming = inDeg >= 3;
    const outgoing = graph[node.id] || [];

    if (hasMultipleIncoming && outgoing.length === 1) {
      suggestions.push({
        type: 'load_balancer',
        nodeId: node.id,
        message: `Add load balancer before ${node.data?.label || node.id} to distribute high incoming traffic`,
        priority: 'medium',
      });
    }
  });

  // Deduplicate suggestions by nodeId + type
  const seen = new Set();
  return suggestions.filter((s) => {
    const key = `${s.type}:${s.nodeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Calculate an overall topology health score (0-100)
 */
function calculateScore(nodes, bottlenecks, spofIds, suggestions) {
  let score = 100;

  // Deduct for SPOFs
  score -= spofIds.length * 15;

  // Deduct for bottlenecks
  score -= bottlenecks.length * 10;

  // Deduct for high-priority suggestions
  const criticalCount = suggestions.filter((s) => s.priority === 'critical').length;
  const highCount = suggestions.filter((s) => s.priority === 'high').length;
  const mediumCount = suggestions.filter((s) => s.priority === 'medium').length;

  score -= criticalCount * 10;
  score -= highCount * 5;
  score -= mediumCount * 2;

  return Math.max(0, Math.min(100, score));
}

/**
 * Main topology analysis function
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {object} Analysis result
 */
function analyzeTopology(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return {
      bottlenecks: [],
      spofs: [],
      criticalPath: { path: [], latency: 0 },
      totalLatency: 0,
      suggestions: [],
      score: 100,
      summary: 'No nodes to analyze',
    };
  }

  const { graph, nodeMap } = buildGraph(nodes, edges);
  const inDegree = calculateInDegrees(nodes, edges);

  // Identify entry nodes (nodes with no incoming edges = inDegree 0)
  const entryNodes = nodes.filter((n) => (inDegree[n.id] || 0) === 0);

  // Identify leaf nodes (nodes with no outgoing edges)
  const leafIds = new Set(nodes.filter((n) => (graph[n.id] || []).length === 0).map((n) => n.id));

  // Find all paths from all entry nodes
  let allPaths = [];
  const startNodes = entryNodes.length > 0 ? entryNodes : nodes.slice(0, 1);
  startNodes.forEach((entryNode) => {
    const paths = findAllPaths(graph, entryNode.id, leafIds);
    allPaths = allPaths.concat(paths);
  });

  // Detect bottlenecks
  const bottlenecks = detectBottlenecks(nodes, inDegree);

  // Detect SPOFs
  const spofIds = detectSPOFs(allPaths, nodes);
  const spofNodes = spofIds.map((id) => nodeMap[id]).filter(Boolean);

  // Find critical path
  const { path: criticalPathIds, latency: criticalLatency } = findCriticalPath(allPaths, nodeMap);
  const criticalPath = {
    path: criticalPathIds,
    nodeDetails: criticalPathIds.map((id) => ({
      id,
      label: nodeMap[id]?.data?.label || id,
      latency: getNodeLatency(nodeMap[id]),
    })),
    latency: criticalLatency,
  };

  // Total latency of the longest path
  const totalLatency = criticalLatency;

  // Generate suggestions
  const suggestions = generateSuggestions(nodes, bottlenecks, spofIds, inDegree, graph);

  // Health score
  const score = calculateScore(nodes, bottlenecks, spofIds, suggestions);

  return {
    bottlenecks: bottlenecks.map((n) => ({
      id: n.id,
      label: n.data?.label || n.id,
      capacity: n.data?.max_capacity ?? n.data?.maxCapacity ?? n.data?.capacity,
      inDegree: inDegree[n.id] || 0,
    })),
    spofs: spofNodes.map((n) => ({
      id: n.id,
      label: n.data?.label || n.id,
    })),
    criticalPath,
    totalLatency,
    suggestions,
    score,
    summary: `Score: ${score}/100. Found ${bottlenecks.length} bottleneck(s), ${spofIds.length} SPOF(s), ${suggestions.length} suggestion(s).`,
    pathCount: allPaths.length,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

module.exports = {
  analyzeTopology,
  detectBottlenecks,
  detectSPOFs,
  findCriticalPath,
  calculateTotalLatency,
  generateSuggestions,
};
