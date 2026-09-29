"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listDeals, type Deal } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDeals()
      .then((d) => setDeals(d.deals))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Logo + wordmark */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            <div className="logo-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <svg viewBox="0 0 14 14" fill="white" style={{ width: 18, height: 18 }}>
                <circle cx="7" cy="7" r="2.5"/>
                <line x1="7" y1="1" x2="7" y2="4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="7" y1="10" x2="7" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="1" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="10" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              Synapse
            </span>
          </div>
          <p style={{ color: "var(--text-3)", fontSize: 14, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
            Enterprise deal intelligence. Know every objection, commitment, and stakeholder concern — from the exact call it happened.
          </p>
        </div>

        {/* Deal list */}
        <div>
          <div className="section-heading" style={{ marginBottom: 12 }}>Select a deal</div>

          {loading && (
            <div style={{ display: "flex", gap: 5, padding: "32px 0" }}>
              <div className="dot" /><div className="dot" /><div className="dot" />
            </div>
          )}

          {error && (
            <div style={{
              background: "var(--red-dim)",
              border: "1px solid rgba(229,72,77,0.25)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              color: "var(--red)",
              fontSize: 13,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Backend unavailable</div>
              <div style={{ color: "var(--text-3)", fontSize: 12 }}>
                Run: <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4 }}>
                  cd dealmind/backend && uvicorn main:app --reload
                </code>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deals.map((deal) => (
              <button
                key={deal.deal_id}
                onClick={() => router.push(`/chat?deal=${encodeURIComponent(deal.deal_id)}`)}
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--text-1)",
                  fontFamily: "inherit",
                  transition: "all 0.12s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#3D3C3A";
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 6, letterSpacing: "-0.01em" }}>
                    {deal.deal_name}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-green">{deal.arr} ARR</span>
                    <span className="badge badge-muted">{deal.stage}</span>
                    <span className="badge badge-muted">{deal.calls} calls</span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-3)", flexShrink: 0 }}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
          Memory · <span style={{ color: "var(--text-2)" }}>Hindsight Cloud</span>
          &nbsp;·&nbsp;
          LLM · <span style={{ color: "var(--text-2)" }}>Groq</span>
          &nbsp;·&nbsp;
          Learning · <span style={{ color: "var(--accent)" }}>Synapse Graph</span>
        </div>
      </div>
    </div>
  );
}
