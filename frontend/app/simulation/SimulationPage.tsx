"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18, active = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, speed]);

  return { displayed, done };
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
      letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

// ── Coaching Card ─────────────────────────────────────────────────────────────

function CoachingCard({ turn, live }: { turn: ScriptTurn | null; live: boolean }) {
  if (!turn) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 12, color: "var(--text-3)",
      }}>
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
  const icon = isWarning ? "⚠️" : "✅";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.3s ease" }}>
      <div style={{ padding: "10px 14px", borderRadius: 10, background: bgColor, border: `1px solid ${accentColor}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {isWarning ? "Pattern Warning" : "Best Practice"}
          </span>
          {live && (
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "#A78BFA", background: "rgba(167,139,250,0.12)", padding: "2px 7px", borderRadius: 100 }}>LIVE</span>
          )}
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

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  speaker, avatar, avatarColor, message, isRep, coached, active, onDone,
}: {
  speaker: string; avatar: string; avatarColor: string; message: string;
  isRep: boolean; coached?: boolean; active: boolean; onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(message, 14, active);
  useEffect(() => { if (done && onDone) onDone(); }, [done, onDone]);

  return (
    <div style={{
      display: "flex", flexDirection: isRep ? "row-reverse" : "row",
      gap: 10, alignItems: "flex-start",
      opacity: active || done ? 1 : 0,
      transform: active || done ? "none" : "translateY(8px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      <Avatar initials={avatar} color={avatarColor} />
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 4, alignItems: isRep ? "flex-end" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{speaker}</span>
          {coached && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#2DD4BF", background: "rgba(45,212,191,0.12)", padding: "2px 6px", borderRadius: 100, letterSpacing: "0.04em" }}>
              SYNAPSE-COACHED
            </span>
          )}
        </div>
        <div style={{
          padding: "10px 13px",
          borderRadius: isRep ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          background: isRep ? (coached ? "rgba(45,212,191,0.12)" : "rgba(99,102,241,0.15)") : "var(--bg-card)",
          border: isRep ? (coached ? "1px solid rgba(45,212,191,0.3)" : "1px solid rgba(99,102,241,0.2)") : "1px solid var(--border)",
          fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.65,
        }}>
          {active ? displayed : message}
          {active && !done && <span style={{ animation: "blink 1s infinite", opacity: 0.7 }}>|</span>}
        </div>
      </div>
    </div>
  );
}

// ── Historical Deal Pills ──────────────────────────────────────────────────────

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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const router = useRouter();
  const [dealId, setDealId] = useState("acme-corp-deal");

  const [script, setScript] = useState<SimulationScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [visibleMessages, setVisibleMessages] = useState<{ id: string; type: "customer" | "rep"; turnIndex: number }[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [done, setDone] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveCoaching, setLiveCoaching] = useState<ScriptTurn | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false);
  const turnIndexRef = useRef(0);

  useEffect(() => {
    fetch(`${API_BASE}/simulation/script`)
      .then((r) => r.json())
      .then((d) => { setScript(d); setLoading(false); })
      .catch(() => { setError("Failed to load simulation. Backend may be warming up — try again in 30s."); setLoading(false); });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, activeMessageId]);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms / speed));

  const runTurn = async (turnIdx: number) => {
    if (!script || !playingRef.current) return;
    const turn = script.script[turnIdx];
    if (!turn) { setDone(true); setPlaying(false); return; }

    setCurrentTurn(turn.turn);

    // Show customer message
    const custId = `cust-${turnIdx}`;
    setVisibleMessages((prev) => [...prev, { id: custId, type: "customer", turnIndex: turnIdx }]);
    setActiveMessageId(custId);
    await delay(turn.customer_message.length * 14 + 600);
    if (!playingRef.current) return;

    // Coaching (live or script)
    if (liveMode) {
      setLiveLoading(true);
      try {
        const convHistory = script.script.slice(0, turnIdx).flatMap((t) => [
          { role: "customer", content: t.customer_message },
          { role: "rep", content: t.coached_reply },
        ]);
        const res = await fetch(`${API_BASE}/simulation/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_id: script.deal_id, customer_message: turn.customer_message, conversation_history: convHistory }),
        });
        const data = await res.json();
        setLiveCoaching({ ...turn, synapse_type: data.synapse_type || turn.synapse_type, synapse_reference_deal: data.reference_deal || turn.synapse_reference_deal, synapse_pattern: data.pattern || turn.synapse_pattern, synapse_suggestion: data.suggestion || turn.synapse_suggestion, coached_reply: data.coached_reply || turn.coached_reply });
      } catch { setLiveCoaching(turn); }
      setLiveLoading(false);
    }

    await delay(1400);
    if (!playingRef.current) return;

    // Show rep reply
    const repId = `rep-${turnIdx}`;
    setVisibleMessages((prev) => [...prev, { id: repId, type: "rep", turnIndex: turnIdx }]);
    setActiveMessageId(repId);
    await delay(turn.coached_reply.length * 14 + 900);
    if (!playingRef.current) return;

    setActiveMessageId(null);
    await delay(900);

    turnIndexRef.current = turnIdx + 1;
    if (turnIdx + 1 < script.script.length) {
      runTurn(turnIdx + 1);
    } else {
      setDone(true);
      setPlaying(false);
    }
  };

  const handlePlay = () => {
    if (done) {
      setVisibleMessages([]); setActiveMessageId(null);
      setCurrentTurn(null); setDone(false);
      turnIndexRef.current = 0; setLiveCoaching(null);
    }
    playingRef.current = true;
    setPlaying(true);
    runTurn(turnIndexRef.current);
  };

  const handlePause = () => { playingRef.current = false; setPlaying(false); };

  const currentCoachingTurn = liveMode
    ? liveCoaching
    : currentTurn !== null && script
      ? script.script.find((t) => t.turn === currentTurn) ?? null
      : null;

  const avatarColors: Record<string, string> = { MW: "#3B82F6", PS: "#8B5CF6", RW: "#F59E0B", SR: "#14B8A6" };

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <Sidebar dealId={dealId} onDealChange={(id) => setDealId(id)} />

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Deal Simulation</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                {script?.deal_name ?? "Loading…"} · AI-coached conversation · {script?.script.length ?? 0} turns
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setLiveMode(!liveMode)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: liveMode ? "rgba(167,139,250,0.15)" : "var(--bg-card)", border: `1px solid ${liveMode ? "rgba(167,139,250,0.4)" : "var(--border)"}`, color: liveMode ? "#A78BFA" : "var(--text-3)", cursor: "pointer" }}>
                {liveMode ? "⚡ Live Groq" : "📋 Script"}
              </button>
              {[1, 2, 3].map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: speed === s ? "var(--bg-active)" : "var(--bg-card)", border: `1px solid ${speed === s ? "var(--accent)" : "var(--border)"}`, color: speed === s ? "var(--text-1)" : "var(--text-3)", cursor: "pointer" }}>{s}×</button>
              ))}
              <button onClick={playing ? handlePause : handlePlay} style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: playing ? "rgba(239,68,68,0.15)" : "var(--accent)", border: playing ? "1px solid rgba(239,68,68,0.3)" : "none", color: playing ? "#EF4444" : "#fff", cursor: "pointer" }}>
                {done ? "↩ Restart" : playing ? "⏸ Pause" : visibleMessages.length > 0 ? "▶ Resume" : "▶ Play"}
              </button>
            </div>
          </div>

          {/* Memory context bar */}
          {script && (
            <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-muted)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "rgba(255,255,255,0.01)" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>Memory Context</span>
              <DealPills deals={script.historical_deals} />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ margin: 24, padding: 16, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#FCA5A5" }}>{error}</div>
          )}

          {/* Split: conversation + coaching */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Conversation */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, borderRight: "1px solid var(--border)" }}>
              {visibleMessages.length === 0 && !error && (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--text-3)", maxWidth: 320 }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-2)" }}>AI-Coached Sales Simulation</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    Watch Synapse coach the sales rep in real time, drawing on 3 lost and 2 won deals to prevent the same mistakes.
                  </div>
                  <div style={{ marginTop: 20, fontSize: 12, color: "var(--text-3)" }}>Press <strong style={{ color: "var(--text-2)" }}>▶ Play</strong> to begin</div>
                </div>
              )}

              {visibleMessages.map((msg) => {
                const turn = script!.script[msg.turnIndex];
                if (msg.type === "customer") {
                  return <MessageBubble key={msg.id} speaker={turn.customer_speaker} avatar={turn.customer_avatar} avatarColor={avatarColors[turn.customer_avatar] ?? "#64748B"} message={turn.customer_message} isRep={false} active={activeMessageId === msg.id} />;
                }
                return <MessageBubble key={msg.id} speaker="Sarah — Sales Rep" avatar="SR" avatarColor={avatarColors.SR} message={turn.coached_reply} isRep={true} coached={true} active={activeMessageId === msg.id} />;
              })}

              {done && (
                <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🎉</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", marginBottom: 4 }}>Deal Saved!</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                    Synapse coaching avoided 2 deal-killing mistakes from past lost deals.<br/>
                    AMD-2024-047 pre-signed. Commercial close scheduled. $480K ARR secured.
                  </div>
                </div>
              )}
            </div>

            {/* Coaching panel */}
            <div style={{ width: 320, flexShrink: 0, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: playing ? "#22C55E" : "var(--text-3)", boxShadow: playing ? "0 0 6px #22C55E" : "none", animation: playing ? "pulse 1.5s infinite" : "none" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>Synapse Coach</span>
                {currentTurn !== null && script && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>Turn {currentTurn}/{script.script.length}</span>
                )}
              </div>

              {liveLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[80, 60, 90].map((w, i) => (
                    <div key={i} style={{ height: 14, borderRadius: 7, background: "var(--border)", width: `${w}%`, animation: "pulse 1s infinite" }} />
                  ))}
                  <div style={{ fontSize: 11, color: "#A78BFA", marginTop: 4 }}>⚡ Groq analysing pattern…</div>
                </div>
              ) : (
                <CoachingCard turn={currentCoachingTurn} live={liveMode} />
              )}

              {script && script.script.length > 0 && (
                <div style={{ display: "flex", gap: 5, marginTop: "auto", paddingTop: 12 }}>
                  {script.script.map((t) => {
                    const isComplete = visibleMessages.some((m) => m.turnIndex === t.turn - 1 && m.type === "rep");
                    const isCurrent = currentTurn === t.turn;
                    return (
                      <div key={t.turn} style={{ flex: 1, height: 3, borderRadius: 2, background: isComplete ? "#22C55E" : isCurrent ? "#A78BFA" : "var(--border)", transition: "background 0.4s ease" }} />
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
