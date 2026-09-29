const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dealmind-v2bg.onrender.com";

export interface Deal {
  deal_id: string;
  deal_name: string;
  stage: string;
  arr: string;
  calls: number;
}

export interface MemorySource {
  text: string;
  document_id: string;
  relevance: number;
  call_number: number | null;
  week: number | null;
  attendees: string[];
  topic: string;
  label: string;
}

export interface AssociativeMemory {
  document_id: string;
  label: string;
  co_retrieval_count: number;
}

export interface ChatResponse {
  answer: string;
  memories_used: MemorySource[];
  associative_memories: AssociativeMemory[];
  reflect_used: boolean;
  model: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight?: number;
  strong?: boolean;
}

export interface GraphData {
  deal_id: string;
  deal_name?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AssociativeGraphData {
  deal_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SpreadingResult {
  seed_id: string;
  activated: { document_id: string; label: string; co_retrieval_count: number }[];
}

export interface InsightPattern {
  pattern: string;
  evidence: string;
  confidence: "high" | "emerging";
  deals: string[];
}

export interface InsightPatternsData {
  patterns: InsightPattern[];
  source: string;
  deals_analysed: string[];
}

export interface ObservationsData {
  deal_id: string;
  consolidated_summary: string;
  raw_memories: MemorySource[];
  total_memories: number;
}

export interface DealInfo {
  deal_id: string;
  deal_name: string;
  stage: string;
  expected_arr?: number;
  expected_close?: string;
  calls: Array<{
    call_number: number;
    week: number;
    document_id: string;
    attendees: string[];
    topic: string;
  }>;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function listDeals(): Promise<{ deals: Deal[] }> {
  return apiFetch("/deals");
}

export async function getDealInfo(dealId: string): Promise<DealInfo> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/info`);
}

export async function agentChat(dealId: string, message: string): Promise<ChatResponse> {
  return apiFetch("/agent/chat", {
    method: "POST",
    body: JSON.stringify({ deal_id: dealId, message }),
  });
}

export async function getDealGraph(dealId: string): Promise<GraphData> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/graph`);
}

export async function getAssociativeGraph(dealId: string): Promise<AssociativeGraphData> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/associative-graph`);
}

export async function getSpreadingActivation(dealId: string, seedId: string): Promise<SpreadingResult> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/spreading?seed_id=${encodeURIComponent(seedId)}`);
}

export async function getInsightPatterns(): Promise<InsightPatternsData> {
  return apiFetch("/insights/patterns");
}

export async function getDealObservations(dealId: string): Promise<ObservationsData> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/observations`);
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch("/health");
}

export interface RiskScore {
  deal_id: string;
  score: number;               // 0–100
  level: "Low" | "Medium" | "High" | "Critical";
  top_risks: string[];
  positive_signals: string[];
  summary: string;
}

export async function getDealRiskScore(dealId: string): Promise<RiskScore> {
  return apiFetch(`/deal/${encodeURIComponent(dealId)}/risk-score`);
}


export interface UploadTranscriptResponse {
  status: string;
  deal_id: string;
  document_id: string;
  call_number: number;
  message: string;
}

export async function uploadTranscript(
  dealId: string,
  callNumber: number,
  file: File
): Promise<UploadTranscriptResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("call_number", String(callNumber));

  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const res = await fetch(
    `${base}/deal/${encodeURIComponent(dealId)}/ingest`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json();
}
