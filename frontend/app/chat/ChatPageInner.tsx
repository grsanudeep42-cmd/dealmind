"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import Markdown from "@/app/components/Markdown";
import { agentChat, getDealInfo, type ChatResponse, type DealInfo, type MemorySource } from "@/lib/api";

/* ─── Types ─── */
interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  memories?: MemorySource[];
  reflectUsed?: boolean;
  model?: string;
  timestamp: number;
}

const SUGGESTED: Record<string, string[]> = {
  "acme-corp-deal": [
    "What concerns has Priya raised?",
    "Which competitors are being evaluated?",
    "What does AMD-2024-047 cover?",
    "What did Robert Walsh agree to on pricing?",
  ],
  "novatech-deal": [
    "What security concerns has Sarah Kim raised?",
    "What is NovaTech's encryption requirement?",
    "Did NovaTech reject shared infrastructure?",
    "What's the budget ceiling for NovaTech?",
  ],
};

/* ─── Sub-components ─── */
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 8L2 2l3.5 6L2 14l12-6z" fill="currentColor"/>
    </svg>
  );
}

function MemorySources({ memories }: { memories: MemorySource[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ paddingLeft: 30, marginTop: 10 }}>
      {/* Source pills */}
      <div className="source-row" style={{ paddingLeft: 0 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>Sources</span>
        {memories.slice(0, 4).map((m, i) => (
          <button
            key={m.document_id + i}
            className={`source-pill ${expanded ? "expanded" : ""}`}
            onClick={() => setExpanded(!expanded)}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.7 }}>
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <line x1="5" y1="3" x2="5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="5" cy="7" r="0.7" fill="currentColor"/>
            </svg>
            {m.call_number ? `Call #${m.call_number}` : m.document_id}
          </button>
        ))}
        {memories.length > 4 && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{memories.length - 4}</span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="memory-expand-card fade-up" style={{ marginLeft: 0, marginTop: 8 }}>
          {memories.map((m, i) => (
            <div key={m.document_id + i} className="memory-expand-item">
              <div className="memory-expand-label">
                {m.label || m.document_id}
                {m.relevance > 0 && (
                  <span style={{ marginLeft: 8, color: "var(--text-3)", fontWeight: 400 }}>
                    {(m.relevance * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              <div className="memory-expand-text">{m.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="msg-agent-wrap fade-up">
      <div className="msg-agent-header">
        <div className="agent-avatar">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="white">
            <circle cx="7" cy="7" r="2.5"/>
            <line x1="7" y1="1" x2="7" y2="4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="7" y1="10" x2="7" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="1" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="10" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="agent-name">Synapse</span>
      </div>
      <div className="thinking-wrap" style={{ paddingLeft: 30 }}>
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <span className="thinking-label">Recalling memories</span>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get("deal") || "acme-corp-deal";

  const [dealInfo, setDealInfo] = useState<DealInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = `synapse_chat_${dealId}`;

  /* Load chat history from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [dealId, STORAGE_KEY]);

  /* Persist chat history */
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep last 40 messages
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
      } catch { /* ignore */ }
    }
  }, [messages, STORAGE_KEY]);

  useEffect(() => {
    getDealInfo(dealId).then(setDealInfo).catch(() => null);
  }, [dealId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: text.trim(), timestamp: Date.now() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: ChatResponse = await agentChat(dealId, text.trim());
      const agentMsg: Message = {
        id: `a-${Date.now()}`,
        role: "agent",
        text: res.answer,
        memories: res.memories_used,
        reflectUsed: res.reflect_used,
        model: res.model,
        timestamp: Date.now(),
      };
      setMessages((p) => [...p, agentMsg]);
    } catch (err: unknown) {
      setMessages((p) => [...p, {
        id: `err-${Date.now()}`,
        role: "agent",
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [dealId, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleDealChange = (newDeal: string) => {
    router.push(`/chat?deal=${newDeal}`);
  };

  const suggestions = SUGGESTED[dealId] || SUGGESTED["acme-corp-deal"];

  return (
    <div className="app-shell">
      <Sidebar dealId={dealId} onDealChange={handleDealChange} />

      {/* Main chat area */}
      <main className="main-content" style={{ position: "relative" }}>
        <div className="chat-col">
          {messages.length === 0 ? (
            /* Welcome state */
            <div className="suggestions">
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-1)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                  {dealInfo?.deal_name?.split("—")[0]?.trim() || "Deal Intelligence"}
                </h1>
                <p style={{ fontSize: 13.5, color: "var(--text-3)", lineHeight: 1.7, maxWidth: 520 }}>
                  Ask anything about this deal. Synapse recalls the exact memories from the exact call — every objection, commitment, and stakeholder concern.
                </p>
                {dealInfo && (
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    <span className="badge badge-green">{dealInfo.deal_name?.match(/\$[\d.]+[KM]?/)?.[0] || ""} ARR</span>
                    <span className="badge badge-muted">{dealInfo.stage}</span>
                    <span className="badge badge-muted">{dealInfo.calls.length} calls tracked</span>
                  </div>
                )}
              </div>

              <div className="section-heading">Suggested questions</div>
              <div className="suggestions-grid">
                {suggestions.map((q) => (
                  <button key={q} className="suggestion-btn" onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="chat-messages">
              {/* Clear history button */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <button
                  onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: 11,
                    color: "var(--text-3)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; (e.currentTarget as HTMLElement).style.borderColor = "#3D3C3A"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                >
                  Clear history
                </button>
              </div>

              {messages.map((msg) => (
                <div key={msg.id} className="fade-up">
                  {msg.role === "user" ? (
                    <div className="msg-user-wrap">
                      <div className="msg-user">{msg.text}</div>
                    </div>
                  ) : (
                    <div className="msg-agent-wrap">
                      <div className="msg-agent-header">
                        <div className="agent-avatar">
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="white">
                            <circle cx="7" cy="7" r="2.5"/>
                            <line x1="7" y1="1" x2="7" y2="4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                            <line x1="7" y1="10" x2="7" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                            <line x1="1" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                            <line x1="10" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <span className="agent-name">Synapse</span>
                        {msg.reflectUsed && (
                          <span className="badge badge-accent" style={{ fontSize: 10 }}>Reflect</span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="msg-agent-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      {msg.memories && msg.memories.length > 0 && (
                        <MemorySources memories={msg.memories} />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && <ThinkingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input bar — floating at bottom */}
        <div className="input-bar-wrap">
          <div className="input-bar">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this deal…"
              disabled={loading}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              title="Send (Enter)"
            >
              <SendIcon />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--text-3)" }}>
            Enter to send · Shift+Enter for new line · History saved per deal
          </div>
        </div>
      </main>
    </div>
  );
}
