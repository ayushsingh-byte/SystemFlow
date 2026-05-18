"""
In-memory causal graph — used when Neo4j is unavailable or in tests.
Stores typed directed edges between nodes with criticality weights.
Also consumed by the DAG builder to annotate edges with confirmed reaction matches.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

CRITICALITY_WEIGHT = {"critical": 1.0, "important": 0.7, "optional": 0.4}
PROPAGATION_WEIGHT = {"blocks": 1.0, "degrades": 0.7, "isolated": 0.1}


@dataclass
class GraphEdge:
    source: str           # upstream node_id
    target: str           # downstream node_id (symptom side)
    edge_type: str        # HTTP_CALL, DB_QUERY, etc.
    criticality: str      # critical | important | optional
    failure_propagation: str  # blocks | degrades | isolated
    confidence: float = 1.0   # 0..1 (1.0 = manually registered, <1 = auto-discovered)

    @property
    def weight(self) -> float:
        """Combined edge weight for causal scoring."""
        return (
            CRITICALITY_WEIGHT.get(self.criticality, 0.5) *
            PROPAGATION_WEIGHT.get(self.failure_propagation, 0.5) *
            self.confidence
        )


@dataclass
class CausalNode:
    node_id: str
    node_type: str
    family: str = ""


class CausalGraph:
    """
    Directed graph: source → target means source's behavior AFFECTS target.
    i.e., target is DOWNSTREAM of source.
    Causal tracing walks UPSTREAM: given target (symptom), find sources (causes).
    """

    def __init__(self):
        self._nodes: Dict[str, CausalNode] = {}
        # downstream → list of edges where edge.target == downstream
        self._incoming: Dict[str, List[GraphEdge]] = {}
        # source → list of edges where edge.source == source
        self._outgoing: Dict[str, List[GraphEdge]] = {}

    def add_node(self, node_id: str, node_type: str, family: str = "") -> None:
        self._nodes[node_id] = CausalNode(node_id, node_type, family)

    def add_edge(self, edge: GraphEdge) -> None:
        if edge.target not in self._incoming:
            self._incoming[edge.target] = []
        if edge.source not in self._outgoing:
            self._outgoing[edge.source] = []
        # Deduplicate: replace if same source/target/type
        self._incoming[edge.target] = [
            e for e in self._incoming[edge.target]
            if not (e.source == edge.source and e.edge_type == edge.edge_type)
        ]
        self._outgoing[edge.source] = [
            e for e in self._outgoing[edge.source]
            if not (e.target == edge.target and e.edge_type == edge.edge_type)
        ]
        self._incoming[edge.target].append(edge)
        self._outgoing[edge.source].append(edge)

    def get_node(self, node_id: str) -> Optional[CausalNode]:
        return self._nodes.get(node_id)

    def get_upstream(self, node_id: str) -> List[GraphEdge]:
        """Return all edges pointing INTO node_id (i.e., causes of node_id)."""
        return self._incoming.get(node_id, [])

    def get_downstream(self, node_id: str) -> List[GraphEdge]:
        """Return all edges going OUT of node_id."""
        return self._outgoing.get(node_id, [])

    def bfs_upstream(self, start_node_id: str, max_hops: int = 3) -> List[Tuple[str, int, List[GraphEdge]]]:
        """
        BFS backward from start_node_id.
        Returns list of (node_id, hop_count, path_edges) for all reachable upstream nodes.
        """
        visited: Set[str] = {start_node_id}
        frontier: List[Tuple[str, int, List[GraphEdge]]] = [(start_node_id, 0, [])]
        result: List[Tuple[str, int, List[GraphEdge]]] = []

        while frontier:
            current_id, hop, path = frontier.pop(0)
            for edge in self.get_upstream(current_id):
                if edge.source in visited or hop >= max_hops:
                    continue
                visited.add(edge.source)
                new_path = path + [edge]
                result.append((edge.source, hop + 1, new_path))
                frontier.append((edge.source, hop + 1, new_path))

        return result

    def node_count(self) -> int:
        return len(self._nodes)

    def edge_count(self) -> int:
        return sum(len(edges) for edges in self._incoming.values())


# Module-level singleton
_graph = CausalGraph()


def add_node(node_id: str, node_type: str, family: str = "") -> None:
    _graph.add_node(node_id, node_type, family)


def add_edge(source: str, target: str, edge_type: str,
             criticality: str = "important",
             failure_propagation: str = "degrades",
             confidence: float = 1.0) -> None:
    _graph.add_edge(GraphEdge(
        source=source, target=target, edge_type=edge_type,
        criticality=criticality, failure_propagation=failure_propagation,
        confidence=confidence,
    ))


def get_graph() -> CausalGraph:
    return _graph
