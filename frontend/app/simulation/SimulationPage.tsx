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
  synapse_type?: "warning" | "success";
  synapse_reference_deal?: string;
  synapse_pattern?: string;
  synapse_suggestion?: string;
  coached_reply?: string;
  coaching_outcome?: string;
  recalled_memories?: string[];
  rep_reply?: string;
  rep_mistake?: string;
}

interface HistoricalDeal {
  deal_name: string; value: string; outcome: "LOST" | "WON"; reason: string;
}

interface SimulationScript {
  deal_id: string; deal_name: string;
  script: ScriptTurn[];
  uncoached_script: ScriptTurn[];
  historical_deals: HistoricalDeal[];
}

interface MsgEntry {
  id: string; text: string; speaker: string; avatar: string;
  isRep: boolean; isMistake?: boolean;
}

// Scripted memory refs per turn (shown in Script mode)
const SCRIPT_MEMORY_REFS: Record<number, string[]> = {
  1: ["dataflow-deal-summary", "meridian-deal-summary"],
  2: ["techvision-deal-summary", "meridian-deal-summary"],
  3: ["meridian-deal-summary", "techvision-deal-summary"],
  4: ["cloudbase-deal-summary", "apex-deal-summary"],
  5: ["techvision-deal-summary", "cloudbase-deal-summary"],
};

const DOC_LABEL: Record<string, string> = {
  "meridian-deal-summary":   "Meridian Corp (LOST $380K)",
  "apex-deal-summary":       "Apex Systems (LOST $520K)",
  "dataflow-deal-summary":   "DataFlow Inc (LOST $290K)",
  "techvision-deal-summary": "TechVision Ltd (WON $340K)",
  "cloudbase-deal-summary":  "CloudBase Inc (WON $410K)",
};

const DOC_OUTCOME: Record<string, "LOST" | "WON"> = {
  "meridian-deal-summary": "LOST", "apex-deal-summary": "LOST",
  "dataflow-deal-summary": "LOST", "techvision-deal-summary": "WON",
  "cloudbase-deal-summary": "WON",
};

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AV: Record<string, string> = { MW:"#3B82F6", PS:"#8B5CF6", RW:"#F59E0B", SR:"#14B8A6" };
function Avatar({ i }: { i: string }) {
  return (
    <div style={{ width:32, height:32, borderRadius:"50%", background:AV[i]??"#64748B", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {i}
    </div>
  );
}

// ── Typewriter bubble ──────────────────────────────────────────────────────────

function Bubble({ msg, isActive }: { msg: MsgEntry; isActive: boolean }) {
  const [txt, setTxt] = useState(isActive ? "" : msg.text);

  useEffect(() => {
    if (!isActive) { setTxt(msg.text); return; }
    setTxt(""); let i = 0;
    const iv = setInterval(() => {
      i++; setTxt(msg.text.slice(0, i));
      if (i >= msg.text.length) clearInterval(iv);
    }, 13);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const isCoached = msg.isRep && !msg.isMistake;
  const isWrong   = msg.isRep && msg.isMistake;

  return (
    <div style={{ display:"flex", flexDirection:msg.isRep?"row-reverse":"row", gap:8, alignItems:"flex-start", opacity:1, animation:"fadeIn .25s ease" }}>
      <Avatar i={msg.avatar} />
      <div style={{ maxWidth:"76%", display:"flex", flexDirection:"column", gap:3, alignItems:msg.isRep?"flex-end":"flex-start" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:10.5, color:"var(--text-3)", fontWeight:500 }}>{msg.speaker}</span>
          {isCoached && <span style={{ fontSize:9, fontWeight:700, color:"#2DD4BF", background:"rgba(45,212,191,.12)", padding:"1px 6px", borderRadius:100, letterSpacing:".04em" }}>SYNAPSE</span>}
          {isWrong   && <span style={{ fontSize:9, fontWeight:700, color:"#EF4444", background:"rgba(239,68,68,.12)",  padding:"1px 6px", borderRadius:100, letterSpacing:".04em" }}>MISTAKE</span>}
        </div>
        <div style={{
          padding:"9px 12px",
          borderRadius:msg.isRep?"12px 3px 12px 12px":"3px 12px 12px 12px",
          background:msg.isRep ? (isWrong?"rgba(239,68,68,.09)":"rgba(45,212,191,.09)") : "var(--bg-card)",
          border:`1px solid ${msg.isRep ? (isWrong?"rgba(239,68,68,.25)":"rgba(45,212,191,.25)") : "var(--border)"}`,
          fontSize:12, color:"var(--text-1)", lineHeight:1.65,
        }}>
          {txt}
          {isActive && txt.length < msg.text.length && <span style={{ animation:"blink 1s infinite", opacity:.6 }}>|</span>}
        </div>
      </div>
    </div>
  );
}

// ── Memory recall strip ────────────────────────────────────────────────────────

function MemoryStrip({ docs, live }: { docs: string[]; live: boolean }) {
  if (!docs.length) return null;
  return (
    <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.16)" }}>
      <div style={{ fontSize:9.5, fontWeight:700, color:"#818CF8", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>
        {live ? "Hindsight Recall — Live" : "Hindsight Recall — Script"}
      </div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {docs.map(d => (
          <span key={d} style={{ fontSize:9.5, padding:"2px 7px", borderRadius:6, background:DOC_OUTCOME[d]==="WON"?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)", border:`1px solid ${DOC_OUTCOME[d]==="WON"?"rgba(34,197,94,.22)":"rgba(239,68,68,.22)"}`, color:DOC_OUTCOME[d]==="WON"?"#86EFAC":"#FCA5A5", fontWeight:600 }}>
            {DOC_LABEL[d] ?? d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Coaching panel (with Synapse) ──────────────────────────────────────────────

function CoachingPanel({ turn, live, liveLoading }: { turn: ScriptTurn | null; live: boolean; liveLoading: boolean }) {
  if (liveLoading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {[80,55,90,65].map((w,i) => <div key={i} style={{ height:12, borderRadius:6, background:"var(--border)", width:`${w}%`, animation:"pulse 1.2s infinite" }} />)}
      <div style={{ fontSize:11, color:"#A78BFA", marginTop:4 }}>Recalling from Hindsight memory bank…</div>
    </div>
  );

  if (!turn) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"var(--text-3)" }}>
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="1.5"/>
        <circle cx="20" cy="20" r="6" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="20" y1="2" x2="20" y2="10" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="20" y1="30" x2="20" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="2" y1="20" x2="10" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="30" y1="20" x2="38" y2="20" stroke="var(--border)" strokeWidth="1.5"/>
      </svg>
      <div style={{ fontSize:12, textAlign:"center", maxWidth:180, lineHeight:1.6, color:"var(--text-3)" }}>
        Synapse recalls past deals and coaches each turn in real time
      </div>
    </div>
  );

  const isWarn = turn.synapse_type === "warning";
  const ac = isWarn ? "#EF4444" : "#22C55E";
  const bg = isWarn ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.08)";
  const docs = live ? (turn.recalled_memories ?? []) : (SCRIPT_MEMORY_REFS[turn.turn] ?? []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"fadeIn .3s ease" }}>
      <MemoryStrip docs={docs} live={live} />

      <div style={{ padding:"10px 13px", borderRadius:10, background:bg, border:`1px solid ${ac}28` }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:ac, flexShrink:0 }} />
          <span style={{ fontSize:10.5, fontWeight:700, color:ac, letterSpacing:".05em", textTransform:"uppercase" }}>
            {isWarn ? "Pattern Warning" : "Best Practice"}
          </span>
          {live && <span style={{ marginLeft:"auto", fontSize:9.5, color:"#A78BFA", background:"rgba(167,139,250,.12)", padding:"1px 7px", borderRadius:100, fontWeight:700 }}>LIVE</span>}
        </div>
        <div style={{ fontSize:11.5, fontWeight:600, color:"var(--text-2)", marginBottom:3 }}>{turn.synapse_reference_deal}</div>
        <div style={{ fontSize:11, color:"var(--text-3)", lineHeight:1.6 }}>{turn.synapse_pattern}</div>
      </div>

      <div style={{ padding:"10px 13px", borderRadius:10, background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.16)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#818CF8", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>Coaching Advice</div>
        <div style={{ fontSize:11.5, color:"var(--text-2)", lineHeight:1.65 }}>{turn.synapse_suggestion}</div>
      </div>

      <div style={{ padding:"10px 13px", borderRadius:10, background:"rgba(20,184,166,.07)", border:"1px solid rgba(20,184,166,.16)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#2DD4BF", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>Suggested Reply</div>
        <div style={{ fontSize:11.5, color:"var(--text-2)", lineHeight:1.65, fontStyle:"italic" }}>&ldquo;{turn.coached_reply}&rdquo;</div>
      </div>

      {turn.coaching_outcome && (
        <div style={{ fontSize:11, color:"#22C55E" }}>{turn.coaching_outcome}</div>
      )}
    </div>
  );
}

// ── Mistake panel (without Synapse) ───────────────────────────────────────────

function MistakePanel({ turn }: { turn: ScriptTurn | null }) {
  if (!turn) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"var(--text-3)" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="11" y1="11" x2="25" y2="25" stroke="var(--border)" strokeWidth="1.5"/>
        <line x1="25" y1="11" x2="11" y2="25" stroke="var(--border)" strokeWidth="1.5"/>
      </svg>
      <div style={{ fontSize:12, textAlign:"center", maxWidth:180, lineHeight:1.6, color:"var(--text-3)" }}>
        No AI coach — the rep handles each turn without any historical context
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"fadeIn .3s ease" }}>
      {/* No memory access */}
      <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(100,116,139,.05)", border:"1px dashed rgba(100,116,139,.28)" }}>
        <div style={{ fontSize:9.5, fontWeight:700, color:"var(--text-3)", letterSpacing:".07em", textTransform:"uppercase", marginBottom:5 }}>No Memory Access</div>
        <div style={{ fontSize:10.5, color:"var(--text-3)", lineHeight:1.6 }}>
          No Hindsight recall. DataFlow Inc, Meridian Corp and Apex Systems patterns not retrieved. Rep has zero historical context.
        </div>
      </div>

      {/* Mistake */}
      <div style={{ padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.22)" }}>
        <div style={{ fontSize:10.5, fontWeight:700, color:"#EF4444", letterSpacing:".05em", textTransform:"uppercase", marginBottom:5 }}>Rep Mistake</div>
        <div style={{ fontSize:11.5, color:"var(--text-2)", lineHeight:1.6 }}>{turn.rep_mistake}</div>
      </div>

      {/* What was said */}
      <div style={{ padding:"10px 13px", borderRadius:10, background:"rgba(100,116,139,.05)", border:"1px solid rgba(100,116,139,.14)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>What the rep said</div>
        <div style={{ fontSize:11.5, color:"var(--text-3)", lineHeight:1.65, fontStyle:"italic" }}>&ldquo;{turn.rep_reply}&rdquo;</div>
      </div>

      <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,.04)", border:"1px solid rgba(239,68,68,.14)" }}>
        <div style={{ fontSize:10.5, color:"#FCA5A5", lineHeight:1.6 }}>
          No memory recall. No pattern match. No coaching. The rep is repeating a mistake that lost 3 past deals.
        </div>
      </div>
    </div>
  );
}

// ── Deal pills ─────────────────────────────────────────────────────────────────

function DealPills({ deals }: { deals: HistoricalDeal[] }) {
  return (
    <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
      {deals.map(d => (
        <div key={d.deal_name} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:7, background:d.outcome==="LOST"?"rgba(239,68,68,.09)":"rgba(34,197,94,.09)", border:`1px solid ${d.outcome==="LOST"?"rgba(239,68,68,.18)":"rgba(34,197,94,.18)"}` }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:d.outcome==="LOST"?"#EF4444":"#22C55E", flexShrink:0 }} />
          <div>
            <div style={{ fontSize:10.5, fontWeight:600, color:d.outcome==="LOST"?"#FCA5A5":"#86EFAC" }}>{d.deal_name}</div>
            <div style={{ fontSize:9.5, color:"var(--text-3)" }}>{d.value}</div>
          </div>
        </div>
      ))}
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

  const [track, setTrack] = useState<Track>("coached");
  const [liveMode, setLiveMode] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Coached track
  const [cMsgs, setCMsgs]       = useState<MsgEntry[]>([]);
  const [cActiveId, setCActiveId] = useState<string | null>(null);
  const [cCoaching, setCCoaching] = useState<ScriptTurn | null>(null);
  const [cPlaying, setCPlaying]   = useState(false);
  const [cDone, setCDone]         = useState(false);
  const [cTurn, setCTurn]         = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Uncoached track
  const [uMsgs, setUMsgs]       = useState<MsgEntry[]>([]);
  const [uActiveId, setUActiveId] = useState<string | null>(null);
  const [uMistake, setUMistake]   = useState<ScriptTurn | null>(null);
  const [uPlaying, setUPlaying]   = useState(false);
  const [uDone, setUDone]         = useState(false);
  const [uTurn, setUTurn]         = useState<number | null>(null);

  const cPlayingRef = useRef(false);
  const uPlayingRef = useRef(false);
  const cTurnRef    = useRef(0);
  const uTurnRef    = useRef(0);
  const liveModeRef = useRef(false);
  const cScrollRef  = useRef<HTMLDivElement>(null!);
  const uScrollRef  = useRef<HTMLDivElement>(null!);

  useEffect(() => { liveModeRef.current = liveMode; }, [liveMode]);

  useEffect(() => {
    fetch(`${API_BASE}/simulation/script`)
      .then(r => r.json()).then(d => { setScript(d); setLoadingScript(false); })
      .catch(() => { setError("Backend warming up — try again in 30 seconds."); setLoadingScript(false); });
  }, []);

  useEffect(() => { if (cScrollRef.current) cScrollRef.current.scrollTop = cScrollRef.current.scrollHeight; }, [cMsgs, cActiveId]);
  useEffect(() => { if (uScrollRef.current) uScrollRef.current.scrollTop = uScrollRef.current.scrollHeight; }, [uMsgs, uActiveId]);

  const sleep    = (ms: number) => new Promise<void>(r => setTimeout(r, ms / speed));
  const typeWait = (text: string) => sleep(text.length * 13 + 300);

  // ── Coached runner ────────────────────────────────────────────────────────

  const runCoached = async (idx: number) => {
    if (!script || !cPlayingRef.current) return;
    const turn = script.script[idx];
    if (!turn) { setCDone(true); setCPlaying(false); cPlayingRef.current = false; return; }

    setCTurn(turn.turn);

    const cid = `c-c-${idx}`;
    setCMsgs(p => [...p, { id:cid, text:turn.customer_message, speaker:turn.customer_speaker, avatar:turn.customer_avatar, isRep:false }]);
    setCActiveId(cid);
    await typeWait(turn.customer_message);
    if (!cPlayingRef.current) return;
    setCActiveId(null);

    if (liveModeRef.current) {
      setLiveLoading(true);
      try {
        const hist = script.script.slice(0, idx).flatMap(t => [
          { role:"customer", content:t.customer_message },
          { role:"rep",      content:t.coached_reply ?? "" },
        ]);
        const res  = await fetch(`${API_BASE}/simulation/suggest`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ deal_id:script.deal_id, customer_message:turn.customer_message, conversation_history:hist }) });
        const data = await res.json();
        setCCoaching({ ...turn, synapse_type:data.synapse_type||turn.synapse_type, synapse_reference_deal:data.reference_deal||turn.synapse_reference_deal, synapse_pattern:data.pattern||turn.synapse_pattern, synapse_suggestion:data.suggestion||turn.synapse_suggestion, coached_reply:data.coached_reply||turn.coached_reply, recalled_memories:data.recalled_memories });
      } catch { setCCoaching(turn); }
      setLiveLoading(false);
    } else {
      setCCoaching(turn);
    }

    await sleep(1200);
    if (!cPlayingRef.current) return;

    const rid = `c-r-${idx}`;
    const repText = turn.coached_reply ?? "";
    setCMsgs(p => [...p, { id:rid, text:repText, speaker:"Sarah — Sales Rep", avatar:"SR", isRep:true, isMistake:false }]);
    setCActiveId(rid);
    await typeWait(repText);
    if (!cPlayingRef.current) return;
    setCActiveId(null);

    await sleep(900);
    cTurnRef.current = idx + 1;
    if (idx + 1 < script.script.length) runCoached(idx + 1);
    else { setCDone(true); setCPlaying(false); cPlayingRef.current = false; }
  };

  // ── Uncoached runner ──────────────────────────────────────────────────────

  const runUncoached = async (idx: number) => {
    if (!script || !uPlayingRef.current) return;
    const turn = script.uncoached_script[idx];
    if (!turn) { setUDone(true); setUPlaying(false); uPlayingRef.current = false; return; }

    setUTurn(turn.turn);

    const cid = `u-c-${idx}`;
    setUMsgs(p => [...p, { id:cid, text:turn.customer_message, speaker:turn.customer_speaker, avatar:turn.customer_avatar, isRep:false }]);
    setUActiveId(cid);
    await typeWait(turn.customer_message);
    if (!uPlayingRef.current) return;
    setUActiveId(null);

    setUMistake(turn);
    await sleep(1200);
    if (!uPlayingRef.current) return;

    const rid = `u-r-${idx}`;
    const repText = turn.rep_reply ?? "";
    setUMsgs(p => [...p, { id:rid, text:repText, speaker:"Sarah — Sales Rep (no AI)", avatar:"SR", isRep:true, isMistake:true }]);
    setUActiveId(rid);
    await typeWait(repText);
    if (!uPlayingRef.current) return;
    setUActiveId(null);

    await sleep(900);
    uTurnRef.current = idx + 1;
    if (idx + 1 < script.uncoached_script.length) runUncoached(idx + 1);
    else { setUDone(true); setUPlaying(false); uPlayingRef.current = false; }
  };

  // ── Play / Pause / Restart ────────────────────────────────────────────────

  const isCoached  = track === "coached";
  const playing    = isCoached ? cPlaying : uPlaying;
  const done       = isCoached ? cDone    : uDone;
  const hasMsgs    = isCoached ? cMsgs.length > 0 : uMsgs.length > 0;
  const otherRunning = isCoached ? uPlaying : cPlaying;

  const handlePlay = () => {
    if (done) {
      if (isCoached) {
        setCMsgs([]); setCActiveId(null); setCCoaching(null); setCDone(false); setCTurn(null); cTurnRef.current = 0;
      } else {
        setUMsgs([]); setUActiveId(null); setUMistake(null); setUDone(false); setUTurn(null); uTurnRef.current = 0;
      }
    }
    if (isCoached) {
      cPlayingRef.current = true; setCPlaying(true);
      runCoached(cTurnRef.current);
    } else {
      uPlayingRef.current = true; setUPlaying(true);
      runUncoached(uTurnRef.current);
    }
  };

  const handlePause = () => {
    if (isCoached) { cPlayingRef.current = false; setCPlaying(false); }
    else           { uPlayingRef.current = false; setUPlaying(false); }
  };

  // Active state for right panel
  const activeScript   = isCoached ? script?.script : script?.uncoached_script;
  const activeTurn     = isCoached ? cTurn : uTurn;
  const activeMsgsList = isCoached ? cMsgs : uMsgs;

  return (
    <>
      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{opacity:.35} 50%{opacity:1} }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"var(--bg-base)", overflow:"hidden" }}>
        <Sidebar dealId={dealId} onDealChange={setDealId} />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Header */}
          <div style={{ padding:"12px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Deal Simulation</div>
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>
                {script?.deal_name ?? "Loading…"} — same deal, two outcomes
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button
                onClick={() => setLiveMode(!liveMode)}
                disabled={playing}
                style={{ padding:"5px 11px", borderRadius:8, fontSize:11, fontWeight:600, background:liveMode?"rgba(167,139,250,.15)":"var(--bg-card)", border:`1px solid ${liveMode?"rgba(167,139,250,.4)":"var(--border)"}`, color:liveMode?"#A78BFA":"var(--text-3)", cursor:playing?"not-allowed":"pointer", opacity:playing?0.45:1 }}>
                {liveMode ? "Live Groq" : "Script"}
              </button>
              {[1,2,3].map(s => (
                <button key={s} onClick={() => setSpeed(s)} style={{ padding:"5px 9px", borderRadius:7, fontSize:11, fontWeight:600, background:speed===s?"var(--bg-active)":"var(--bg-card)", border:`1px solid ${speed===s?"var(--accent)":"var(--border)"}`, color:speed===s?"var(--text-1)":"var(--text-3)", cursor:"pointer" }}>{s}x</button>
              ))}
              <button
                onClick={playing ? handlePause : handlePlay}
                disabled={loadingScript}
                style={{ padding:"7px 18px", borderRadius:9, fontSize:12, fontWeight:700, background:playing?"rgba(239,68,68,.15)":"var(--accent)", border:playing?"1px solid rgba(239,68,68,.3)":"none", color:playing?"#EF4444":"#fff", cursor:loadingScript?"not-allowed":"pointer", opacity:loadingScript?0.5:1 }}>
                {done ? "Restart" : playing ? "Pause" : hasMsgs ? "Resume" : "Play"}
              </button>
            </div>
          </div>

          {/* Memory context */}
          {script && (
            <div style={{ padding:"8px 20px", borderBottom:"1px solid var(--border-muted)", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", letterSpacing:".06em", textTransform:"uppercase", flexShrink:0 }}>Memory</span>
              <DealPills deals={script.historical_deals} />
            </div>
          )}

          {error && <div style={{ margin:"12px 20px", padding:12, borderRadius:10, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", fontSize:12, color:"#FCA5A5" }}>{error}</div>}

          {/* Tabs — the OTHER tab is disabled while one is running */}
          <div style={{ display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            {(["coached","uncoached"] as Track[]).map(t => {
              const isActive = track === t;
              const isDisabled = (t === "coached" ? uPlaying : cPlaying);
              const color = t === "coached" ? "#22C55E" : "#EF4444";
              const label = t === "coached" ? "With Synapse — Deal Saved" : "Without Synapse — Deal Lost";
              return (
                <button
                  key={t}
                  onClick={() => { if (!isDisabled) setTrack(t); }}
                  title={isDisabled ? "Wait for the other simulation to finish or pause it first" : undefined}
                  style={{
                    flex:1, padding:"10px 16px", fontSize:12, fontWeight:600,
                    background:isActive ? (t==="coached"?"rgba(34,197,94,.05)":"rgba(239,68,68,.05)") : "none",
                    border:"none", borderBottom:`2px solid ${isActive ? color : "transparent"}`,
                    color:isDisabled ? "var(--text-3)" : isActive ? color : "var(--text-3)",
                    cursor:isDisabled ? "not-allowed" : "pointer",
                    opacity:isDisabled ? 0.4 : 1,
                    transition:"all .15s",
                  }}>
                  {label}
                  {isDisabled && <span style={{ marginLeft:6, fontSize:9.5, color:"var(--text-3)", letterSpacing:".04em" }}>(running)</span>}
                </button>
              );
            })}
          </div>

          {/* Main split */}
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* Conversation */}
            <div
              ref={isCoached ? cScrollRef : uScrollRef}
              style={{ flex:1, overflowY:"auto", padding:"20px 22px", display:"flex", flexDirection:"column", gap:16, borderRight:"1px solid var(--border)" }}>

              {(isCoached ? cMsgs : uMsgs).length === 0 && (
                <div style={{ margin:"auto", textAlign:"center", color:"var(--text-3)", maxWidth:280 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:isCoached?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)", border:`1px solid ${isCoached?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:16, fontWeight:700, color:isCoached?"#22C55E":"#EF4444" }}>
                    {isCoached ? "AI" : "!"}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:6, color:"var(--text-2)" }}>
                    {isCoached ? "With Synapse" : "Without Synapse"}
                  </div>
                  <div style={{ fontSize:11.5, lineHeight:1.7 }}>
                    {isCoached
                      ? "Synapse recalls from 3 lost and 2 won deals to coach the rep on every turn."
                      : "No AI. No memory. The rep repeats the exact mistakes that lost 3 previous deals."}
                  </div>
                  <div style={{ marginTop:14, fontSize:11 }}>Press <strong style={{ color:"var(--text-2)" }}>Play</strong> to begin</div>
                </div>
              )}

              {(isCoached ? cMsgs : uMsgs).map(m => (
                <Bubble key={m.id} msg={m} isActive={(isCoached ? cActiveId : uActiveId) === m.id} />
              ))}

              {(isCoached ? cDone : uDone) && (
                <div style={{ padding:"14px 16px", borderRadius:12, background:isCoached?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)", border:`1px solid ${isCoached?"rgba(34,197,94,.25)":"rgba(239,68,68,.28)"}`, textAlign:"center", animation:"fadeIn .4s ease" }}>
                  {isCoached ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, color:"#22C55E", marginBottom:4 }}>Deal Saved — $480K ARR</div>
                      <div style={{ fontSize:11, color:"var(--text-3)", lineHeight:1.6 }}>AMD-2024-047 signed · InfoSec approved · Commercial close scheduled</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, color:"#EF4444", marginBottom:6 }}>Deal Lost — $480K ARR Gone</div>
                      <div style={{ fontSize:11, color:"var(--text-3)", lineHeight:1.7 }}>
                        Multi-tenant agreed (T1) · GDPR left unresolved (T2) · Discounted before InfoSec sign-off (T3)<br/>
                        <span style={{ color:"#FCA5A5", fontWeight:600 }}>Weaviate won the contract.</span>
                      </div>
                      <div style={{ marginTop:10, padding:"6px 10px", borderRadius:7, background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.14)" }}>
                        <div style={{ fontSize:10.5, color:"#FCA5A5" }}>Same mistakes lost: DataFlow $290K · Meridian $380K · Apex $520K</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right panel */}
            <div style={{ width:300, flexShrink:0, padding:"16px 14px", display:"flex", flexDirection:"column", gap:12, overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:playing?(isCoached?"#22C55E":"#EF4444"):"var(--text-3)", boxShadow:playing?`0 0 5px ${isCoached?"#22C55E":"#EF4444"}`:"none", animation:playing?"pulse 1.5s infinite":"none" }} />
                <span style={{ fontSize:11.5, fontWeight:700, color:"var(--text-2)" }}>
                  {isCoached ? "Synapse Coach" : "No Coach"}
                </span>
                {activeTurn !== null && activeScript && (
                  <span style={{ marginLeft:"auto", fontSize:10.5, color:"var(--text-3)" }}>Turn {activeTurn}/{activeScript.length}</span>
                )}
              </div>

              {isCoached
                ? <CoachingPanel turn={cCoaching} live={liveMode} liveLoading={liveLoading} />
                : <MistakePanel  turn={uMistake} />
              }

              {activeScript && (
                <div style={{ display:"flex", gap:4, marginTop:"auto", paddingTop:10 }}>
                  {activeScript.map((_, i) => {
                    const done = activeMsgsList.some(m => m.isRep && m.id.includes(`-${i}`));
                    const active = activeTurn === i + 1;
                    const doneColor = isCoached ? "#22C55E" : "#EF4444";
                    return <div key={i} style={{ flex:1, height:3, borderRadius:2, background:done?doneColor:active?"#A78BFA":"var(--border)", transition:"background .4s" }} />;
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
