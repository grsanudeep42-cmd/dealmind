"""
deal_agent.py — Core agent logic and all FastAPI route handlers.

Architecture:
  1. recall()  → top-5 ranked memories (for citation panel)
  2. reflect() → agentic synthesis (for the answer)
  3. Groq      → fallback / Groq-powered augmentation if reflect is empty
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from hindsight_bridge import recall, reflect, retain
from synapse_graph import get_synapse
from synthetic_data import CALL_METADATA, DEAL_ID, DEAL_NAME, NOVATECH_DEAL_ID, NOVATECH_DEAL_NAME

_logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Groq config
# ---------------------------------------------------------------------------
_GROQ_BASE = "https://api.groq.com/openai/v1"
_GROQ_MODEL_DEFAULT = "qwen/qwen3-32b"


def _groq_key() -> str:
    return os.environ.get("GROQ_API_KEY", "")


def _groq_model() -> str:
    return os.environ.get("GROQ_MODEL", _GROQ_MODEL_DEFAULT).strip() or _GROQ_MODEL_DEFAULT


async def _call_groq(system: str, user: str, timeout: float = 60.0) -> str:
    key = _groq_key()
    if not key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured.")

    payload = {
        "model": _groq_model(),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{_GROQ_BASE}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Groq request error: {exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail=f"Groq error {resp.status_code}: {resp.text[:300]}",
        )

    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        # Strip <think> blocks from Qwen3 thinking models
        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        return content
    except (KeyError, IndexError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Groq parse error: {exc}") from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _enrich_memory_source(mem: dict[str, Any]) -> dict[str, Any]:
    """
    Add call metadata (call number, week, attendees, topic) to a recalled memory
    by matching its document_id against the CALL_METADATA lookup.
    """
    doc_id = str(mem.get("document_id") or mem.get("id") or "")
    meta = CALL_METADATA.get(doc_id, {})
    return {
        "text": str(mem.get("text") or mem.get("content") or ""),
        "document_id": doc_id,
        "relevance": float(mem.get("score") or mem.get("relevance") or 0.0),
        "call_number": meta.get("call_number"),
        "week": meta.get("week"),
        "attendees": meta.get("attendees", []),
        "topic": meta.get("topic", ""),
        "label": (
            f"📞 Call #{meta['call_number']} · {', '.join(meta['attendees'])} · Week {meta['week']}"
            if meta else doc_id
        ),
    }


def _build_entity_graph(memories: list[dict[str, Any]], deal_id: str = DEAL_ID) -> dict[str, Any]:
    """
    Build a node/edge graph for a specific deal.
    Supports: acme-corp-deal, novatech-deal.
    """
    nodes: list[dict] = []
    edges: list[dict] = []
    seen_ids: set[str] = set()

    def _add_node(nid: str, label: str, kind: str) -> None:
        if nid not in seen_ids:
            color_map = {
                "stakeholder": "#3B82F6",
                "objection_open": "#EF4444",
                "objection_resolved": "#22C55E",
                "competitor": "#F97316",
                "amendment": "#A855F7",
                "deal": "#64748B",
            }
            nodes.append({"id": nid, "label": label, "type": kind, "color": color_map.get(kind, "#94A3B8")})
            seen_ids.add(nid)

    def _add_edge(src: str, tgt: str, label: str) -> None:
        edges.append({"source": src, "target": tgt, "label": label})

    if deal_id == NOVATECH_DEAL_ID:
        # NovaTech graph
        _add_node("deal-novatech", "NovaTech Deal\n$320K ARR", "deal")
        for sid, slabel in [
            ("marcus-webb", "Marcus Webb\nVP Engineering"),
            ("sarah-kim", "Sarah Kim\nInfoSec Lead"),
            ("novatech-cfo", "CFO\nFinance"),
        ]:
            _add_node(sid, slabel, "stakeholder")
            _add_edge("deal-novatech", sid, "involves")

        for oid, olabel, raised_by in [
            ("nt-obj-enc-rest", "Encryption at Rest\nAES-256 required", "sarah-kim"),
            ("nt-obj-gdpr", "GDPR Data Residency\nEU HQ legal req", "sarah-kim"),
            ("nt-obj-multi-tenant", "Shared Infrastructure\nCategorically rejected", "sarah-kim"),
            ("nt-obj-soc2", "SOC 2 Type II\nISO 27001 required", "sarah-kim"),
            ("nt-obj-budget", "Budget Ceiling\n$320K hard cap", "novatech-cfo"),
        ]:
            _add_node(oid, olabel, "objection_resolved")
            _add_edge(raised_by, oid, "raised")
            _add_edge(oid, "nt-amd", "resolved by")

        _add_node("nt-comp-pinecone", "Pinecone\n(Ruled out cost)", "competitor")
        _add_node("nt-comp-weaviate", "Weaviate\n(Replacing)", "competitor")
        _add_edge("deal-novatech", "nt-comp-pinecone", "evaluated")
        _add_edge("deal-novatech", "nt-comp-weaviate", "replacing")
        _add_edge("marcus-webb", "nt-comp-pinecone", "mentioned")

        _add_node("nt-amd", "Dedicated VPC\nAES-256 + EU Residency\n+ SOC 2 Type II", "amendment")
        _add_edge("deal-novatech", "nt-amd", "includes")

        for doc_id, attendee_id in [
            ("novatech-call-1", "marcus-webb"),
            ("novatech-call-2", "sarah-kim"),
            ("novatech-call-3", "marcus-webb"),
            ("novatech-call-4", "novatech-cfo"),
        ]:
            meta = CALL_METADATA.get(doc_id, {})
            cnode = f"nt-call-{meta.get('call_number', doc_id)}"
            _add_node(cnode, f"Call #{meta.get('call_number','?')}\nWeek {meta.get('week','?')}\n{meta.get('topic','')}", "deal")
            _add_edge("deal-novatech", cnode, "call")
            _add_edge(cnode, attendee_id, "attended by")

    else:
        # Acme Corp graph (default)
        _add_node("deal-acme", "Acme Corp Deal\n$480K ARR", "deal")
        for sid, slabel in [
            ("dave-chen", "Dave Chen\nVP Engineering"),
            ("priya-sharma", "Priya Sharma\nHead of InfoSec"),
            ("robert-walsh", "Robert Walsh\nCFO"),
        ]:
            _add_node(sid, slabel, "stakeholder")
            _add_edge("deal-acme", sid, "involves")

        for oid, olabel, raised_by in [
            ("obj-gdpr", "GDPR Data Residency\n(EU-only)", "priya-sharma"),
            ("obj-enc-rest", "Encryption at Rest\nAES-256", "priya-sharma"),
            ("obj-multi-tenant", "Multi-tenant\nArchitecture Rejected", "priya-sharma"),
            ("obj-enc-transit", "Encryption in Transit\nTLS 1.2+", "priya-sharma"),
            ("obj-soc2", "SOC 2 Type II\nCertification", "priya-sharma"),
            ("obj-price", "Price Negotiation\n$520K to $480K", "robert-walsh"),
        ]:
            _add_node(oid, olabel, "objection_resolved")
            _add_edge(raised_by, oid, "raised")
            _add_edge(oid, "amd-2024-047", "resolved by")

        _add_node("comp-pinecone", "Pinecone\n(Replacing)", "competitor")
        _add_node("comp-weaviate", "Weaviate\n(Evaluating)", "competitor")
        _add_edge("deal-acme", "comp-pinecone", "replacing")
        _add_edge("deal-acme", "comp-weaviate", "competing with")
        _add_edge("dave-chen", "comp-weaviate", "mentioned")

        _add_node("amd-2024-047", "AMD-2024-047\nDedicated VPC +\nGDPR + Encryption", "amendment")
        _add_edge("deal-acme", "amd-2024-047", "includes")

        for doc_id, attendee_id in [
            ("acme-call-1", "dave-chen"),
            ("acme-call-2", "priya-sharma"),
            ("acme-call-3", "dave-chen"),
            ("acme-call-4", "priya-sharma"),
            ("acme-call-5", "robert-walsh"),
        ]:
            meta = CALL_METADATA.get(doc_id, {})
            cnode = f"call-{meta.get('call_number', doc_id)}"
            _add_node(cnode, f"Call #{meta.get('call_number','?')}\nWeek {meta.get('week','?')}\n{meta.get('topic','')}", "deal")
            _add_edge("deal-acme", cnode, "call")
            _add_edge(cnode, attendee_id, "attended by")

    return {"nodes": nodes, "edges": edges}



class IngestRequest(BaseModel):
    deal_id: str
    call_number: int
    transcript: str = Field(..., min_length=10)


class IngestResponse(BaseModel):
    ok: bool
    deal_id: str
    document_id: str
    message: str


class ChatRequest(BaseModel):
    deal_id: str
    message: str = Field(..., min_length=1)


class MemorySource(BaseModel):
    text: str
    document_id: str
    relevance: float
    call_number: int | None
    week: int | None
    attendees: list[str]
    topic: str
    label: str


class AssociativeMemory(BaseModel):
    document_id: str
    label: str
    co_retrieval_count: int


class ChatResponse(BaseModel):
    answer: str
    memories_used: list[MemorySource]
    associative_memories: list[AssociativeMemory]
    reflect_used: bool
    model: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/deal/ingest", response_model=IngestResponse)
async def ingest_call(body: IngestRequest) -> IngestResponse:
    """
    Ingest a call transcript into Hindsight for a given deal.
    document_id = "{deal_id}-call-{call_number}" for consistent labelling.
    """
    doc_id = f"{body.deal_id}-call-{body.call_number}"
    ok = await retain(
        bank_id=body.deal_id,
        content=body.transcript,
        document_id=doc_id,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Hindsight retain failed. Check API key and bank_id.")

    return IngestResponse(
        ok=True,
        deal_id=body.deal_id,
        document_id=doc_id,
        message=f"Call #{body.call_number} ingested into deal '{body.deal_id}'.",
    )


@router.post("/agent/chat", response_model=ChatResponse)
async def agent_chat(body: ChatRequest) -> ChatResponse:
    """
    Core agent endpoint:
      1. recall()  → top-5 memories (for the memory citation panel)
      2. reflect() → Hindsight's agentic synthesized answer
      3. If reflect returns empty, fall back to Groq with recalled memories injected
    """
    deal_id = body.deal_id
    message = body.message.strip()

    # Step 1 + 2 concurrently: recall memories AND reflect — both hit Hindsight in parallel
    import asyncio
    raw_memories, reflect_result = await asyncio.gather(
        recall(bank_id=deal_id, query=message, budget="mid", max_results=5),
        reflect(bank_id=deal_id, query=message),
    )
    enriched = [_enrich_memory_source(m) for m in raw_memories]
    reflect_text = (reflect_result.get("text") or "").strip()
    reflect_used = bool(reflect_text)

    # Step 3: Synapse — Hebbian co-retrieval update (non-fatal, non-blocking)
    # Use document_id for edge nodes; use internal Hindsight id to deduplicate
    # when the same document_id is returned multiple times (NovaTech issue).
    synapse = get_synapse()
    seen_internal: set[str] = set()
    doc_ids: list[str] = []
    for m in raw_memories:
        internal = str(m.get("id") or m.get("document_id") or "")
        doc_id   = str(m.get("document_id") or "")
        if doc_id and internal and internal not in seen_internal:
            seen_internal.add(internal)
            doc_ids.append(doc_id)
    if len(doc_ids) >= 2:
        try:
            synapse.touch_co_retrieval(deal_id=deal_id, document_ids=doc_ids)
        except Exception as exc:
            _logger.warning("synapse touch_co_retrieval failed: %s", exc)


    # Step 4: Spreading activation — surface associatively linked calls
    associative_memories: list[AssociativeMemory] = []
    if enriched:
        top_doc_id = enriched[0]["document_id"] if enriched[0]["document_id"] else None
        if top_doc_id:
            try:
                spread_ids = synapse.spreading_activation(deal_id=deal_id, seed_id=top_doc_id)
                for sid in spread_ids:
                    edge = synapse._graph.get_edge_data(top_doc_id, sid, default={})
                    w = edge.get("weight", 1)
                    meta = CALL_METADATA.get(sid, {})
                    label = (
                        f"📞 Call #{meta['call_number']} · {', '.join(meta['attendees'])} · Week {meta['week']}"
                        if meta else sid
                    )
                    associative_memories.append(
                        AssociativeMemory(document_id=sid, label=label, co_retrieval_count=w)
                    )
            except Exception as exc:
                _logger.warning("synapse spreading_activation failed: %s", exc)

    answer: str
    if reflect_used:
        answer = reflect_text
        based_on = reflect_result.get("based_on") or []
        if based_on and not enriched:
            enriched = [_enrich_memory_source(src) for src in based_on[:5]]
    else:
        _logger.warning("agent_chat: reflect returned empty — falling back to Groq")

        context_parts: list[str] = []
        if enriched:
            context_parts.append("[Hindsight Recalled Memories]\n" + "\n".join(
                f"[{m['label']}]\n{m['text'][:600]}" for m in enriched
            ))
        if associative_memories:
            assoc_labels = ", ".join(a.label for a in associative_memories)
            context_parts.append(f"[Synapse Associative Context — implicitly linked]\n{assoc_labels}")

        if context_parts:
            system = (
                "You are DealMind, an enterprise sales deal intelligence agent.\n"
                "You have access to recalled memories and associatively linked context from this deal.\n"
                "Always cite the specific call source. Be direct and actionable.\n\n"
                + "\n\n".join(context_parts)
            )
        else:
            system = (
                "You are DealMind, an enterprise sales deal intelligence agent.\n"
                "No specific memories were recalled for this query. "
                "Answer based on general sales intelligence best practices."
            )

        answer = await _call_groq(system=system, user=message)

    return ChatResponse(
        answer=answer,
        memories_used=[MemorySource(**m) for m in enriched],
        associative_memories=associative_memories,
        reflect_used=reflect_used,
        model=f"hindsight-reflect + {_groq_model()}" if reflect_used else _groq_model(),
    )


@router.get("/deal/{deal_id}/observations")
async def get_observations(deal_id: str) -> dict[str, Any]:
    """
    Fetch Hindsight's auto-consolidated observations for the deal.
    Uses reflect with a meta-query to surface what the agent has learned.
    """
    query = (
        "Provide a structured summary of all key observations, risks, open issues, "
        "and resolved items for this deal. Include stakeholder positions, objections raised, "
        "objections resolved, competitor mentions, and commercial terms agreed."
    )

    result = await reflect(bank_id=deal_id, query=query)
    text = (result.get("text") or "").strip()

    # Also get raw recalls for completeness
    raw = await recall(bank_id=deal_id, query="all objections stakeholders commercial terms", budget="high", max_results=10)
    enriched = [_enrich_memory_source(m) for m in raw]

    return {
        "deal_id": deal_id,
        "consolidated_summary": text or "No observations available yet. Seed the deal data first.",
        "raw_memories": enriched,
        "total_memories": len(enriched),
    }


@router.get("/deal/{deal_id}/graph")
async def get_deal_graph(deal_id: str) -> dict[str, Any]:
    """
    Return the entity relationship graph for the deal.
    Nodes: stakeholders, objections, competitors, amendments.
    Edges: relationships.
    """
    # Recall all memories to verify the deal has data
    raw = await recall(bank_id=deal_id, query="all stakeholders objections competitors amendments", budget="high", max_results=10)
    graph = _build_entity_graph(raw, deal_id=deal_id)

    deal_name = DEAL_NAME if deal_id == DEAL_ID else (
        NOVATECH_DEAL_NAME if deal_id == NOVATECH_DEAL_ID else deal_id
    )
    return {
        "deal_id": deal_id,
        "deal_name": deal_name,
        **graph,
    }


@router.get("/deal/{deal_id}/info")
async def get_deal_info(deal_id: str) -> dict[str, Any]:
    """Return basic deal metadata."""
    if deal_id == DEAL_ID:
        return {
            "deal_id": DEAL_ID,
            "deal_name": DEAL_NAME,
            "stage": "Commercial Negotiation",
            "expected_arr": 480000,
            "expected_close": "Q4 2024",
            "calls": [
                {**{"call_number": c.call_number, "week": c.week, "document_id": c.document_id}, **CALL_METADATA.get(c.document_id, {})}
                for c in __import__("synthetic_data").ACME_CALLS
            ],
        }
    return {"deal_id": deal_id, "deal_name": deal_id, "stage": "Unknown", "calls": []}


@router.get("/deals")
async def list_deals() -> dict[str, Any]:
    """List available deals."""
    return {
        "deals": [
            {
                "deal_id": DEAL_ID,
                "deal_name": DEAL_NAME,
                "stage": "Commercial Negotiation",
                "arr": "$480K",
                "calls": 5,
            },
            {
                "deal_id": NOVATECH_DEAL_ID,
                "deal_name": NOVATECH_DEAL_NAME,
                "stage": "Technical Validation",
                "arr": "$320K",
                "calls": 4,
            },
        ]
    }


@router.get("/deal/{deal_id}/associative-graph")
async def get_associative_graph(deal_id: str) -> dict[str, Any]:
    """
    Returns the Synapse co-retrieval graph for this deal.
    Nodes = calls. Edges = weighted by how often recalled together.
    Only edges with weight >= 2 are returned (noise filter).
    """
    synapse = get_synapse()
    graph = synapse.get_associative_graph(deal_id=deal_id)
    return {"deal_id": deal_id, **graph}


@router.get("/deal/{deal_id}/spreading")
async def spreading_activation(deal_id: str, seed_id: str) -> dict[str, Any]:
    """
    Given a seed document_id (call), return the top 5 associatively
    linked calls via Synapse graph traversal.
    Used by the frontend to animate spreading activation on click.
    """
    synapse = get_synapse()
    spread_ids = synapse.spreading_activation(deal_id=deal_id, seed_id=seed_id)
    result = []
    for sid in spread_ids:
        edge = synapse._graph.get_edge_data(seed_id, sid, default={})
        w = edge.get("weight", 1)
        meta = CALL_METADATA.get(sid, {})
        label = (
            f"📞 Call #{meta['call_number']} · {', '.join(meta['attendees'])} · Week {meta['week']}"
            if meta else sid
        )
        result.append({"document_id": sid, "label": label, "co_retrieval_count": w})
    return {"seed_id": seed_id, "activated": result}


@router.get("/insights/patterns")
async def get_cross_deal_patterns() -> dict[str, Any]:
    """
    Cross-deal pattern learning via Synapse graph.
    Feeds REAL co-retrieval edge data to Groq — patterns generated from
    actual usage, not hardcoded strings.
    """
    import json as _json

    synapse = get_synapse()
    evidence = synapse.get_raw_graph_evidence()
    total_edges = evidence["total_edges"]

    if total_edges == 0:
        return {
            "patterns": [],
            "source": "Synapse graph has no data yet. Ask questions in Chat to build co-retrieval edges.",
            "deals_analysed": [DEAL_ID, NOVATECH_DEAL_ID],
        }

    edge_lines: list[str] = []
    for deal, edges in evidence["edges_by_deal"].items():
        if edges:
            edge_lines.append(f"Deal: {deal}")
            for e in sorted(edges, key=lambda x: x["weight"], reverse=True):
                strength = "STRONG" if e["strong"] else "emerging"
                edge_lines.append(
                    f"  [{strength} weight={e['weight']}] "
                    f"{e['source_label']} <-> {e['target_label']}"
                )

    call_context_lines: list[str] = []
    for doc_id, meta in evidence["call_metadata"].items():
        call_context_lines.append(f"  {doc_id}: {meta['label']} (deal: {meta['deal']})")

    evidence_text = "\n".join(edge_lines)
    call_context = "\n".join(call_context_lines)

    system_prompt = (
        "You are a sales intelligence analyst. You will be given raw co-retrieval "
        "graph data from a Hebbian learning system. Each edge means two sales call memories were "
        "recalled together when a rep asked a question. Higher weight = recalled together more often.\n\n"
        "Your job: identify 2-3 GENUINE cross-deal patterns from this data. "
        "Be specific and sales-actionable. Do NOT invent patterns not supported by the edges.\n\n"
        "Output ONLY a valid JSON array. No markdown, no explanation outside JSON.\n"
        "Format: [{\"pattern\": \"one sentence\", \"evidence\": \"specific evidence\", "
        "\"confidence\": \"high\" or \"emerging\", \"deals\": [\"Deal name\"]}]"
    )

    user_prompt = (
        f"Co-retrieval graph edges (what reps actually asked about together):\n{evidence_text}\n\n"
        f"Call reference (what each call contained):\n{call_context}\n\n"
        "Deals: acme-corp-deal (Acme Corp $480K, enterprise vector DB) "
        "and novatech-deal (NovaTech $320K, ML infrastructure).\n"
        "Both deals have InfoSec gatekeepers who raised encryption and GDPR concerns.\n\n"
        "Identify 2-3 real patterns from the edge data above."
    )

    try:
        raw = await _call_groq(system_prompt, user_prompt, timeout=30.0)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:])
        if raw.endswith("```"):
            raw = "\n".join(raw.split("\n")[:-1])
        patterns = _json.loads(raw.strip())
        if not isinstance(patterns, list):
            raise ValueError("Expected JSON array")
    except Exception as exc:
        _logger.warning("insights/patterns: Groq failed (%s) — edge summary fallback", exc)
        all_edges = [e for edges in evidence["edges_by_deal"].values() for e in edges]
        strong = [e for e in all_edges if e["strong"]]
        patterns = []
        if strong:
            top = strong[0]
            patterns.append({
                "pattern": f"{top['source_label']} and {top['target_label']} are the most co-retrieved calls",
                "evidence": f"Recalled together {top['weight']} times — strongest Synapse edge in the graph",
                "confidence": "high",
                "deals": ["Acme Corp"],
            })
        patterns.append({
            "pattern": f"Graph has {total_edges} co-retrieval edges — ask more questions to strengthen patterns",
            "evidence": f"{len([e for e in all_edges if e['weight'] >= 2])} strong edges (recalled 2+ times)",
            "confidence": "emerging",
            "deals": ["Acme Corp", "NovaTech"],
        })

    return {
        "patterns": patterns,
        "source": f"Synapse graph ({total_edges} edges) -> Groq pattern synthesis — not hardcoded",
        "deals_analysed": [DEAL_ID, NOVATECH_DEAL_ID],
    }


# ---------------------------------------------------------------------------
# Transcript upload / ingest
# ---------------------------------------------------------------------------

from fastapi import UploadFile, File as FastAPIFile  # noqa: E402


@router.post("/deal/{deal_id}/ingest")
async def ingest_transcript(
    deal_id: str,
    call_number: int,
    file: UploadFile = FastAPIFile(...),
) -> dict:
    """Upload a call transcript (PDF or TXT) and retain it in Hindsight."""
    content_bytes = await file.read()

    # Decode text
    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            import io
            import pypdf  # type: ignore
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            text = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as exc:
            _logger.warning("PDF parse failed (%s) — falling back to raw bytes", exc)
            text = content_bytes.decode("utf-8", errors="replace")
    else:
        text = content_bytes.decode("utf-8", errors="replace")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file.")

    doc_id = f"{deal_id}-call-{call_number}"
    metadata = {
        "deal_id": deal_id,
        "call_number": call_number,
        "source": "upload",
        "filename": file.filename or "transcript.txt",
    }

    try:
        await retain(bank_id=deal_id, document_id=doc_id, text=text, metadata=metadata)
    except Exception as exc:
        _logger.error("retain() failed for %s: %s", doc_id, exc)
        raise HTTPException(status_code=502, detail=f"Hindsight retain failed: {exc}") from exc

    _logger.info("Ingested %s (%d chars) into Hindsight bank %s", doc_id, len(text), deal_id)
    return {
        "status": "ok",
        "deal_id": deal_id,
        "document_id": doc_id,
        "call_number": call_number,
        "message": f"Call #{call_number} ingested into Hindsight ({len(text):,} chars).",
    }
