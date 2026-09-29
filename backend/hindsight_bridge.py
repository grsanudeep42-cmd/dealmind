"""
hindsight_bridge.py — Retain / Recall / Reflect wrapper for Hindsight Cloud API.

All three operations are non-fatal by design: network failures are logged and
return empty/False so the agent continues to function without memory.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

_logger = logging.getLogger(__name__)

_BASE_DEFAULT = "https://api.hindsight.vectorize.io"
_TIMEOUT = 45.0  # seconds — reflect can be slow on first call


def _base() -> str:
    return os.environ.get("HINDSIGHT_BASE_URL", _BASE_DEFAULT).rstrip("/")


def _key() -> str:
    return os.environ.get("HINDSIGHT_API_KEY", "")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_key()}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# set_bank_mission — configure the bank's mission for reflect()
# ---------------------------------------------------------------------------

async def set_bank_mission(bank_id: str, mission: str) -> bool:
    """
    PATCH the bank's mission so reflect() uses the correct agent persona.
    Must be called before the first reflect() — idempotent, safe on every startup.
    Returns True on success.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.patch(
                f"{_base()}/v1/default/banks/{bank_id}",
                json={"mission": mission},
                headers=_headers(),
            )
        if resp.status_code == 200:
            _logger.info("hindsight.set_bank_mission: ok bank=%s", bank_id)
            return True
        _logger.warning(
            "hindsight.set_bank_mission: status=%d body=%s",
            resp.status_code, resp.text[:200],
        )
        return False
    except Exception as exc:
        _logger.error("hindsight.set_bank_mission: failed (%s)", exc)
        return False


# ---------------------------------------------------------------------------
# retain — store a call transcript or interaction
# ---------------------------------------------------------------------------

async def retain(
    bank_id: str,
    content: str,
    document_id: str | None = None,
) -> bool:
    """
    Store content into a Hindsight memory bank.

    Hindsight analyses the content to extract facts, entities, and build
    a knowledge graph — you pass prose, it structures everything internally.

    Returns True on success, False on any failure.
    """
    if not content.strip():
        return False

    item: dict[str, Any] = {"content": content}
    if document_id:
        item["document_id"] = document_id

    payload: dict[str, Any] = {"items": [item]}

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{_base()}/v1/default/banks/{bank_id}/memories",
                json=payload,
                headers=_headers(),
            )

        if resp.status_code == 200:
            _logger.info(
                "hindsight.retain: ok bank=%s doc_id=%r len=%d",
                bank_id, document_id, len(content),
            )
            return True

        _logger.warning(
            "hindsight.retain: status=%d bank=%s body=%s",
            resp.status_code, bank_id, resp.text[:300],
        )
        return False

    except Exception as exc:
        _logger.error("hindsight.retain: failed (%s)", exc)
        return False


# ---------------------------------------------------------------------------
# recall — fetch top-ranked memories for a query
# ---------------------------------------------------------------------------

async def recall(
    bank_id: str,
    query: str,
    budget: str = "mid",
    max_results: int = 5,
) -> list[dict[str, Any]]:
    """
    Retrieve relevant memories using Hindsight's multi-faceted retrieval
    (semantic + keyword + graph + temporal — TEMPR).

    Returns a list of dicts with at minimum a "text" key. Empty list on failure.
    """
    if not query.strip():
        return []

    payload: dict[str, Any] = {"query": query, "budget": budget}

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{_base()}/v1/default/banks/{bank_id}/memories/recall",
                json=payload,
                headers=_headers(),
            )

        if resp.status_code != 200:
            _logger.warning(
                "hindsight.recall: status=%d bank=%s body=%s",
                resp.status_code, bank_id, resp.text[:300],
            )
            return []

        data = resp.json()
        results: list[dict[str, Any]] = data.get("results") or []
        trimmed = results[:max_results]
        _logger.info(
            "hindsight.recall: bank=%s query=%r facts=%d",
            bank_id, query[:80], len(trimmed),
        )
        return trimmed

    except Exception as exc:
        _logger.error("hindsight.recall: failed (%s)", exc)
        return []


# ---------------------------------------------------------------------------
# reflect — agentic reasoning loop with synthesis
# ---------------------------------------------------------------------------

async def reflect(
    bank_id: str,
    query: str,
) -> dict[str, Any]:
    """
    Run Hindsight's agentic reflect loop — multi-strategy retrieval,
    disposition traits, and synthesized final answer with source citations.

    Returns dict with at minimum:
      "text": str — the synthesized answer
      "based_on": list — the memory sources used

    Returns {"text": "", "based_on": []} on failure.
    """
    if not query.strip():
        return {"text": "", "based_on": []}

    payload: dict[str, Any] = {"query": query}

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:  # reflect can take longer
            resp = await client.post(
                f"{_base()}/v1/default/banks/{bank_id}/reflect",
                json=payload,
                headers=_headers(),
            )

        if resp.status_code != 200:
            _logger.warning(
                "hindsight.reflect: status=%d bank=%s body=%s",
                resp.status_code, bank_id, resp.text[:300],
            )
            return {"text": "", "based_on": []}

        data = resp.json()
        _logger.info(
            "hindsight.reflect: bank=%s query=%r answer_len=%d sources=%d",
            bank_id, query[:80],
            len(str(data.get("text") or "")),
            len(data.get("based_on") or []),
        )
        return data

    except Exception as exc:
        _logger.error("hindsight.reflect: failed (%s)", exc)
        return {"text": "", "based_on": []}
