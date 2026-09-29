"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import {
  getDealGraph,
  getAssociativeGraph,
  getSpreadingActivation,
  type GraphData,
  type AssociativeGraphData,
} from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphComponent = React.ComponentType<any>;

interface FGNode {
  id: string;
  label: string;
  type: string;
  color: string;
  x?: number;
  y?: number;
}

interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  label: string;
  weight?: number;
  strong?: boolean;
}

type GraphMode = "entity" | "associative";

const ENTITY_LEGEND = [
  { color: "#5B8AF0", label: "Stakeholders" },
  { color: "#E5484D", label: "Open objections" },
  { color: "#10B981", label: "Resolved" },
  { color: "#F59E0B", label: "Competitors" },
  { color: "#C96442", label: "Amendments" },
  { color: "#5C5B58", label: "Calls" },
];

const ASSOC_LEGEND = [
  { color: "#5B8AF0", label: "Acme Corp calls" },
  { color: "#C96442", label: "NovaTech calls" },
  { color: "#5C5B58", label: "Unknown" },
];

function NodeTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    stakeholder: "person",
    objection_open: "warning",
    objection_resolved: "check",
    competitor: "vs",
    amendment: "doc",
    deal: "deal",
    call: "call",
  };
  const label = icons[type] || type.replace(/_/g, " ");
  return <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>;
}

export default function GraphPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get("deal") || "acme-corp-deal";

  const [graphMode, setGraphMode] = useState<GraphMode>("entity");
  const [entityData, setEntityData] = useState<GraphData | null>(null);
  const [assocData, setAssocData] = useState<AssociativeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FGNode | null>(null);
  const [spreadActivated, setSpreadActivated] = useState<Set<string>>(new Set());
  const [spreadCounts, setSpreadCounts] = useState<Record<string, number>>({});
  const [spreadLoading, setSpreadLoading] = useState(false);
  const [ForceGraph, setForceGraph] = useState<ForceGraphComponent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setForceGraph(mod.default as ForceGraphComponent);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDealGraph(dealId)
      .then(setEntityData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dealId]);

  useEffect(() => {
    if (graphMode === "associative" && !assocData) {
      setLoading(true);
      setError(null);
      getAssociativeGraph(dealId)
        .then(setAssocData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (graphMode === "entity") {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphMode, dealId]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const currentGraphData = graphMode === "entity" ? entityData : assocData;

  const fgData = currentGraphData
    ? {
        nodes: currentGraphData.nodes.map((n) => ({ ...n })),
        links: currentGraphData.edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
          weight: e.weight ?? 1,
          strong: e.strong ?? false,
        })),
      }
    : { nodes: [], links: [] };

  const handleNodeClick = useCallback(async (node: FGNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
    if (graphMode === "associative") {
      setSpreadLoading(true);
      setSpreadActivated(new Set());
      setSpreadCounts({});
      try {
        const result = await getSpreadingActivation(dealId, node.id);
        const ids = new Set(result.activated.map((a) => a.document_id));
        const counts: Record<string, number> = {};
        result.activated.forEach((a) => { counts[a.document_id] = a.co_retrieval_count; });
        setSpreadActivated(ids);
        setSpreadCounts(counts);
      } catch { /* non-fatal */ }
      finally { setSpreadLoading(false); }
    }
  }, [graphMode, dealId]);

  const legend = graphMode === "entity" ? ENTITY_LEGEND : ASSOC_LEGEND;

  return (
    <div className="app-shell">
      <Sidebar dealId={dealId} onDealChange={(id) => router.push(`/graph?deal=${id}`)} />

      <main className="main-content">
        {/* Top bar */}
        <div className="page-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="page-title">Graph</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {graphMode === "entity" ? "Explicit connections from Hindsight" : "Learned connections from Synapse"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {graphMode === "associative" && (
              <span className="badge badge-accent" style={{ fontSize: 10.5 }}>
                Click a node → spreading activation
              </span>
            )}
            <div className="toggle-group">
              {(["entity", "associative"] as GraphMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`toggle-btn ${graphMode === mode ? "active" : ""}`}
                  onClick={() => { setGraphMode(mode); setSelectedNode(null); setSpreadActivated(new Set()); }}
                >
                  {mode === "entity" ? "Entity" : "Associative"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Graph + panel */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Canvas */}
          <div ref={containerRef} style={{ flex: 1, position: "relative", background: "var(--bg)" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--text-3)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
                <span style={{ fontSize: 13 }}>Loading {graphMode === "entity" ? "entity" : "Synapse associative"} graph…</span>
              </div>
            )}

            {error && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--red)", textAlign: "center", fontSize: 13 }}>
                  <div style={{ marginBottom: 8, fontSize: 20 }}>⚠</div>
                  {error}
                </div>
              </div>
            )}

            {!loading && !error && graphMode === "associative" && assocData && assocData.edges.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-3)", pointerEvents: "none" }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4">
                  <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="6" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="34" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="6" cy="32" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="34" cy="32" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="9" y1="10" x2="15" y2="16" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="31" y1="10" x2="25" y2="16" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="9" y1="30" x2="15" y2="24" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="31" y1="30" x2="25" y2="24" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                <div style={{ textAlign: "center", maxWidth: 320 }}>
                  <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 6 }}>Synapse is still learning</p>
                  <p style={{ fontSize: 12 }}>Ask 2–3 questions in Chat. Co-retrieval edges appear once two calls are recalled together.</p>
                </div>
              </div>
            )}

            {!loading && !error && ForceGraph && currentGraphData && (
              <ForceGraph
                ref={fgRef}
                graphData={fgData}
                width={dimensions.w}
                height={dimensions.h}
                backgroundColor="var(--bg)"
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                warmupTicks={80}
                cooldownTicks={200}
                onEngineStop={() => {
                  if (fgRef.current) {
                    fgRef.current.d3Force('charge')?.strength(graphMode === 'associative' ? -400 : -300);
                    fgRef.current.d3Force('link')?.distance(graphMode === 'associative' ? 80 : 60);
                  }
                }}
                nodeLabel={(node: FGNode) => `${node.label}\n(${node.type.replace(/_/g, " ")})`}
                nodeColor={(node: FGNode) => {
                  if (graphMode === "associative" && spreadActivated.has(node.id)) return "#F59E0B";
                  if (node.id === selectedNode?.id) return "#ECEAE7";
                  return node.color;
                }}
                nodeRelSize={graphMode === "associative" ? 9 : 7}
                nodeVal={(node: FGNode) =>
                  graphMode === "entity"
                    ? node.type === "deal" ? 3 : node.type === "amendment" ? 2.5 : 1.5
                    : 1.5
                }
                linkColor={(link: FGLink) =>
                  graphMode === "associative"
                    ? link.strong
                      ? `rgba(201,100,66,${Math.min(0.85, 0.45 + (link.weight ?? 1) * 0.12)})`
                      : "rgba(245,158,11,0.45)"
                    : "rgba(92,91,88,0.35)"
                }
                linkWidth={(link: FGLink) =>
                  graphMode === "associative"
                    ? link.strong ? Math.max(2, (link.weight ?? 1) * 1.3) : 1
                    : 1.2
                }
                linkLineDash={(link: FGLink) =>
                  graphMode === "associative" && !link.strong ? [4, 4] : null
                }
                linkLabel={(link: FGLink) => link.label}
                linkDirectionalParticles={(link: FGLink) =>
                  graphMode === "associative" && link.strong ? 2 : 0
                }
                linkDirectionalParticleSpeed={0.003}
                linkDirectionalParticleColor={() => "rgba(201,100,66,0.75)"}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isSpread = spreadActivated.has(node.id);
                  const label = node.label;
                  const fontSize = Math.max(9, 13 / globalScale);
                  const r = (graphMode === "associative" ? 11 : node.type === "deal" ? 13 : 9) * (isSelected ? 1.25 : 1);

                  if (isSpread) {
                    ctx.beginPath();
                    ctx.arc(node.x!, node.y!, r + 9, 0, 2 * Math.PI);
                    ctx.fillStyle = "rgba(245,158,11,0.10)";
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(node.x!, node.y!, r + 5, 0, 2 * Math.PI);
                    ctx.strokeStyle = "#F59E0B";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }

                  if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(node.x!, node.y!, r + 5, 0, 2 * Math.PI);
                    ctx.fillStyle = `${node.color}22`;
                    ctx.fill();
                  }

                  const nodeColor = isSpread ? "#F59E0B" : node.color;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                  ctx.fillStyle = isSelected ? nodeColor : `${nodeColor}BB`;
                  ctx.fill();

                  if (isSelected) {
                    ctx.strokeStyle = "rgba(236,234,231,0.9)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }

                  ctx.font = `${fontSize}px "DM Sans", "Inter", sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  const lines = label.split("\n");
                  const lineH = fontSize * 1.25;
                  const startY = node.y! + r + 7;
                  ctx.fillStyle = "rgba(236,234,231,0.85)";
                  lines.forEach((line, i) => {
                    ctx.fillText(line, node.x!, startY + i * lineH);
                  });
                }}
                nodeCanvasObjectMode={() => "after"}
              />
            )}
          </div>

          {/* Right info panel */}
          <div style={{
            width: 268,
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-sidebar)",
            flexShrink: 0,
            overflowY: "auto",
          }}>
            {/* Legend */}
            <div style={{ padding: "16px 14px", borderBottom: "1px solid var(--border-muted)" }}>
              <div className="section-heading">Node types</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {legend.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{item.label}</span>
                  </div>
                ))}
                {graphMode === "associative" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>Spreading activated</span>
                  </div>
                )}
              </div>

              {graphMode === "associative" && (
                <div style={{ marginTop: 14 }}>
                  <div className="section-heading">Edge types</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 1, borderTop: "1.5px dashed #F59E0B", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>Emerging (1 recall)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 2, background: "var(--accent)", borderRadius: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>Established (2+ recalls)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Selected node */}
            <div style={{ padding: "14px", flex: 1 }}>
              {selectedNode ? (
                <div className="fade-up">
                  <div className="section-heading" style={{ marginBottom: 10 }}>Selected node</div>
                  <div className="card" style={{ padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 4, lineHeight: 1.4 }}>
                      {selectedNode.label}
                    </div>
                    <NodeTypeIcon type={selectedNode.type} />
                  </div>

                  {graphMode === "associative" && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="section-heading">Spreading activation</div>
                      {spreadLoading ? (
                        <div style={{ display: "flex", gap: 5, alignItems: "center", paddingTop: 8 }}>
                          <div className="dot" /><div className="dot" /><div className="dot" />
                          <span style={{ fontSize: 11.5, color: "var(--text-3)", marginLeft: 4 }}>Traversing graph…</span>
                        </div>
                      ) : spreadActivated.size > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                          {Array.from(spreadActivated).map((sid) => (
                            <div key={sid} className="card" style={{ padding: "9px 12px" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 2 }}>{sid}</div>
                              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                                {spreadCounts[sid] ?? "?"} co-retrieval{spreadCounts[sid] !== 1 ? "s" : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
                          No associative links yet. Ask more questions to build the graph.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => { setSelectedNode(null); setSpreadActivated(new Set()); }}
                    style={{
                      width: "100%",
                      padding: "7px",
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-3)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
                  >
                    Deselect
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 8px", color: "var(--text-3)" }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ marginBottom: 10, opacity: 0.4 }}>
                    <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="24" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="24" cy="23" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="6.5" y1="7" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="21.5" y1="7" x2="17" y2="11" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="6.5" y1="21" x2="11" y2="17" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="21.5" y1="21" x2="17" y2="17" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <p style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    {graphMode === "entity"
                      ? "Click any node to inspect it"
                      : "Click a call node to run spreading activation"}
                  </p>
                </div>
              )}

              {/* Graph stats */}
              {currentGraphData && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-muted)" }}>
                  <div className="section-heading">Stats</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                    <div className="stat-row">
                      <span className="stat-label">Nodes</span>
                      <span className="stat-value">{currentGraphData.nodes.length}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Edges</span>
                      <span className="stat-value">{currentGraphData.edges.length}</span>
                    </div>
                    {graphMode === "associative" && currentGraphData.edges.length > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Max weight</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--amber)" }}>
                          {Math.max(...currentGraphData.edges.map((e) => e.weight ?? 1))}
                        </span>
                      </div>
                    )}
                    {graphMode === "entity" && (
                      <>
                        <div className="stat-row">
                          <span className="stat-label">Stakeholders</span>
                          <span className="stat-value">{currentGraphData.nodes.filter((n) => n.type === "stakeholder").length}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Resolved</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--green)" }}>
                            {currentGraphData.nodes.filter((n) => n.type === "objection_resolved").length}
                          </span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Open risks</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)" }}>
                            {currentGraphData.nodes.filter((n) => n.type === "objection_open").length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
