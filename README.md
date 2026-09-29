# 🧠 DealMind — Enterprise Sales Deal Intelligence Agent

> Built for Hack with Hyderabad 3.0 | Stack: FastAPI · Hindsight Cloud · Groq · Next.js 14

---

## The Core Idea

A sales rep asks: *"What concerns has Priya from InfoSec raised?"*

**Without memory:** Generic answer about common security concerns.

**With DealMind + Hindsight:**
> "📞 Call #2 · Week 3 — Priya raised GDPR data residency (EU-only hard requirement) and AES-256 encryption at rest.
> 📞 Call #4 · Week 7 — Priya escalated to include TLS 1.2 in-transit encryption. Asked for SOC 2 Type II certification.
> ✅ Pre-approved contract amendment AMD-2024-047 already covers all these requirements."

The agent cites the **exact call, exact week, exact person** — from Hindsight's memory.

---

## Architecture

```
Frontend (Next.js :3001)
  └─> /chat        — dual-panel: chat + memory source citations
  └─> /graph       — force-directed entity graph (stakeholders, objections, competitors)
  └─> /observations — Hindsight reflect() synthesis

Backend (FastAPI :8001)
  └─> POST /agent/chat
        ├─ recall(bank_id, query)   → top-5 ranked memories (for citation panel)
        ├─ reflect(bank_id, query)  → agentic synthesised answer
        └─ Groq fallback if reflect empty
  └─> GET /deal/{id}/graph         → entity relationship graph
  └─> GET /deal/{id}/observations  → consolidated deal intelligence
  └─> POST /deal/ingest            → ingest new call transcripts

Memory (Hindsight Cloud — bank: acme-corp-deal)
  └─ retain() on startup for all 5 Acme Corp calls
  └─ recall() TEMPR retrieval (semantic + keyword + graph + temporal)
  └─ reflect() agentic reasoning loop with source citations
```

---

## Seeded Deal

**Acme Corp — Vector DB Platform ($480K ARR)**

| Call | Week | Attendee | Key Events |
|------|------|----------|-----------|
| Call #1 | Week 1 | Dave Chen (VP Eng) | Initial discovery, $480K budget approved, dedicated deployment required |
| Call #2 | Week 3 | Priya Sharma (InfoSec) | GDPR data residency, AES-256 encryption, multi-tenant rejected |
| Call #3 | Week 5 | Dave Chen (VP Eng) | Dedicated VPC agreed, Weaviate mentioned as competitor |
| Call #4 | Week 7 | Priya Sharma (InfoSec) | TLS 1.2 escalation, SOC 2 Type II confirmed, conditional approval |
| Call #5 | Week 9 | Robert Walsh (CFO) | $520K → $480K negotiation, AMD-2024-047 pre-approved |

---

## Running Locally

### Backend
```bash
cd dealmind/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Keys are read from ../../.env (project root)
uvicorn main:app --reload --port 8001
```

Startup automatically seeds all 5 Acme Corp calls into Hindsight.

### Frontend
```bash
cd dealmind/frontend
npm install
npm run dev -- --port 3001
```

Open: http://localhost:3001

---

## Environment Variables

These are read from `/home/anudeep/projects/Hyd Hackathon/.env`:

```
HINDSIGHT_API_KEY=...
HINDSIGHT_BANK_ID=acme-corp-deal   (auto-created on first retain)
GROQ_API_KEY=...
GROQ_MODEL=qwen/qwen3-32b
```

---

## Demo Questions

Navigate to http://localhost:3001 → select Acme Corp deal → Chat tab:

1. `"What concerns has Priya from InfoSec raised?"`
2. `"What is the current deal price and who negotiated it?"`
3. `"Which competitors are being evaluated?"`
4. `"What contract amendments are in place?"`
5. `"Is Priya's encryption concern resolved?"`
6. `"What deployment model did Dave Chen approve?"`

Each answer shows the **memory source panel** on the right — `📞 Call #2 · Priya Sharma · Week 3` etc.
