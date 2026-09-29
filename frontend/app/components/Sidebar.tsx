"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { listDeals, getDealRiskScore, type Deal, type RiskScore } from "@/lib/api";

const NAV = [
  { label: "Chat", href: (d: string) => `/chat?deal=${d}`, icon: ChatIcon },
  { label: "Graph", href: (d: string) => `/graph?deal=${d}`, icon: GraphIcon },
  { label: "Insights", href: (d: string) => `/observations?deal=${d}`, icon: InsightIcon },
];

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 7.5C1 4 3.9 1 7.5 1S14 4 14 7.5c0 1.5-.5 2.9-1.4 4l.4 2.5-2.5-.6A6.5 6.5 0 0 1 7.5 14C3.9 14 1 11 1 7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}
function GraphIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="2" cy="2.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="13" cy="2.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="2" cy="12.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="13" cy="12.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3.2" y1="3.2" x2="5.9" y2="6.2" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="11.8" y1="3.2" x2="9.1" y2="6.2" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="3.2" y1="11.8" x2="5.9" y2="8.8" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="11.8" y1="11.8" x2="9.1" y2="8.8" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  );
}
function InsightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="9" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6" y="5" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="11" y="1" width="3" height="13" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

/* ── Animated circular risk gauge ── */
function RiskGauge({ risk }: { risk: RiskScore }) {
  const [expanded, setExpanded] = useState(false);
  const [animated, setAnimated] = useState(0);

  const levelColor: Record<string, string> = {
    Low: "#22C55E",
    Medium: "#F59E0B",
    High: "#EF4444",
    Critical: "#7F1D1D",
  };
  const color = levelColor[risk.level] ?? "#94A3B8";

  const R = 22;
  const circ = 2 * Math.PI * R;
  const dash = (animated / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(risk.score), 120);
    return () => clearTimeout(t);
  }, [risk.score]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left" }}
      >
        {/* Ring */}
        <svg width="54" height="54" style={{ flexShrink: 0 }}>
          <circle cx="27" cy="27" r={R} fill="none" stroke="var(--border)" strokeWidth="4"/>
          <circle
            cx="27" cy="27" r={R} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 27 27)"
            style={{ transition: "stroke-dasharray 1.1s ease" }}
          />
          <text x="27" y="27" textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 13, fontWeight: 700, fill: color, fontFamily: "inherit" }}>
            {risk.score}
          </text>
        </svg>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {risk.level} Risk
          </div>
          <div style={{
            fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.4, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          }}>
            {risk.summary}
          </div>
        </div>

        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink: 0, color: "var(--text-3)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ paddingLeft: 4, animation: "fadeUp 0.15s ease" }}>
          {risk.top_risks.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
                Top Risks
              </div>
              {risk.top_risks.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 }}>
                  <span style={{ color: "#EF4444", fontSize: 9, marginTop: 3, flexShrink: 0 }}>▲</span>
                  <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          )}
          {risk.positive_signals.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
                Positive
              </div>
              {risk.positive_signals.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 }}>
                  <span style={{ color: "#22C55E", fontSize: 10, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  dealId: string;
  onDealChange?: (id: string) => void;
}

export default function Sidebar({ dealId, onDealChange }: SidebarProps) {
  const pathname = usePathname();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  useEffect(() => {
    listDeals().then((d) => setDeals(d.deals)).catch(() => {});
  }, []);

  useEffect(() => {
    setRisk(null);
    setRiskLoading(true);
    getDealRiskScore(dealId)
      .then(setRisk)
      .catch(() => null)
      .finally(() => setRiskLoading(false));
  }, [dealId]);

  const currentDeal = deals.find((d) => d.deal_id === dealId);

  const isActive = (href: string) => {
    if (pathname === "/chat" && href.startsWith("/chat")) return true;
    if (pathname === "/graph" && href.startsWith("/graph")) return true;
    if (pathname === "/observations" && href.startsWith("/observations")) return true;
    return false;
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "16px 12px 12px", display: "flex", alignItems: "center", gap: 9 }}>
        <div className="logo-mark">
          <svg viewBox="0 0 14 14" fill="white">
            <circle cx="7" cy="7" r="2.5"/>
            <line x1="7" y1="1" x2="7" y2="4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="7" y1="10" x2="7" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="1" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="10" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
          Synapse
        </span>
      </div>

      <div className="divider" />

      {/* Deal Switcher */}
      <div className="sidebar-section" style={{ position: "relative" }}>
        <div className="sidebar-label">Deal</div>
        <button className="deal-pill" onClick={() => setOpen(!open)} style={{ width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, overflow: "hidden" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
              {currentDeal?.deal_name?.split("—")[0]?.trim() || dealId}
            </span>
            {currentDeal && (
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{currentDeal.arr} ARR</span>
            )}
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: "var(--text-3)" }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {open && deals.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% - 4px)", left: 8, right: 8,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", zIndex: 100, overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            {deals.map((d) => (
              <button
                key={d.deal_id}
                onClick={() => { onDealChange?.(d.deal_id); setOpen(false); }}
                style={{
                  width: "100%", padding: "10px 12px", textAlign: "left",
                  background: d.deal_id === dealId ? "var(--bg-active)" : "none",
                  border: "none", borderBottom: "1px solid var(--border-muted)",
                  cursor: "pointer", color: "var(--text-1)", fontFamily: "inherit",
                  fontSize: 12.5, transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = d.deal_id === dealId ? "var(--bg-active)" : "none"; }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.deal_name?.split("—")[0]?.trim()}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{d.stage} · {d.arr}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        <div className="sidebar-label">Navigate</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ label, href, icon: Icon }) => {
            const h = href(dealId);
            const active = isActive(h);
            return (
              <Link key={label} href={h} className={`nav-item ${active ? "active" : ""}`}>
                <Icon />
                <span>{label}</span>
                {active && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overview stats */}
      {currentDeal && (
        <div className="sidebar-section">
          <div className="sidebar-label">Overview</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="stat-row">
              <span className="stat-label">ARR</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--green)" }}>{currentDeal.arr}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Stage</span>
              <span className="stat-value" style={{ fontSize: 11.5, textAlign: "right", maxWidth: 120 }}>{currentDeal.stage}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Calls</span>
              <span className="stat-value">{currentDeal.calls}</span>
            </div>
          </div>
        </div>
      )}

      {/* Deal Risk Score */}
      <div className="sidebar-section">
        <div className="sidebar-label">Deal Risk</div>
        {riskLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              border: "4px solid var(--border)", flexShrink: 0,
              opacity: 0.5,
            }} />
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Analysing with Groq…</div>
          </div>
        ) : risk ? (
          <RiskGauge risk={risk} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-3)", padding: "6px 0" }}>
            Risk score unavailable
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: "12px", borderTop: "1px solid var(--border-muted)" }}>
        <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.6 }}>
          Memory by <span style={{ color: "var(--text-2)" }}>Hindsight</span><br/>
          LLM by <span style={{ color: "var(--text-2)" }}>Groq</span>
        </div>
      </div>
    </aside>
  );
}
