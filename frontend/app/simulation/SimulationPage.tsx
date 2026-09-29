"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dealmind-v2bg.onrender.com";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScriptTurn {
  turn: number;
  customer_speaker: string;
  customer_avatar: string;
  customer_message: string;
  synapse_type: "warning" | "success";
  synapse_reference_deal: string;
  synapse_pattern: string;
  synapse_suggestion: string;
  coached_reply: string;
  coaching_outcome: string;
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
  historical_deals: HistoricalDeal[];
}

interface MsgEntry {
  id: string;
  type: "customer" | "rep";
  turnIndex: number;
  text: string;
  speaker: string;
  avatar: string;
  isRep: boolean;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
// Simple approach: always visible (opacity 1). Typewriter only on active msg.

function MessageBubble({
  msg, isActive, coached, onDone,
}: {
  msg: MsgEntry; isActive: boolean; coached?: boolean; onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState(isActive ? "" : msg.text);
  const speedRef = useRef(14);

  useEffect(() => {
    if (!isActive) {
      // Not the active message — show full text immediately
      setDisplayed(msg.text);
      return;
    }
    // Active — type it out
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(msg.text.slice(0, i));
      if (i >= msg.text.length) {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, speedRef.current);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const avatarColors: Record<string, string> = {
    MW: "#3B82F6", PS: "#8B5CF6", RW: "#F59E0B", SR: "#14B8A6",
  };
  const avatarColor = avatarColors[msg.avatar] ?? "#64748B";

  return (
    <div style={{
      display: "flex",
      flexDirection: msg.isRep ? "row-reverse" : "row",
      gap: 10, alignItems: "flex-start",
      opacity: 1,
      animation: "fadeIn 0.25s ease",
    }}>
      <Avatar initials={msg.avatar} color={avatarColor} />
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 4, alignItems: msg.isRep ? "flex-end" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{msg.speaker}</span>
          {coached && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#2DD4BF", background: "rgba(45,212,191,0.12)", padding: "2px 6px", borderRadius: 100 }}>
              SYNAPSE-COACHED
            </span>
          )}
        </div>
        <div style={{
          padding: "10px 13px",
          borderRadius: msg.isRep ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          background: msg.isRep
            ? (coached ? "rgba(45,212,191,0.12)" : "rgba(99,102,241,0.15)")
            : "var(--bg-card)",
          border: msg.isRep
            ? (coached ? "1px solid rgba(45,212,191,0.3)" : "1px solid rgba(99,102,241,0.2)")
            : "1px solid var(--border)",
          fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.65,
        }}>
          {displayed}
          {isActive && displayed.length < msg.text.length && (
            <span style={{ animation: "blink 1s infinite", opacity: 0.7 }}>|</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Coaching Card ─────────────────────────────────────────────────────────────

function CoachingCard({ turn, live }: { turn: ScriptTurn | null; live: boolean }) {
  if (!turn) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-3)" }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="6" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="20" y1="2" x2="20" y2="10" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="20" y1="30" x2="20" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="2" y1="20" x2="10" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
          <line x1="30" y1="20" x2="38" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
        </svg>
        <div style={{ fontSize: 13, textAlign: "center", maxWidth: 200, lineHeight: 1.6 }}>
          Synapse watches the conversation and coaches in real time
        </div>
      </div>
    );
  }

  const isWarning = turn.synapse_type === "warning";
  const accentColor = isWarning ? "#EF4444" : "#22C55E";
  const bgColor = isWarning ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: bgColor, border: `1px solid ${accentColor}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{isWarning ? "⚠️" : "✅"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {isWarning ? "Pattern Warning" : "Best Practice"}
          </span>
          {live && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "#A78BFA", background: "rgba(167,139,250,0.12)", padding: "2px 7px", borderRadius: 100 }}>LIVE</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>{turn.synapse_reference_deal}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.6 }}>{turn.synapse_pattern}</div>
      </div>

      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#818CF8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>💡 Coaching Advice</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65 }}>{turn.synapse_suggestion}</div>
      </div>

      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#2DD4BF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>💬 Suggested Reply</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, fontStyle: "italic" }}>&ldquo;{turn.coached_reply}&rdquo;</div>
      </div>

      {turn.coaching_outcome && (
        <div style={{ fontSize: 11, color: "#22C55E", lineHeight: 1.5, padding: "0 2px" }}>✓ {turn.coaching_outcome}</div>
      )}
    </div>
  );
}

// ── Deal Pills ────────────────────────────────────────────────────────────────

function DealPills({ deals }: { deals: HistoricalDeal[] }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {deals.map((d) => (
        <div key={d.deal_name} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8,
          background: d.outcome === "LOST" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
          border: `1px solid ${d.outcome === "LOST" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
        }}>
          <span style={{ fontSize: 10 }}>{d.outcome === "LOST" ? "✗" : "✓"}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: d.outcome === "LOST" ? "#FCA5A5" : "#86EFAC" }}>{d.deal_name}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{d.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [dealId, setDealId] = useState("acme-corp-deal");
  const [script, setScript] = useState<SimulationScript | null>(null);
  const [loadingScript, setLoadingScript] = useState(true);
  const [error, setError] = useState("");

  // All rendered messages (accumulate, never removed)
  const [messages, setMessages] = useState<MsgEntry[]>([]);
  // ID of the message currently being typed
  const [activeId, setActiveId] = useState<string | null>(null);
  // Which turn's coaching is showing
  const [coachingTurn, setCoachingTurn] = useState<ScriptTurn | null>(null);

  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [liveMode, setLiveMode] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [currentTurnNum, setCurrentTurnNum] = useState<number | null>(null);

  const playingRef = useRef(false);
  const turnRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/simulation/script`)
      .then((r) => r.json())
      .then((d) => { setScript(d); setLoadingScript(false); })
      .catch(() => { setError("Backend warming up — try again in 30s."); setLoadingScript(false); });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeId]);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / speed));

  // Promisified typewriter: resolves when typing finishes
  const typeMessage = (id: string, text: string): Promise<void> => {
    return new Promise((resolve) => {
      setActiveId(id);
      // Use a flag resolved by the bubble's onDone callback
      const check = setInterval(() => {
        // resolved via onDone callback on the bubble
      }, 50);
      // We just wait based on length — simpler and reliable
      setTimeout(() => {
        clearInterval(check);
        setActiveId(null);
        resolve();
      }, (text.length * 14 + 200) / speed);
    });
  };

  const runTurn = async (idx: number) => {
    if (!script || !playingRef.current) return;
    const turn = script.script[idx];
    if (!turn) { setFinished(true); setPlaying(false); return; }

    setCurrentTurnNum(turn.turn);

    // 1. Add + type customer message
    const custId = `cust-${idx}`;
    const custMsg: MsgEntry = {
      id: custId, type: "customer", turnIndex: idx,
      text: turn.customer_message,
      speaker: turn.customer_speaker,
      avatar: turn.customer_avatar,
      isRep: false,
    };
    setMessages((prev) => [...prev, custMsg]);
    await typeMessage(custId, turn.customer_message);
    if (!playingRef.current) return;

    // 2. Show coaching card
    if (liveMode) {
      setLiveLoading(true);
      try {
        const history = script.script.slice(0, idx).flatMap((t) => [
          { role: "customer", content: t.customer_message },
          { role: "rep", content: t.coached_reply },
        ]);
        const res = await fetch(`${API_BASE}/simulation/suggest`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_id: script.deal_id, customer_message: turn.customer_message, conversation_history: history }),
        });
        const data = await res.json();
        setCoachingTurn({ ...turn, synapse_type: data.synapse_type || turn.synapse_type, synapse_reference_deal: data.reference_deal || turn.synapse_reference_deal, synapse_pattern: data.pattern || turn.synapse_pattern, synapse_suggestion: data.suggestion || turn.synapse_suggestion, coached_reply: data.coached_reply || turn.coached_reply });
      } catch { setCoachingTurn(turn); }
      setLiveLoading(false);
    } else {
      setCoachingTurn(turn);
    }

    await sleep(1400);
    if (!playingRef.current) return;

    // 3. Add + type rep reply
    const repId = `rep-${idx}`;
    const repMsg: MsgEntry = {
      id: repId, type: "rep", turnIndex: idx,
      text: turn.coached_reply,
      speaker: "Sarah — Sales Rep",
      avatar: "SR",
      isRep: true,
    };
    setMessages((prev) => [...prev, repMsg]);
    await typeMessage(repId, turn.coached_reply);
    if (!playingRef.current) return;

    await sleep(1000);

    // 4. Next turn
    turnRef.current = idx + 1;
    if (idx + 1 < script.script.length) {
      runTurn(idx + 1);
    } else {
      setFinished(true);
      setPlaying(false);
    }
  };

  const handlePlay = () => {
    if (finished) {
      setMessages([]); setActiveId(null); setCoachingTurn(null);
      setFinished(false); setCurrentTurnNum(null);
      turnRef.current = 0;
    }
    playingRef.current = true;
    setPlaying(true);
    runTurn(turnRef.current);
  };

  const handlePause = () => { playingRef.current = false; setPlaying(false); };

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:1} }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
        <Sidebar dealId={dealId} onDealChange={setDealId} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Deal Simulation</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                {script?.deal_name ?? "Loading…"} · AI-coached · {script?.script.length ?? 0} turns
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setLiveMode(!liveMode)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: liveMode ? "rgba(167,139,250,0.15)" : "var(--bg-card)", border: `1px solid ${liveMode ? "rgba(167,139,250,0.4)" : "var(--border)"}`, color: liveMode ? "#A78BFA" : "var(--text-3)", cursor: "pointer" }}>
                {liveMode ? "⚡ Live Groq" : "📋 Script"}
              </button>
              {[1, 2, 3].map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: speed === s ? "var(--bg-active)" : "var(--bg-card)", border: `1px solid ${speed === s ? "var(--accent)" : "var(--border)"}`, color: speed === s ? "var(--text-1)" : "var(--text-3)", cursor: "pointer" }}>{s}×</button>
              ))}
              <button onClick={playing ? handlePause : handlePlay} disabled={loadingScript} style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: playing ? "rgba(239,68,68,0.15)" : "var(--accent)", border: playing ? "1px solid rgba(239,68,68,0.3)" : "none", color: playing ? "#EF4444" : "#fff", cursor: loadingScript ? "not-allowed" : "pointer", opacity: loadingScript ? 0.5 : 1 }}>
                {finished ? "↩ Restart" : playing ? "⏸ Pause" : messages.length > 0 ? "▶ Resume" : "▶ Play"}
              </button>
            </div>
          </div>

          {/* Memory context bar */}
          {script && (
            <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-muted)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>Memory Context</span>
              <DealPills deals={script.historical_deals} />
            </div>
          )}

          {error && (
            <div style={{ margin: "16px 24px", padding: 14, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#FCA5A5" }}>{error}</div>
          )}

          {/* Split */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Conversation column */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, borderRight: "1px solid var(--border)" }}>

              {messages.length === 0 && !error && (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--text-3)", maxWidth: 320 }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-2)" }}>AI-Coached Sales Simulation</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    Watch Synapse coach the sales rep in real time, drawing on 3 lost deals and 2 won deals to prevent the same mistakes.
                  </div>
                  <div style={{ marginTop: 20, fontSize: 12 }}>
                    Press <strong style={{ color: "var(--text-2)" }}>▶ Play</strong> to begin
                  </div>
                </div>
              )}

              {/* All messages — they accumulate and never disappear */}
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isActive={activeId === msg.id}
                  coached={msg.isRep}
                />
              ))}

              {finished && (
                <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", textAlign: "center", animation: "fadeIn 0.4s ease" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", marginBottom: 4 }}>Deal Saved!</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                    Synapse coaching avoided 2 deal-killing mistakes from past lost deals.<br/>
                    AMD-2024-047 signed · Close call scheduled · $480K ARR secured.
                  </div>
                </div>
              )}
            </div>

            {/* Coaching panel */}
            <div style={{ width: 320, flexShrink: 0, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: playing ? "#22C55E" : "var(--text-3)", boxShadow: playing ? "0 0 6px #22C55E" : "none", animation: playing ? "pulse 1.5s infinite" : "none" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>Synapse Coach</span>
                {currentTurnNum !== null && script && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>Turn {currentTurnNum}/{script.script.length}</span>
                )}
              </div>

              {liveLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[80, 55, 90, 65].map((w, i) => (
                    <div key={i} style={{ height: 13, borderRadius: 7, background: "var(--border)", width: `${w}%`, animation: "pulse 1.2s infinite" }} />
                  ))}
                  <div style={{ fontSize: 11, color: "#A78BFA", marginTop: 4 }}>⚡ Groq analysing pattern…</div>
                </div>
              ) : (
                <CoachingCard turn={coachingTurn} live={liveMode} />
              )}

              {/* Progress bar */}
              {script && (
                <div style={{ display: "flex", gap: 5, marginTop: "auto", paddingTop: 12 }}>
                  {script.script.map((t) => {
                    const done = messages.some((m) => m.type === "rep" && m.turnIndex === t.turn - 1);
                    const active = currentTurnNum === t.turn;
                    return (
                      <div key={t.turn} style={{ flex: 1, height: 3, borderRadius: 2, background: done ? "#22C55E" : active ? "#A78BFA" : "var(--border)", transition: "background 0.4s" }} />
                    );
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
