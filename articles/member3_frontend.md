# Building a Dual-Track AI Simulation in Next.js: Same Deal, Two Outcomes

*Role: Frontend Engineer | Publish to: Medium / Dev.to / Hashnode*

---

The brief was unusual: build a UI that shows the same sales negotiation playing out twice, with two different outcomes — one where the AI coach intervenes and one where it does not.

This is the story of how I built the DealMind simulation page in Next.js, what design decisions I made, and what nearly broke everything.

---

## The Core Concept

The simulation has two independent tracks:

- **Track 1 (With Synapse):** The rep gets Hindsight-backed AI coaching on every turn. The right panel shows which past deal was recalled and what the coaching advice is. The deal is won.
- **Track 2 (Without Synapse):** Same customer messages. No memory. No coaching. The rep repeats classic mistakes. The deal collapses.

The critical product decision was to keep these tracks completely separate. Each plays on its own tab. When one is running, the other tab is disabled. This prevents users from accidentally comparing mid-flight states and keeps the narrative clean.

![DealMind Simulation — With Synapse track showing coaching card, memory recall strip, and Deal Saved result](member3_screenshot1_coached.png)
*The coached track at completion: Hindsight recalled TechVision (WON $340K) and CloudBase (WON $410K) to guide the rep through InfoSec sign-off and pricing. Deal closed at $480K ARR.*

---

## The Message Accumulation Problem

The first version had a serious bug. Messages would disappear as the simulation progressed. The root cause: a React state update pattern that caused the typewriter animation hook to reset the `done` flag, which triggered a visibility toggle back to hidden.

The fix was simple but took an embarrassingly long time to find — make the messages array append-only and decouple the typewriter effect from visibility entirely:

```typescript
const [messages, setMessages] = useState<MsgEntry[]>([]);

// Always append — never replace
setMessages(prev => [...prev, newMessage]);
```

The typewriter effect only controls the displayed text content, never the visibility of the bubble itself. Once a bubble is rendered, it stays rendered permanently. Only the text content animates character by character.

---

## Running Two Tracks Independently

Both tracks run as separate async functions with their own refs:

```typescript
const cPlayingRef = useRef(false); // coached track
const uPlayingRef = useRef(false); // uncoached track

const runCoached = async (idx: number) => { ... };
const runUncoached = async (idx: number) => { ... };
```

Each function checks its own ref on every await — if the ref is false (user paused), it stops. This gives us clean pause/resume without React state timing issues.

The sleep utility respects the user's selected speed:

```typescript
const sleep = (ms: number) =>
  new Promise<void>(r => setTimeout(r, ms / speed));
```

1x, 2x, 3x speed simply divides all delays by the multiplier.

---

## The Coaching Panel — Memory Retrieval Display

The most important UI element is the right panel that shows what Hindsight recalled. In Script mode, we show pre-mapped document IDs:

```typescript
const SCRIPT_MEMORY_REFS: Record<number, string[]> = {
  1: ["dataflow-deal-summary", "meridian-deal-summary"],
  2: ["techvision-deal-summary", "meridian-deal-summary"],
  3: ["cloudbase-deal-summary", "apex-deal-summary"],
};
```

In Live Groq mode, we show the actual `recalled_memories[]` array returned by the backend — the real Hindsight document IDs retrieved for that specific customer message.

Each document ID renders as a coloured pill: red for LOST deals, green for WON deals. At a glance, the user can see whether the agent is recalling cautionary tales or success patterns.

---

## Before / After — Tab Locking

**Before:** Switching tabs while a simulation was running caused both tracks to run simultaneously, message states to collide, and the wrong coaching panel to display.

**After:** The other tab is disabled while the current one is playing:

```typescript
const isDisabled = (t === "coached" ? uPlaying : cPlaying);

style={{
  cursor: isDisabled ? "not-allowed" : "pointer",
  opacity: isDisabled ? 0.4 : 1
}}
```

Clean, simple, no state collision.

![DealMind Simulation — Without Synapse track showing rep mistakes, no memory access, and Deal Lost result](member3_screenshot2_uncoached.png)
*The uncoached track: no Hindsight recall, no coaching card. The right panel shows the exact mistakes — multi-tenant agreed (T1), GDPR unresolved (T2), discounted before InfoSec (T3). Weaviate won the contract.*

---

## One Honest Lesson

I spent two hours trying to build this as a side-by-side split view showing both tracks simultaneously. It looked impressive in my head. In practice, it was impossible to follow — the eye did not know where to go. Switching to a tab-based design with one focused track at a time made the story 10x clearer. For demo-focused UIs, clarity beats cleverness.

---

**GitHub:** https://github.com/grsanudeep42-cmd/dealmind
**Hindsight:** https://github.com/vectorize-io/hindsight
**Demo video:** https://youtu.be/pxUxM-SIMSk
