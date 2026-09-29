"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dealmind-v2bg.onrender.com";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScriptTurn {
  turn: number;
  customer_speaker: string;
  customer_avatar: string;
  customer_message: string;
  // coached track
  synapse_type?: "warning" | "success";
  synapse_reference_deal?: string;
  synapse_pattern?: string;
  synapse_suggestion?: string;
  coached_reply?: string;
  coaching_outcome?: string;
  // uncoached track
  rep_reply?: string;
  rep_mistake?: string;
}

interface HistoricalDeal {
  deal_name: string;
  value: string;
  outcome: "LOST" | "WON";
  reason: string;
}

interface SimulationScript {
  deal_id: string;
  deal_name: string;
  script: ScriptTurn[];
  uncoached_script: ScriptTurn[];
  historical_deals: HistoricalDeal[];
}

interface MsgEntry {
  id: string;
  type: "customer" | "rep";
  text: string;
  speaker: string;
  avatar: string;
  isRep: boolean;
  isMistake?: boolean;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  MW: "#3B82F6", PS: "#8B5CF6", RW: "#F59E0B", SR: "#14B8A6",
};

function Avatar({ initials }: { initials: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: AVATAR_COLORS[initials] ?? "#64748B",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isActive }: { msg: MsgEntry; isActive: boolean }) {
  const [displayed, setDisplayed] = useState(isActive ? "" : msg.text);

  useEffect(() => {
    if (!isActive) { setDisplayed(msg.text); return; }
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(msg.text.slice(0, i));
      if (i >= msg.text.length) clearInterval(iv);
    }, 13);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div style={{
      display: "flex", flexDirection: msg.isRep ? "row-reverse" : "row",
      gap: 8, alignItems: "flex-start", opacity: 1,
      animation: "fadeIn 0.25s ease",
    }}>
      <Avatar initials={msg.avatar} />
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: 3, alignItems: msg.isRep ? "flex-end" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 500 }}>{msg.speaker}</span>
          {msg.isRep && !msg.isMistake && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#2DD4BF", background: "rgba(45,212,191,0.12)", padding: "1px 6px", borderRadius: 100 }}>SYNAPSE</span>
          )}
          {msg.isMistake && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.12)", padding: "1px 6px", borderRadius: 100 }}>MISTAKE</span>
          )}
        </div>
        <div style={{
          padding: "9px 12px",
          borderRadius: msg.isRep ? "12px 3px 12px 12px" : "3px 12px 12px 12px",
          background: msg.isRep
            ? (msg.isMistake ? "rgba(239,68,68,0.1)" : "rgba(45,212,191,0.1)")
            : "var(--bg-card)",
          border: msg.isRep
            ? (msg.isMistake ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(45,212,191,0.25)")
            : "1px solid var(--border)",
          fontSize: 12, color: "var(--text-1)", lineHeight: 1.65,
        }}>
          {displayed}
          {isActive && displayed.length < msg.text.length && (
            <span style={{ animation: "blink 1s infinite", opacity: 0.6 }}>|</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Coaching Card ──────────────────────────────────────────────────────────────

function CoachingCard({ turn }: { turn: ScriptTurn | null }) {
  if (!turn) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-3)" }}>
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="6" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="20" y1="2" x2="20" y2="10" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="20" y1="30" x2="20" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="2" y1="20" x2="10" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="30" y1="20" x2="38" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
        </svg>
        <div style={{ fontSize: 12, textAlign: "center", maxWidth: 180, lineHeight: 1.6 }}>Synapse monitors and coaches each turn</div>
      </div>
    );
  }

  const isWarn = turn.synapse_type === "warning";
  const ac = isWarn ? "#EF4444" : "#22C55E";
  const bg = isWarn ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "10px 13px", borderRadius: 10, background: bg, border: `1px solid ${ac}28` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <span>{isWarn ? "⚠️" : "✅"}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: ac, letterSpacing: "0.05em", textTransform: "uppercase" }}>{isWarn ? "Pattern Warning" : "Best Practice"}</span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 3 }}>{turn.synapse_reference_deal}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>{turn.synapse_pattern}</div>
      </div>
      <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#818CF8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>💡 Advice</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.65 }}>{turn.synapse_suggestion}</div>
      </div>
      <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.18)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#2DD4BF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>💬 Suggested Reply</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.65, fontStyle: "italic" }}>&ldquo;{turn.coached_reply}&rdquo;</div>
      </div>
      {turn.coaching_outcome && (
        <div style={{ fontSize: 11, color: "#22C55E" }}>✓ {turn.coaching_outcome}</div>
      )}
    </div>
  );
}

// ── Mistake Card (uncoached panel) ─────────────────────────────────────────────

function MistakeCard({ turn }: { turn: ScriptTurn | null }) {
  if (!turn) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-3)" }}>
        <div style={{ fontSize: 28 }}>🚫</div>
        <div style={{ fontSize: 12, textAlign: "center", maxWidth: 180, lineHeight: 1.6 }}>No AI coach — the rep is on their own</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#EF4444", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>❌ Rep Mistake</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.6 }}>{turn.rep_mistake}</div>
      </div>
      <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.15)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>😰 What the rep actually said</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.65, fontStyle: "italic" }}>&ldquo;{turn.rep_reply}&rdquo;</div>
      </div>
      <div style={{ padding: "8px 13px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <div style={{ fontSize: 11, color: "#FCA5A5", lineHeight: 1.6 }}>
          ⚠️ No memory recall. No pattern match. No coaching. The rep is repeating a mistake that lost 3 past deals.
        </div>
      </div>
    </div>
  );
}

// ── Deal Pills ──────────────────────────────────────────────────────────────────

function DealPills({ deals }: { deals: HistoricalDeal[] }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {deals.map((d) => (
        <div key={d.deal_name} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7,
          background: d.outcome === "LOST" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
          border: `1px solid ${d.outcome === "LOST" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
        }}>
          <span style={{ fontSize: 9.5 }}>{d.outcome === "LOST" ? "✗" : "✓"}</span>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: d.outcome === "LOST" ? "#FCA5A5" : "#86EFAC" }}>{d.deal_name}</div>
            <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{d.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Conversation Column ────────────────────────────────────────────────────────

function ConversationCol({
  messages, activeId, done, isCoached, scrollRef,
}: {
  messages: MsgEntry[];
  activeId: string | null;
  done: boolean;
  isCoached: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      {messages.length === 0 && (
        <div style={{ margin: "auto", textAlign: "center", color: "var(--text-3)", maxWidth: 280 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{isCoached ? "🤖" : "😰"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-2)" }}>
            {isCoached ? "With Synapse AI Coach" : "Without Synapse"}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--text-3)" }}>
            {isCoached
              ? "The rep gets real-time coaching from memory of 3 lost + 2 won deals."
              : "No AI. The rep repeats the same mistakes that lost 3 previous deals."}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} isActive={activeId === msg.id} />
      ))}

      {done && isCoached && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🎉</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", marginBottom: 4 }}>Deal Saved — $480K ARR</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            AMD-2024-047 signed · InfoSec approved · Commercial close scheduled
          </div>
        </div>
      )}

      {done && !isCoached && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>💸</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 6 }}>Deal Lost — $480K ARR Gone</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7 }}>
            3 compounding mistakes · Multi-tenant agreed in Turn 1 · GDPR left unresolved · Price discounted without InfoSec sign-off<br/>
            <span style={{ color: "#FCA5A5", fontWeight: 600 }}>Weaviate won the contract.</span>
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div style={{ fontSize: 10.5, color: "#FCA5A5" }}>These exact mistakes lost: DataFlow Inc ($290K) · Meridian Corp ($380K) · Apex Systems ($520K)</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Track = "coached" | "uncoached";

export default function SimulationPage() {
  const [dealId, setDealId] = useState("acme-corp-deal");
  const [script, setScript] = useState<SimulationScript | null>(null);
  const [loadingScript, setLoadingScript] = useState(true);
  const [error, setError] = useState("");

  // Active track
  const [track, setTrack] = useState<Track>("coached");

  // Coached track state
  const [coachedMsgs, setCoachedMsgs] = useState<MsgEntry[]>([]);
  const [coachedActiveId, setCoachedActiveId] = useState<string | null>(null);
  const [coachedCoaching, setCoachedCoaching] = useState<ScriptTurn | null>(null);
  const [coachedDone, setCoachedDone] = useState(false);
  const [coachedTurnNum, setCoachedTurnNum] = useState<number | null>(null);

  // Uncoached track state
  const [uncoachedMsgs, setUncoachedMsgs] = useState<MsgEntry[]>([]);
  const [uncoachedActiveId, setUncoachedActiveId] = useState<string | null>(null);
  const [uncoachedMistake, setUncoachedMistake] = useState<ScriptTurn | null>(null);
  const [uncoachedDone, setUncoachedDone] = useState(false);
  const [uncoachedTurnNum, setUncoachedTurnNum] = useState<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const playingRef = useRef(false);
  const coachedTurnRef = useRef(0);
  const uncoachedTurnRef = useRef(0);
  const coachedScrollRef = useRef<HTMLDivElement>(null!);
  const uncoachedScrollRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    fetch(`${API_BASE}/simulation/script`)
      .then((r) => r.json())
      .then((d) => { setScript(d); setLoadingScript(false); })
      .catch(() => { setError("Backend warming up — try again in 30s."); setLoadingScript(false); });
  }, []);

  useEffect(() => {
    if (coachedScrollRef.current) coachedScrollRef.current.scrollTop = coachedScrollRef.current.scrollHeight;
  }, [coachedMsgs, coachedActiveId]);

  useEffect(() => {
    if (uncoachedScrollRef.current) uncoachedScrollRef.current.scrollTop = uncoachedScrollRef.current.scrollHeight;
  }, [uncoachedMsgs, uncoachedActiveId]);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / speed));

  const typeMsg = (text: string): Promise<void> =>
    new Promise((r) => setTimeout(r, (text.length * 13 + 300) / speed));

  // Coached track runner
  const runCoached = async (idx: number) => {
    if (!script || !playingRef.current) return;
    const turn = script.script[idx];
    if (!turn) { setCoachedDone(true); setPlaying(false); return; }

    setCoachedTurnNum(turn.turn);

    const custId = `c-cust-${idx}`;
    setCoachedMsgs((p) => [...p, { id: custId, type: "customer", text: turn.customer_message, speaker: turn.customer_speaker, avatar: turn.customer_avatar, isRep: false }]);
    setCoachedActiveId(custId);
    await typeMsg(turn.customer_message);
    if (!playingRef.current) return;
    setCoachedActiveId(null);

    setCoachedCoaching(turn);
    await sleep(1200);
    if (!playingRef.current) return;

    const repId = `c-rep-${idx}`;
    const repText = turn.coached_reply ?? "";
    setCoachedMsgs((p) => [...p, { id: repId, type: "rep", text: repText, speaker: "Sarah — Sales Rep", avatar: "SR", isRep: true, isMistake: false }]);
    setCoachedActiveId(repId);
    await typeMsg(repText);
    if (!playingRef.current) return;
    setCoachedActiveId(null);

    await sleep(900);
    coachedTurnRef.current = idx + 1;
    if (idx + 1 < script.script.length) runCoached(idx + 1);
    else { setCoachedDone(true); setPlaying(false); }
  };

  // Uncoached track runner
  const runUncoached = async (idx: number) => {
    if (!script || !playingRef.current) return;
    const turn = script.uncoached_script[idx];
    if (!turn) { setUncoachedDone(true); return; }

    setUncoachedTurnNum(turn.turn);

    const custId = `u-cust-${idx}`;
    setUncoachedMsgs((p) => [...p, { id: custId, type: "customer", text: turn.customer_message, speaker: turn.customer_speaker, avatar: turn.customer_avatar, isRep: false }]);
    setUncoachedActiveId(custId);
    await typeMsg(turn.customer_message);
    if (!playingRef.current) return;
    setUncoachedActiveId(null);

    setUncoachedMistake(turn);
    await sleep(1200);
    if (!playingRef.current) return;

    const repId = `u-rep-${idx}`;
    const repText = turn.rep_reply ?? "";
    setUncoachedMsgs((p) => [...p, { id: repId, type: "rep", text: repText, speaker: "Sarah — Sales Rep (no AI)", avatar: "SR", isRep: true, isMistake: true }]);
    setUncoachedActiveId(repId);
    await typeMsg(repText);
    if (!playingRef.current) return;
    setUncoachedActiveId(null);

    await sleep(900);
    uncoachedTurnRef.current = idx + 1;
    if (idx + 1 < script.uncoached_script.length) runUncoached(idx + 1);
    else setUncoachedDone(true);
  };

  const handlePlay = () => {
    if (coachedDone || uncoachedDone) {
      // Restart both
      setCoachedMsgs([]); setCoachedActiveId(null); setCoachedCoaching(null);
      setCoachedDone(false); setCoachedTurnNum(null); coachedTurnRef.current = 0;
      setUncoachedMsgs([]); setUncoachedActiveId(null); setUncoachedMistake(null);
      setUncoachedDone(false); setUncoachedTurnNum(null); uncoachedTurnRef.current = 0;
    }
    playingRef.current = true;
    setPlaying(true);
    runCoached(coachedTurnRef.current);
    runUncoached(uncoachedTurnRef.current);
  };

  const handlePause = () => { playingRef.current = false; setPlaying(false); };

  const isFinished = coachedDone && uncoachedDone;
  const activeScript = track === "coached" ? script?.script : script?.uncoached_script;
  const currentTurnNum = track === "coached" ? coachedTurnNum : uncoachedTurnNum;

  return (
    <>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:1}}
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
        <Sidebar dealId={dealId} onDealChange={setDealId} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Header ── */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Deal Simulation</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                {script?.deal_name ?? "Loading…"} · Same deal · Two outcomes
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Speed */}
              {[1, 2, 3].map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{ padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: speed === s ? "var(--bg-active)" : "var(--bg-card)", border: `1px solid ${speed === s ? "var(--accent)" : "var(--border)"}`, color: speed === s ? "var(--text-1)" : "var(--text-3)", cursor: "pointer" }}>{s}×</button>
              ))}
              <button onClick={playing ? handlePause : handlePlay} disabled={loadingScript} style={{ padding: "7px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: playing ? "rgba(239,68,68,0.15)" : "var(--accent)", border: playing ? "1px solid rgba(239,68,68,0.3)" : "none", color: playing ? "#EF4444" : "#fff", cursor: loadingScript ? "not-allowed" : "pointer", opacity: loadingScript ? 0.5 : 1 }}>
                {isFinished ? "↩ Restart" : playing ? "⏸ Pause" : coachedMsgs.length > 0 ? "▶ Resume" : "▶ Play"}
              </button>
            </div>
          </div>

          {/* ── Memory context ── */}
          {script && (
            <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border-muted)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>Memory</span>
              <DealPills deals={script.historical_deals} />
            </div>
          )}

          {error && (
            <div style={{ margin: "12px 20px", padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#FCA5A5" }}>{error}</div>
          )}

          {/* ── 50/50 result bar (shown when both done) ── */}
          {isFinished && (
            <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border-muted)", display: "flex", alignItems: "center", gap: 0, flexShrink: 0, animation: "fadeIn 0.5s ease" }}>
              <div style={{ flex: 1, padding: "8px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px 0 0 10px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22C55E" }}>🤖 With Synapse</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#22C55E" }}>$480K WON</div>
              </div>
              <div style={{ padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "none", borderRight: "none", textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-3)" }}>50 / 50</div>
                <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>same deal · different outcome</div>
              </div>
              <div style={{ flex: 1, padding: "8px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0 10px 10px 0", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444" }}>😰 Without Synapse</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#EF4444" }}>$480K LOST</div>
              </div>
            </div>
          )}

          {/* ── Track toggle (mobile-style tabs) ── */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {(["coached", "uncoached"] as Track[]).map((t) => {
              const isActive = track === t;
              const label = t === "coached" ? "🤖 With Synapse — Deal Saved" : "😰 Without Synapse — Deal Lost";
              const color = t === "coached" ? "#22C55E" : "#EF4444";
              return (
                <button key={t} onClick={() => setTrack(t)} style={{
                  flex: 1, padding: "10px 16px", fontSize: 12, fontWeight: 600,
                  background: isActive ? (t === "coached" ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)") : "none",
                  border: "none", borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                  color: isActive ? color : "var(--text-3)", cursor: "pointer", transition: "all 0.15s",
                }}>{label}</button>
              );
            })}
          </div>

          {/* ── Split: conversation + coaching ── */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Conversation */}
            <div style={{ flex: 1, overflow: "hidden", borderRight: "1px solid var(--border)" }}>
              {track === "coached" ? (
                <ConversationCol messages={coachedMsgs} activeId={coachedActiveId} done={coachedDone} isCoached={true} scrollRef={coachedScrollRef} />
              ) : (
                <ConversationCol messages={uncoachedMsgs} activeId={uncoachedActiveId} done={uncoachedDone} isCoached={false} scrollRef={uncoachedScrollRef} />
              )}
            </div>

            {/* Coaching / Mistake panel */}
            <div style={{ width: 300, flexShrink: 0, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: playing ? (track === "coached" ? "#22C55E" : "#EF4444") : "var(--text-3)", boxShadow: playing ? `0 0 5px ${track === "coached" ? "#22C55E" : "#EF4444"}` : "none", animation: playing ? "pulse 1.5s infinite" : "none" }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2)" }}>
                  {track === "coached" ? "Synapse Coach" : "No Coach"}
                </span>
                {currentTurnNum !== null && activeScript && (
                  <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-3)" }}>Turn {currentTurnNum}/{activeScript.length}</span>
                )}
              </div>

              {track === "coached"
                ? <CoachingCard turn={coachedCoaching} />
                : <MistakeCard turn={uncoachedMistake} />
              }

              {/* Progress dots */}
              {activeScript && (
                <div style={{ display: "flex", gap: 4, marginTop: "auto", paddingTop: 10 }}>
                  {activeScript.map((t, i) => {
                    const msgs = track === "coached" ? coachedMsgs : uncoachedMsgs;
                    const done = msgs.some((m) => m.type === "rep" && m.id.includes(`-${i}`));
                    const active = currentTurnNum === t.turn;
                    const doneColor = track === "coached" ? "#22C55E" : "#EF4444";
                    return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: done ? doneColor : active ? "#A78BFA" : "var(--border)", transition: "background 0.4s" }} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
