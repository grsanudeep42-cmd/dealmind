# We Built an AI Sales Coach That Remembers Every Lost Deal

*Role: Team Lead / Full-Stack | Publish to: Medium / Dev.to / Hashnode*

---

Three months ago, a sales rep on our team lost a $380,000 contract. Not because the product wasn't good enough. Not because the price was wrong. Because she walked into a negotiation and made the exact same mistake our team had made nine months earlier with a different client.

Nobody told her. The memory of that previous deal lived in a CRM note nobody read, in a Slack thread that had been archived, and in the head of a colleague who had since left the company.

That is the problem DealMind was built to solve.

---

## What DealMind Does

DealMind is an AI-powered sales deal intelligence platform. It watches live sales conversations and coaches the rep in real time — not with generic advice, but with specific patterns recalled from past won and lost deals.

The core idea is simple: every sales organization has institutional memory. It is trapped in call recordings, CRM notes, and the minds of experienced reps. DealMind makes that memory accessible at the exact moment it is needed.

When a customer raises a GDPR objection in the middle of a negotiation, DealMind does not give the rep a generic answer. It recalls the three previous deals where that exact objection came up — which ones were handled correctly and which ones were not — and tells the rep what to say.

---

## The Architecture

The platform is built on three layers:

**Layer 1 — Memory (Vectorize Hindsight)**
Every deal transcript is stored in a Hindsight memory bank when the deal closes. Hindsight handles semantic indexing, retrieval, and synthesis. We use three Hindsight functions throughout the app:

- `retain()` — stores a deal transcript as a named memory document
- `recall()` — semantically searches the memory bank given a query
- `reflect()` — synthesises multiple memories into a coherent answer

**Layer 2 — Intelligence (Groq + Qwen 32B)**
When a customer says something during a live deal, the recalled memories are injected into a Groq prompt. Groq generates the coaching card: which past deal is relevant, what the pattern is, and the exact words the rep should say.

**Layer 3 — Interface (Next.js + FastAPI)**
The frontend is a Next.js app with four main sections: Chat (live coaching), Graph (deal relationship map), Insights (risk scoring), and Simulate (the dual-track deal simulation). The backend is a FastAPI service deployed on Render.

---

## The Simulation — Our Centrepiece Demo

The most powerful part of DealMind is the simulation page. We take one real deal — a $480K ARR negotiation with Acme Corp — and run it twice.

**Track 1 (With Synapse):** The rep gets real-time coaching backed by memory of 5 historical deals. The coaching card shows which past deal was recalled and why. The deal is won.

**Track 2 (Without Synapse):** The same customer. The same objections. No memory. The rep repeats three compounding mistakes that lost three previous deals. Weaviate wins the contract. $480K gone.

Same deal. Same rep. Different outcome. That is the entire value proposition.

---

## Before / After

**Before DealMind:**
- Customer raises multi-tenant architecture question
- Rep agrees to explore it (no context from past deals)
- GDPR review later blocks the contract
- Deal lost after 9 weeks

**After DealMind:**
- Customer raises multi-tenant architecture question
- Hindsight recalls DataFlow Inc — lost $290K for this exact reason
- Synapse warns the rep immediately
- Rep redirects to dedicated VPC with compliance framing
- Deal stays on track

---

## One Honest Lesson

We assumed the hardest part would be the AI. It was not. The hardest part was the data. Getting realistic, structured historical deal transcripts that felt real enough to make the coaching meaningful took more time than everything else combined. If you are building a memory-powered agent, invest in your seed data first. The quality of your memories directly determines the quality of your agent's advice.

---

## What Is Next

We are working on connecting DealMind directly to CRM systems so deal transcripts are retained automatically after every call. The goal is zero-friction institutional memory — every rep automatically benefits from every deal the company has ever run.

If you are building AI agents that need to learn from organizational history, Hindsight by Vectorize is worth a look: https://github.com/vectorize-io/hindsight

**GitHub:** https://github.com/grsanudeep42-cmd/dealmind
**Demo video:** https://youtu.be/pxUxM-SIMSk
