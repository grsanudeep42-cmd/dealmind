"""
main.py — FastAPI ASGI entry point for DealMind.

Startup: seeds Acme Corp deal data into Hindsight (idempotent).
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Load .env (project root has it, backend is a subdirectory)
# ---------------------------------------------------------------------------
_env_paths = [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",  # project root
]
for _p in _env_paths:
    if _p.exists():
        load_dotenv(_p)
        break

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s  %(name)s: %(message)s",
)
_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — seed data on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    _logger.info("DealMind: starting up")

    # Verify critical env vars
    required = {"HINDSIGHT_API_KEY", "GROQ_API_KEY"}
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        _logger.warning("DealMind: missing env vars: %s — some features will degrade", missing)

    # Seed the Acme Corp synthetic deal into Hindsight
    try:
        from synthetic_data import (
            seed_acme_deal, DEAL_ID,
            seed_novatech_deal, NOVATECH_DEAL_ID,
        )
        from hindsight_bridge import set_bank_mission

        _SALES_MISSION = (
            "I am a sales deal intelligence agent. I track every objection, "
            "stakeholder concern, pricing commitment, competitive mention, and "
            "contractual amendment across the full lifecycle of enterprise deals. "
            "I surface the exact context a rep needs, from the exact call it "
            "happened in, before every customer interaction."
        )

        # Seed both deals first — this creates the banks if they don't exist yet
        result = await seed_acme_deal()
        _logger.info(
            "DealMind: acme seeding — %d/%d calls ingested",
            result["calls_succeeded"], result["calls_attempted"],
        )

        result2 = await seed_novatech_deal()
        _logger.info(
            "DealMind: novatech seeding — %d/%d calls ingested",
            result2["calls_succeeded"], result2["calls_attempted"],
        )

        # Set mission AFTER banks exist (idempotent PATCH)
        for bank in [DEAL_ID, NOVATECH_DEAL_ID]:
            ok = await set_bank_mission(bank_id=bank, mission=_SALES_MISSION)
            _logger.info("DealMind: bank mission set bank=%s ok=%s", bank, ok)

    except Exception as exc:
        _logger.error("DealMind: seeding failed (non-fatal) — %s", exc)

    # Init Synapse graph singleton (connects to MongoDB, loads persisted edges)
    try:
        from synapse_graph import get_synapse
        synapse = get_synapse()
        _logger.info(
            "DealMind: Synapse graph ready — mongo_ok=%s nodes=%d",
            synapse._mongo_ok, synapse._graph.number_of_nodes(),
        )
    except Exception as exc:
        _logger.error("DealMind: Synapse graph init failed (non-fatal) — %s", exc)

    _logger.info("DealMind: accepting traffic")
    yield

    _logger.info("DealMind: shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DealMind — Enterprise Sales Deal Intelligence",
    description=(
        "AI-powered sales deal intelligence agent. "
        "Backed by Hindsight Cloud memory (retain/recall/reflect) and Groq LLM."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        os.environ.get("FRONTEND_URL", "https://dealmind.vercel.app"),
        "https://frontend-seven-sigma-lfe79qlyv4.vercel.app",
        "https://frontend-3dtqmyu01-grsanudeep42-cmds-projects.vercel.app"
    ],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from deal_agent import router  # noqa: E402
app.include_router(router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "DealMind",
        "hindsight_key_set": bool(os.environ.get("HINDSIGHT_API_KEY")),
        "groq_key_set": bool(os.environ.get("GROQ_API_KEY")),
        "groq_model": os.environ.get("GROQ_MODEL", "qwen/qwen3-32b"),
    }
