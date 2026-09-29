# Memory-Grounded Prompting - How Retrieved Deal History Changes What an LLM Actually Generates

*Role: AI/ML Engineer*

---

There's a misconception I kept running into when we started this project. People treat retrieval-augmented generation like the retrieval step is just a fancier search engine, and the LLM does all the real work.

After building DealMind's coaching engine, I can tell you it's the other way around. The quality of what gets retrieved almost entirely determines the quality of what gets generated. The LLM is pattern completion - it completes the pattern the retrieved context sets up. Give it a vague pattern, you get vague output. Give it a specific, narrative-rich memory, and the output gets specific and narrative-rich too.

Here's what I learned building this.

---

## The Prompt Structure

Every coaching turn in DealMind fires one Groq call. The system prompt defines the agent's role and locks the output format:

```python
system = (
    "You are Synapse, an AI sales coach. You watch live sales conversations "
    "and give the sales rep real-time coaching based on patterns from "
    "past won and lost deals.\n\n"
    "Return ONLY valid JSON - no markdown:\n"
    '{"synapse_type": "warning" or "success", '
    '"reference_deal": "<Deal name and outcome>", '
    '"pattern": "<What happened in that deal - 1-2 sentences>", '
    '"suggestion": "<What the rep should do RIGHT NOW>", '
    '"coached_reply": "<The exact words the rep should say>"}'
)
```

The user prompt is where the retrieved memories go in:

```python
user = (
    f"Customer just said: \"{body.customer_message}\"\n\n"
    f"Conversation so far:\n{conv_text}\n\n"
    f"Historical deal patterns (won/lost):\n{history_context}\n\n"
    f"Current deal memories:\n{deal_context}\n\n"
    "Based on historical patterns, provide coaching for the sales rep."
)
```

`history_context` is the concatenated text of the top 3 recalled historical deal documents. `deal_context` comes from the current deal's own memory bank. Both are labelled clearly in the prompt - that labelling matters more than you'd expect.

![deal_agent.py - Groq system prompt defining JSON output schema and user prompt injecting recalled memory](member4_screenshot1_groqprompt.png)
*Lines 759-776: The system prompt locks Groq into returning structured JSON with 5 fields. The user prompt injects the customer message, conversation history, recalled historical deals, and current deal memories - all in one call.*

---

## How Memory Actually Changes the Output

This is the thing worth paying attention to. Without retrieved memory in the prompt, Groq generates generic coaching:

```json
{
  "synapse_type": "warning",
  "reference_deal": "General best practice",
  "pattern": "Price negotiations should involve all stakeholders",
  "suggestion": "Make sure InfoSec is aligned before discussing price",
  "coached_reply": "Let me make sure we have full alignment before discussing pricing..."
}
```

Fine. Forgettable. Useless in a live negotiation.

With the Meridian Corp memory recalled - $380K lost because the rep agreed to a discount before getting InfoSec sign-off - Groq generates something genuinely useful:

```json
{
  "synapse_type": "warning",
  "reference_deal": "Meridian Corp - LOST $380K",
  "pattern": "Rep agreed to a 15% discount in Week 3 before InfoSec gatekeeper Elena Vasquez had been engaged. When Elena joined in Week 5, she blocked the multi-tenant architecture. No leverage left.",
  "suggestion": "Do not discuss pricing until Priya Sharma (InfoSec) has formally signed off. Lock compliance first, price second.",
  "coached_reply": "Robert, before we talk numbers I want to make sure Priya has everything she needs from our compliance team. Once InfoSec is locked, we can look at commercial terms together."
}
```

Same model. Same output schema. Completely different output. The model is completing the pattern that the Meridian Corp transcript sets up. Without that memory, it has nothing specific to pattern-match against, so it falls back to generic advice.

![DealMind Simulation - Turn 1 coaching card showing Pattern Warning with DataFlow Inc recalled from Hindsight](member4_screenshot2_coachingcard.png)
*Turn 1: Customer asks about multi-tenant architecture. Hindsight recalls DataFlow Inc (LOST $290K) and Meridian Corp (LOST $380K). Groq generates a Pattern Warning with the exact coached reply - all in one API call.*

---

## The Dual-Bank Strategy

We use two separate Hindsight banks. One for all historical deals, one per active deal.

```python
history_memories = await recall(
    bank_id="historical-deals",
    query=body.customer_message,
    budget="high",
    max_results=3,
)

deal_memories = await recall(
    bank_id=body.deal_id,
    query=body.customer_message,
    budget="mid",
    max_results=3,
)
```

`budget="high"` for historical - we want thorough cross-deal search. `budget="mid"` for current deal - faster, we just need recent call notes from this specific deal. The results from both go into clearly labelled sections of the user prompt.

The labelling is not optional. Early on we just dumped both into one block. The model would mix up which context was historical and which was current-deal, and the coaching became inconsistent. Adding explicit headers - "Historical deal patterns (won/lost)" and "Current deal memories" - fixed it almost immediately.

---

## The Thing That Surprised Me Most

I expected prompt engineering to be the hard part. Finding the right system prompt wording, getting the JSON schema to work reliably, handling edge cases in the output parsing.

That stuff was hard, but it wasn't the hardest part. The hardest part was realising how much the quality of the prompt depends on the quality of what's in memory. A beautifully engineered prompt fed garbage memories still produces garbage coaching. You can't engineer your way out of bad data upstream.

If the Meridian Corp transcript just said "lost $380K - compliance issues," no prompt in the world would generate the specific, actionable coaching we needed. The transcript had to include Elena Vasquez's name, the Week 5 timeline, the specific sequence of mistakes. That narrative richness is what the model latches onto.

---

**GitHub:** https://github.com/grsanudeep42-cmd/dealmind
**Demo video:** https://youtu.be/pxUxM-SIMSk

Resources on Hindsight and agent memory:
- https://github.com/vectorize-io/hindsight
- https://hindsight.vectorize.io/
- https://vectorize.io/what-is-agent-memory

*Shoutout to [@Code.in](https://code.in) for running this challenge.*
