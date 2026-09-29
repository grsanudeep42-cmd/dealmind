"""
synapse_graph.py — Hebbian co-retrieval strength graph for DealMind.

Every time Hindsight recall() surfaces memories together, their edge
weight increments by 1. Over time the graph learns which calls/topics
are implicitly associated through usage — not programmed, observed.

Persistence: MongoDB collection "dealmind_synapse_graph".
Fallback:    in-memory dict if MongoDB is unavailable (demo-safe).
"""

from __future__ import annotations

import itertools
import logging
import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import networkx as nx

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Call-level metadata (for node labels / colours when building graph)
# ---------------------------------------------------------------------------

_CALL_META: dict[str, dict[str, Any]] = {
    # Acme Corp
    "acme-call-1": {"label": "Call #1\nDave Chen · Wk1",  "color": "#3B82F6", "deal": "acme-corp-deal"},
    "acme-call-2": {"label": "Call #2\nPriya · Wk3",      "color": "#3B82F6", "deal": "acme-corp-deal"},
    "acme-call-3": {"label": "Call #3\nDave Chen · Wk5",  "color": "#3B82F6", "deal": "acme-corp-deal"},
    "acme-call-4": {"label": "Call #4\nPriya · Wk7",      "color": "#3B82F6", "deal": "acme-corp-deal"},
    "acme-call-5": {"label": "Call #5\nR. Walsh · Wk9",   "color": "#3B82F6", "deal": "acme-corp-deal"},
    # NovaTech
    "novatech-call-1": {"label": "Call #1\nM. Webb · Wk1",  "color": "#8B5CF6", "deal": "novatech-deal"},
    "novatech-call-2": {"label": "Call #2\nS. Kim · Wk3",   "color": "#8B5CF6", "deal": "novatech-deal"},
    "novatech-call-3": {"label": "Call #3\nTech · Wk5",     "color": "#8B5CF6", "deal": "novatech-deal"},
    "novatech-call-4": {"label": "Call #4\nCFO · Wk7",      "color": "#8B5CF6", "deal": "novatech-deal"},
}


def _node_meta(doc_id: str) -> dict[str, Any]:
    meta = _CALL_META.get(doc_id)
    if meta:
        return {"id": doc_id, "label": meta["label"], "type": "call", "color": meta["color"]}
    return {"id": doc_id, "label": doc_id, "type": "call", "color": "#64748B"}


# ---------------------------------------------------------------------------
# SynapseGraph
# ---------------------------------------------------------------------------

class SynapseGraph:
    """
    Hebbian associative graph over Hindsight recall co-occurrences.

    Nodes   = document_ids (calls)
    Edges   = weighted by how often two calls were recalled in the same query
    Learning= touch_co_retrieval() — called after every Hindsight recall()
    Query   = spreading_activation() — returns implicitly linked calls
    """

    def __init__(self) -> None:
        self._graph: nx.Graph = nx.Graph()
        self._mongo_ok = False
        self._col: Any = None          # pymongo Collection or None
        self._mem: dict[tuple, int] = defaultdict(int)   # in-memory fallback

        self._connect_mongo()
        self._load_from_store()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _connect_mongo(self) -> None:
        try:
            from pymongo import MongoClient
            uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/synapse")
            client: Any = MongoClient(uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")          # fast liveness check
            db = client.get_default_database()
            self._col = db["dealmind_synapse_graph"]
            self._mongo_ok = True
            _logger.info("synapse_graph: MongoDB connected — %s", uri)
        except Exception as exc:
            _logger.warning("synapse_graph: MongoDB unavailable (%s) — using in-memory store", exc)

    def _load_from_store(self) -> None:
        """Rebuild NetworkX graph from persisted edges on startup."""
        if self._mongo_ok and self._col is not None:
            try:
                for doc in self._col.find({}, {"_id": 0}):
                    src, tgt, w = doc["source"], doc["target"], doc.get("weight", 1)
                    self._graph.add_edge(src, tgt, weight=w)
            except Exception as exc:
                _logger.warning("synapse_graph: failed to load from Mongo (%s)", exc)
        else:
            # Reload from in-memory dict (empty on fresh start)
            for (src, tgt), w in self._mem.items():
                self._graph.add_edge(src, tgt, weight=w)

    def _persist_edge(self, src: str, tgt: str, weight: int, deal_id: str) -> None:
        key = tuple(sorted([src, tgt]))
        if self._mongo_ok and self._col is not None:
            try:
                self._col.update_one(
                    {"source": key[0], "target": key[1]},
                    {"$set": {
                        "source": key[0],
                        "target": key[1],
                        "weight": weight,
                        "deal_id": deal_id,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                    upsert=True,
                )
            except Exception as exc:
                _logger.warning("synapse_graph: mongo persist failed (%s)", exc)
        else:
            self._mem[key] = weight

    # ------------------------------------------------------------------
    # Core API
    # ------------------------------------------------------------------

    def touch_co_retrieval(self, deal_id: str, document_ids: list[str]) -> None:
        """
        Called after every Hindsight recall().
        For every pair in document_ids, increment edge weight by 1.
        Hebbian rule: neurons that fire together, wire together.
        """
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique_ids: list[str] = []
        for d in document_ids:
            if d and d not in seen:
                seen.add(d)
                unique_ids.append(d)

        if len(unique_ids) < 2:
            return  # nothing to co-relate

        for src, tgt in itertools.combinations(unique_ids, 2):
            key = tuple(sorted([src, tgt]))
            current = self._graph.get_edge_data(key[0], key[1], default={}).get("weight", 0)
            new_weight = current + 1
            self._graph.add_edge(key[0], key[1], weight=new_weight)
            self._persist_edge(key[0], key[1], new_weight, deal_id)
            _logger.debug(
                "synapse_graph: co-retrieval %s↔%s weight=%d", key[0], key[1], new_weight
            )

    def get_associative_graph(self, deal_id: str) -> dict[str, Any]:
        """
        Returns all nodes and edges for this deal where weight >= 1.
        Edges with weight >= 2 are marked 'strong' for thicker rendering.
        Always shows all call nodes for this deal (so graph is never empty).
        """
        deal_calls: set[str] = {
            doc_id for doc_id, meta in _CALL_META.items()
            if meta["deal"] == deal_id
        }

        filtered_edges = []
        node_ids: set[str] = set(deal_calls)  # always show all call nodes

        for src, tgt, data in self._graph.edges(data=True):
            w = data.get("weight", 1)
            # include if both nodes are in this deal AND weight >= 1
            if src in deal_calls and tgt in deal_calls and w >= 1:
                filtered_edges.append({
                    "source": src,
                    "target": tgt,
                    "weight": w,
                    "strong": w >= 2,   # strong = recalled together 2+ times
                    "label": f"recalled together {w}×",
                })
                node_ids.add(src)
                node_ids.add(tgt)

        nodes = [_node_meta(nid) for nid in sorted(node_ids)]

        _logger.info(
            "synapse_graph: associative_graph deal=%s nodes=%d edges=%d",
            deal_id, len(nodes), len(filtered_edges),
        )
        return {"nodes": nodes, "edges": filtered_edges}

    def spreading_activation(
        self,
        deal_id: str,
        seed_id: str,
        depth: int = 2,
    ) -> list[str]:
        """
        Given a seed document_id, traverse the co-retrieval graph by
        descending edge weight up to `depth` hops.

        Returns top-5 adjacent document_ids (excluding seed) — memories
        that are implicitly linked through usage patterns, not explicitly
        connected in the transcript.
        """
        if not seed_id or seed_id not in self._graph:
            return []

        deal_calls: set[str] = {
            doc_id for doc_id, meta in _CALL_META.items()
            if meta["deal"] == deal_id
        }

        visited: set[str] = {seed_id}
        # Priority queue: (negative_weight, node_id) for max-weight-first traversal
        frontier: list[tuple[int, str]] = []

        # Seed: add neighbours sorted by weight descending
        for neighbour, edge_data in sorted(
            self._graph[seed_id].items(),
            key=lambda kv: kv[1].get("weight", 0),
            reverse=True,
        ):
            if neighbour in deal_calls:
                frontier.append((-edge_data.get("weight", 0), neighbour))

        result: list[str] = []
        current_depth = 0

        while frontier and current_depth < depth and len(result) < 5:
            frontier.sort()  # sort ascending → most negative weight first
            _, node = frontier.pop(0)
            if node in visited:
                continue
            visited.add(node)
            result.append(node)

            # Expand neighbours for next depth hop
            for neighbour, edge_data in sorted(
                self._graph[node].items(),
                key=lambda kv: kv[1].get("weight", 0),
                reverse=True,
            ):
                if neighbour not in visited and neighbour in deal_calls:
                    frontier.append((-edge_data.get("weight", 0), neighbour))

            current_depth += 1

        _logger.info(
            "synapse_graph: spreading_activation seed=%s → %s",
            seed_id, result,
        )
        return result[:5]

    def get_raw_graph_evidence(self) -> dict[str, Any]:
        """
        Returns raw co-retrieval evidence from the graph for ALL deals.
        Used by deal_agent.py to feed real data to Groq for pattern generation.
        """
        acme_calls = {"acme-call-1", "acme-call-2", "acme-call-3", "acme-call-4", "acme-call-5"}
        nova_calls = {"novatech-call-1", "novatech-call-2", "novatech-call-3", "novatech-call-4"}

        edges_by_deal: dict[str, list[dict]] = {"acme-corp-deal": [], "novatech-deal": []}
        total_edges = 0

        for src, tgt, data in self._graph.edges(data=True):
            w = data.get("weight", 1)
            src_meta = _CALL_META.get(src, {})
            tgt_meta = _CALL_META.get(tgt, {})
            entry = {
                "source": src,
                "source_label": src_meta.get("label", src).replace("\n", " "),
                "target": tgt,
                "target_label": tgt_meta.get("label", tgt).replace("\n", " "),
                "weight": w,
                "strong": w >= 2,
            }
            if src in acme_calls or tgt in acme_calls:
                edges_by_deal["acme-corp-deal"].append(entry)
            if src in nova_calls or tgt in nova_calls:
                edges_by_deal["novatech-deal"].append(entry)
            total_edges += 1

        return {
            "edges_by_deal": edges_by_deal,
            "total_edges": total_edges,
            "call_metadata": {
                doc_id: {
                    "label": meta["label"].replace("\n", " "),
                    "deal": meta["deal"],
                }
                for doc_id, meta in _CALL_META.items()
            },
        }


# ---------------------------------------------------------------------------
# Module-level singleton — imported by deal_agent.py
# ---------------------------------------------------------------------------

_instance: SynapseGraph | None = None


def get_synapse() -> SynapseGraph:
    global _instance
    if _instance is None:
        _instance = SynapseGraph()
    return _instance
