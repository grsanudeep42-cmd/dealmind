<div align="center">

# 🧠 DealMind

### Enterprise Sales Deal Intelligence — powered by persistent AI memory

[![Hindsight](https://img.shields.io/badge/Memory-Hindsight%20Cloud-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PC9zdmc+)](https://hindsight.vectorize.io)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Groq](https://img.shields.io/badge/LLM-Groq-F55036?style=for-the-badge)](https://groq.com)
[![MongoDB](https://img.shields.io/badge/Graph%20DB-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/atlas)

**Ask anything about a deal. Get the exact answer from the exact call it happened in.**

[Live Demo](#) · [Backend API](https://dealmind-backend.onrender.com/health) · [Hindsight Docs](https://hindsight.vectorize.io)

</div>

---

## The Problem

Enterprise sales reps spend **2+ hours before every customer call** re-reading CRM notes, scrolling Slack threads, and re-watching recordings. They still miss things. Deals slip because context is lost.

## The Solution

DealMind ingests every call transcript into [Hindsight](https://github.com/vectorize-io/hindsight) — a persistent AI memory system. The agent remembers every objection, stakeholder concern, competitive mention, and pricing commitment across the entire deal lifecycle.

---

## Before vs After

A rep asks: *"What concerns has Priya from InfoSec raised?"*

**Without memory (stateless AI):**
> "Security teams typically raise concerns about data privacy, encryption, and compliance..."

**With DealMind + Hindsight:**
> 📞 **Call #2 · Week 3** — Priya raised GDPR data residency (EU-only hard requirement) and AES-256 encryption at rest.
> 📞 **Call #4 · Week 7** — Priya escalated to require TLS 1.2 in-transit. Also confirmed SOC 2 Type II certification needed before sign-off.
> ✅ **AMD-2024-047** already covers all of these — pre-approved in Week 9 commercial review.

**The agent cites the exact call, exact week, exact person — from persistent memory.**

---

## Features

| Feature | What it does |
|---|---|
| 💬 **RAG Chat** | Ask anything → semantic recall → cited answer with memory source cards |
| 🗺️ **Entity Graph** | Force-directed visual map of stakeholders, objections, competitors, amendments |
| 🔗 **Synapse Graph** | Co-retrieval network — shows which calls share semantic context |
| ⚡ **Spreading Activation** | Click a call node → find implicitly related memories via graph traversal |
| 📥 **Live Ingest** | Upload new call transcripts → instantly searchable in all three layers |
| 🧩 **Dual-Deal** | Acme Corp ($480K ARR) + NovaTech ($320K ARR) — switch in one click |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser                                       │
│                   Next.js 15  (Vercel)                                │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │   Chat  + RAG   │  │  Entity  Graph  │  │   Synapse  Memory    │  │
│  │   Citations     │  │  Force-directed │  │   Co-retrieval net   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬───────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────────┘
            │          REST API   │                      │
┌───────────▼─────────────────────▼──────────────────────▼─────────────┐
│                     FastAPI  Backend  (Render)                         │
│                                                                        │
│   deal_agent.py          synapse_graph.py          main.py            │
│   ─────────────          ──────────────            ───────            │
│   /chat → recall()       MongoDB edge store        lifespan seeding   │
│   /graph → entity map    spreading activation      CORS for Vercel    │
│   /ingest → retain()     /associative-graph        /health check      │
└───────────┬──────────────────────┬────────────────────┬──────────────┘
            │                      │                     │
   ┌────────▼────────┐   ┌─────────▼───────┐   ┌────────▼────────┐
   │  Hindsight Cloud │   │  MongoDB Atlas  │   │   Groq LLM API  │
   │                  │   │                 │   │                 │
   │  retain()        │   │  Co-retrieval   │   │  qwen3-32b      │
   │  recall()        │   │  edge weights   │   │  Synthesis +    │
   │  reflect()       │   │  Synapse graph  │   │  generation     │
   └──────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## How Memory Works

```python
# 1. RETAIN — ingest a call transcript at startup (or via /ingest)
await retain(
    bank_id="acme-corp-deal",       # deal-scoped memory bank
    text=call_transcript,
    document_id="acme-call-2",
    metadata={"call_number": 2, "week": 3, "attendees": ["priya-sharma"]}
)

# 2. RECALL — semantic similarity search for any query
memories = await recall(
    bank_id="acme-corp-deal",
    query="What did Priya say about GDPR?",
    max_results=5
)
# → Returns ranked memories with relevance scores + source document_ids

# 3. REFLECT — agentic synthesis across all stored memories
answer = await reflect(
    bank_id="acme-corp-deal",
    query="Summarise all outstanding security objections"
)
# → Hindsight's agent reasons across the full memory bank
```

The **Synapse Graph** tracks co-retrieval edges — when two call memories surface together for the same query, their edge weight increases. This reveals which calls are semantically linked beyond keyword matching.

---

## Seeded Deals

### Acme Corp — $480K ARR

| Call | Week | Attendee | Key Events |
|---|---|---|---|
| #1 | 1 | Dave Chen (VP Eng) | Discovery, $480K budget, dedicated deployment required |
| #2 | 3 | Priya Sharma (InfoSec) | GDPR data residency, AES-256, multi-tenant rejected |
| #3 | 5 | Dave Chen (VP Eng) | Dedicated VPC agreed, Pinecone/Weaviate evaluated |
| #4 | 7 | Priya Sharma (InfoSec) | TLS 1.2, SOC 2 Type II, conditional approval |
| #5 | 9 | Robert Walsh (CFO) | $520K→$480K negotiated, AMD-2024-047 signed |

### NovaTech — $320K ARR

| Call | Week | Attendee | Key Events |
|---|---|---|---|
| #1 | 1 | Marcus Webb (VP Eng) | Initial requirements, Pinecone ruling out |
| #2 | 3 | Sarah Kim (InfoSec) | EU data residency, encryption at rest |
| #3 | 5 | Marcus Webb (VP Eng) | Dedicated VPC architecture, SOC 2 scope |
| #4 | 7 | NovaTech CFO | $320K hard ceiling, budget approval |

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Memory | [Hindsight Cloud](https://hindsight.vectorize.io) | `retain` / `recall` / `reflect` — persistent agent memory |
| Backend | FastAPI + Python 3.11 | Async, typed, production-grade |
| Graph DB | MongoDB Atlas | Co-retrieval edge persistence across sessions |
| LLM | Groq `qwen/qwen3-32b` | Fast inference, function calling, free tier |
| Frontend | Next.js 15 + TypeScript | App Router, React 19, Suspense streaming |
| Graph UI | react-force-graph-2d | WebGL canvas, 60fps force simulation |
| Hosting | Vercel + Render | Zero-config CDN + Docker-based backend |

---

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your API keys
cp .env.example .env

uvicorn main:app --reload --port 8001
# → http://localhost:8001/health
# → Automatically seeds both deals into Hindsight on startup
```

### Frontend

```bash
cd frontend
npm install

# Set backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > .env.local

npm run dev
# → http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `HINDSIGHT_API_KEY` | ✅ | From [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) → API Keys |
| `HINDSIGHT_PIPELINE_ID_ACME` | ✅ | Acme Corp pipeline UUID |
| `HINDSIGHT_PIPELINE_ID_NOVATECH` | ✅ | NovaTech pipeline UUID |
| `GROQ_API_KEY` | ✅ | From [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | ➖ | Default: `qwen/qwen3-32b` |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `FRONTEND_URL` | ➖ | Your Vercel URL (for CORS) |

Get $50 free Hindsight credits with promo code **`MEMHACK99`** at [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io).

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (`http://localhost:8001` locally, Render URL in prod) |

---

## Deploy

### Backend → Render (free tier)

1. Push this repo to GitHub
2. [render.com](https://render.com) → New Web Service → connect repo → Root Directory: `backend`
3. Render auto-detects the `Dockerfile`
4. Set all env vars from `backend/.env.example` in the Render dashboard
5. Deploy → backend live at `https://dealmind-backend.onrender.com`

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL = https://dealmind-backend.onrender.com
```

Or: [vercel.com](https://vercel.com) → Import → `dealmind` repo → Root Directory: `frontend`

---

## Try These Queries

After setup, open the Chat tab and try:

```
"What concerns has Priya from InfoSec raised?"
"Which competitors are being evaluated and by whom?"
"What is the current deal price and how was it negotiated?"
"Is the GDPR requirement resolved? What amendment covers it?"
"What deployment model did Dave Chen agree to?"
"Summarise all objections that are still open"
```

Each answer shows the **Citations panel** → `📞 Call #2 · Priya Sharma · Week 3` with relevance scores and memory excerpts.

---

## Project Structure

```
dealmind/
├── backend/
│   ├── main.py              # FastAPI entry point, CORS, lifespan seeding
│   ├── deal_agent.py        # All route handlers + entity graph builder
│   ├── hindsight_bridge.py  # retain() / recall() / reflect() wrappers
│   ├── synapse_graph.py     # Co-retrieval graph + spreading activation
│   ├── synthetic_data.py    # Acme Corp + NovaTech deal transcripts
│   ├── Dockerfile           # python:3.11-slim production image
│   └── render.yaml          # Render.com deployment config
└── frontend/
    ├── app/
    │   ├── chat/            # RAG chat with citations panel
    │   ├── graph/           # Entity + Synapse graph visualization
    │   ├── observations/    # Agentic deal synthesis
    │   └── components/      # Sidebar, UploadModal, Markdown
    ├── lib/api.ts           # Typed API client
    └── vercel.json          # Vercel rewrite rules
```

---

<div align="center">

Built with [Hindsight](https://github.com/vectorize-io/hindsight) by Vectorize · [Groq](https://groq.com) · [MongoDB Atlas](https://mongodb.com/atlas)

</div>
