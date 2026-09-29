# How I Wired Hindsight Memory into a FastAPI Sales Agent in Under 100 Lines

*Role: Backend Engineer*

---

Most AI agents I've built have the same flaw. Every conversation starts from scratch. No memory of what worked last time, no awareness of past failures, nothing connecting the current conversation to a similar one from six months ago.

When we started building DealMind, I decided to fix this at the infrastructure layer rather than bolting something on later. Here's exactly how we wired Vectorize Hindsight into our FastAPI backend to give the sales agent persistent, searchable, cross-deal memory - and what I learned doing it.

---

## The Setup

Our backend is FastAPI. The Hindsight integration lives in a single file called `hindsight_bridge.py` that wraps the three core functions. The import in `deal_agent.py` ends up being pretty clean:

```python
from hindsight_bridge import recall, reflect, retain
```

Three functions. That's the entire memory layer. Everything else builds on top of those three.

---

## Step 1 - Retaining Memories

When a deal closes, we retain its transcript into a named Hindsight bank. Each deal gets its own document ID so we can reference and cite exact sources in the coaching output later.

```python
await retain(
    bank_id="historical-deals",
    document_id="meridian-deal-summary",
    content=deal_transcript_text,
)
```

The `bank_id` is the memory namespace. We use one bank for all historical deals (`historical-deals`) and a separate bank per active deal - so the Acme Corp deal has its own bank (`acme-corp-deal`) that only holds call notes from that deal. Keeping them separate matters a lot. It lets us do two very different recalls depending on what we're looking for.

---

## Step 2 - The Recall Pipeline

This is where it gets interesting. Every time a customer says something during a live deal, we fire two recall calls in parallel:

```python
# Recall from all past deals
history_memories = await recall(
    bank_id="historical-deals",
    query=body.customer_message,
    budget="high",
    max_results=3,
)

# Recall from the current deal's own transcripts
deal_memories = await recall(
    bank_id=body.deal_id,
    query=body.customer_message,
    budget="mid",
    max_results=3,
)
```

First recall searches across the entire company's deal history. Second recall searches only the current deal's call notes. We combine both into the Groq prompt so the agent has cross-deal historical context and current-deal context at the same time.

We also pull out the document IDs of whatever got recalled:

```python
recalled_ids = [
    m.get("document_id") or m.get("doc id") or m.get("id") or "unknown"
    for m in history_memories
]
```

These come back to the frontend so the UI can show exactly which past deal was recalled for each coaching turn. The user sees `meridian-deal-summary (LOST $380K)` and `dataflow-deal-summary (LOST $290K)` show up as coloured pills in real time.

![deal_agent.py - recall() pipeline pulling from historical-deals bank and current deal bank](member2_screenshot1_recall.png)
*Lines 727-751: Two targeted recall() calls - one for all-time historical deals, one for the current deal's own call transcripts. Both feed into the same Groq prompt.*

---

## Step 3 - Groq Takes Over

The recalled memories go straight into the Groq user prompt:

```python
user = (
    f"Customer just said: \"{body.customer_message}\"\n\n"
    f"Conversation so far:\n{conv_text}\n\n"
    f"Historical deal patterns (won/lost):\n{history_context}\n\n"
    f"Current deal memories:\n{deal_context}\n\n"
    "Based on historical patterns, provide coaching for the sales rep."
)
```

Groq generates a structured JSON response - coaching type, reference deal, the pattern from that deal, the advice, and the exact words the rep should say. The whole thing runs in under a second.

![deal_agent.py - Groq system prompt and user prompt with memory context injected](member2_screenshot2_groq.png)
*Lines 759-776: The system prompt defines the JSON output schema. The user prompt injects the recalled historical deal patterns directly before asking Groq to generate coaching.*

---

## Before and After - What Recall Actually Changes

Without the recalled memories in the prompt, Groq gives you generic advice:

```json
{
  "synapse_type": "warning",
  "reference_deal": "General best practice",
  "pattern": "Price negotiations should involve all stakeholders",
  "suggestion": "Make sure InfoSec is aligned before discussing price",
  "coached_reply": "Let me make sure we have full alignment before discussing pricing..."
}
```

With the Meridian Corp memory recalled - the one where we lost $380K because the price was negotiated before InfoSec sign-off - Groq generates something completely different:

```json
{
  "synapse_type": "warning",
  "reference_deal": "Meridian Corp - LOST $380K",
  "pattern": "Rep agreed to a 15% discount in Week 3 before InfoSec gatekeeper Elena Vasquez had been engaged. When Elena joined in Week 5, she blocked the multi-tenant architecture. No leverage left.",
  "suggestion": "Do not discuss pricing until Priya Sharma (InfoSec) has formally signed off.",
  "coached_reply": "Robert, before we talk numbers I want to make sure Priya has everything she needs from our compliance team."
}
```

The model is the same. The prompt structure is the same. The only difference is what's in the memory context. That's the whole point.

---

## The Honest Lesson Here

We initially tried to do everything with one recall call, high `max_results`, pulling everything at once. The coaching got noisy. Too much context made the model unfocused - it would reference irrelevant details and hedge its advice.

Splitting into two targeted recalls (historical + current deal) and capping at 3 results each fixed this almost immediately. Less context, sharper output. It felt counterintuitive at first but it makes sense in hindsight - the model does better when it has specific, relevant examples rather than a pile of loosely related text.

---

**GitHub:** https://github.com/grsanudeep42-cmd/dealmind
**Demo video:** https://youtu.be/pxUxM-SIMSk

Resources on Hindsight and agent memory:
- https://github.com/vectorize-io/hindsight
- https://hindsight.vectorize.io/
- https://vectorize.io/what-is-agent-memory

*Shoutout to [@Code.in](https://code.in) for running this challenge.*
