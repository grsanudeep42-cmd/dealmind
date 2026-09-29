"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import Markdown from "@/app/components/Markdown";
import {
  getDealObservations,
  getDealInfo,
  getInsightPatterns,
  type ObservationsData,
  type DealInfo,
  type MemorySource,
  type InsightPattern,
} from "@/lib/api";

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const isHigh = confidence === "high";
  return (
    <span
      className={isHigh ? "badge badge-green" : "badge badge-amber"}
      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}
    >
      {isHigh ? "High confidence" : "Emerging"}
    </span>
  );
}

function MemoryRow({ mem }: { mem: MemorySource }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card"
      style={{ marginBottom: 8, cursor: "pointer" }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ padding: "10px 13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            {mem.label || mem.document_id}
          </span>
          {mem.relevance > 0 && (
            <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>
              {(mem.relevance * 100).toFixed(0)}%
            </span>
          )}
        </div>
        {mem.topic && (
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
            {mem.topic}{mem.attendees.length > 0 ? ` · ${mem.attendees.join(", ")}` : ""}
          </div>
        )}
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-2)",
            lineHeight: 1.55,
            overflow: "hidden",
            maxHeight: open ? "none" : "3.1em",
          }}
        >
          {mem.text.slice(0, open ? undefined : 300)}
          {!open && mem.text.length > 300 ? "…" : ""}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
          {open ? "Show less ↑" : "Show more ↓"}
        </div>
      </div>
    </div>
  );
}

export default function ObservationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get("deal") || "acme-corp-deal";

  const [data, setData] = useState<ObservationsData | null>(null);
  const [dealInfo, setDealInfo] = useState<DealInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<InsightPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDealObservations(dealId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    getDealInfo(dealId).then(setDealInfo).catch(() => null);

    setPatternsLoading(true);
    getInsightPatterns()
      .then((d) => setPatterns(d.patterns))
      .catch(() => setPatterns([]))
      .finally(() => setPatternsLoading(false));
  }, [dealId]);

  return (
    <div className="app-shell">
      <Sidebar dealId={dealId} onDealChange={(id) => router.push(`/observations?deal=${id}`)} />

      <main className="main-content">
        <div className="page-header">
          <span className="page-title">Insights</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Hindsight Reflect + Synapse patterns</span>
        </div>

        <div className="scroll-main">
          <div style={{ maxWidth: 960, margin: "0 auto" }}>

            {/* Page title */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 5, letterSpacing: "-0.02em" }}>
                Deal Intelligence Report
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                Auto-synthesized across all calls ·{" "}
                <span style={{ color: "var(--text-2)" }}>{dealId}</span>
              </p>
            </div>

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "32px 0" }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>Running reflect() across all deal memories…</span>
                <span style={{ fontSize: 12, color: "var(--text-3)", opacity: 0.7 }}>This may take 10–20 seconds on first call.</span>
              </div>
            )}

            {error && (
              <div style={{ background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)", borderRadius: "var(--radius)", padding: "14px 16px", color: "var(--red)", fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>Error</div>
                <div style={{ color: "var(--text-3)" }}>{error}</div>
              </div>
            )}

            {!loading && !error && data && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Summary */}
                  <div className="card">
                    <div className="card-header">
                      AI-synthesized summary
                      <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 10 }}>Hindsight Reflect</span>
                    </div>
                    <div className="card-body">
                      {data.consolidated_summary
                        ? <Markdown>{data.consolidated_summary}</Markdown>
                        : <p style={{ fontSize: 13.5, color: "var(--text-3)" }}>No summary available.</p>
                      }
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Memories", value: data.total_memories, accent: "var(--accent)" },
                      { label: "Calls ingested", value: 5, accent: "var(--blue)" },
                      { label: "Stakeholders", value: 3, accent: "var(--green)" },
                    ].map((s) => (
                      <div key={s.label} className="card" style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>
                          {s.value}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 5 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Key deal facts — from real API */}
                  {dealInfo && (
                    <div className="card">
                      <div className="card-header">Key deal facts</div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {[
                          {
                            label: "Deal",
                            value: dealInfo.deal_name,
                            accent: "var(--text-1)",
                          },
                          {
                            label: "ARR",
                            value: dealInfo.expected_arr
                              ? `$${(dealInfo.expected_arr / 1000).toFixed(0)}K`
                              : "—",
                            accent: "var(--green)",
                          },
                          {
                            label: "Stage",
                            value: dealInfo.stage || "—",
                            accent: "var(--text-2)",
                          },
                          {
                            label: "Expected close",
                            value: dealInfo.expected_close || "—",
                            accent: "var(--text-2)",
                          },
                          {
                            label: "Calls tracked",
                            value: `${dealInfo.calls.length} calls`,
                            accent: "var(--text-2)",
                          },
                          {
                            label: "Call owners",
                            value: [...new Set(dealInfo.calls.flatMap((c) => c.attendees))].join(", "),
                            accent: "var(--text-2)",
                          },
                        ].map((fact, i, arr) => (
                          <div
                            key={fact.label}
                            style={{
                              display: "flex",
                              gap: 16,
                              padding: "10px 16px",
                              borderBottom: i < arr.length - 1 ? "1px solid var(--border-muted)" : "none",
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ width: 120, flexShrink: 0, paddingTop: 1 }}>
                              <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{fact.label}</span>
                            </div>
                            <div style={{ fontSize: 13, color: fact.accent, fontWeight: 500, lineHeight: 1.5, flex: 1 }}>
                              {fact.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synapse Learned Patterns */}
                  <div className="card" style={{ borderColor: "rgba(201,100,66,0.2)", background: "rgba(201,100,66,0.03)" }}>
                    <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Learned patterns
                      <span className="badge badge-accent" style={{ fontSize: 10, letterSpacing: "0.05em" }}>SYNAPSE</span>
                    </div>
                    <div className="card-body">
                      {patternsLoading ? (
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <div className="dot" /><div className="dot" /><div className="dot" />
                          <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 6 }}>Analysing cross-deal patterns…</span>
                        </div>
                      ) : patterns.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                          No cross-deal patterns yet. Ask questions across both deals to build the Synapse graph.
                          Patterns emerge automatically from co-retrieval data.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {patterns.map((p, i) => (
                            <div
                              key={i}
                              className="fade-up"
                              style={{
                                padding: "13px 15px",
                                background: "var(--bg-card)",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-1)", marginBottom: 6, lineHeight: 1.5 }}>
                                {p.pattern}
                              </p>
                              <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 10, lineHeight: 1.55 }}>
                                {p.evidence}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <ConfidenceBadge confidence={p.confidence} />
                                {p.deals.map((d) => (
                                  <span key={d} className="badge badge-muted" style={{ fontSize: 10 }}>{d}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                          <p style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", lineHeight: 1.6 }}>
                            Synapse learned this from co-retrieval patterns — not programmed, observed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column — raw memories */}
                <div>
                  <div className="section-heading" style={{ marginBottom: 12 }}>
                    Raw memories · {data.raw_memories.length}
                  </div>
                  {data.raw_memories.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)" }}>
                      <p style={{ fontSize: 13 }}>No memories returned</p>
                    </div>
                  ) : (
                    data.raw_memories.map((mem, i) => (
                      <MemoryRow key={mem.document_id + i} mem={mem} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
