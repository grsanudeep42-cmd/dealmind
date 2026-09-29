"use client";

import { useCallback, useRef, useState } from "react";
import { uploadTranscript, type UploadTranscriptResponse } from "@/lib/api";

interface UploadModalProps {
  dealId: string;
  nextCallNumber: number;
  onClose: () => void;
  onSuccess: (result: UploadTranscriptResponse) => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function UploadModal({
  dealId,
  nextCallNumber,
  onClose,
  onSuccess,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [callNum, setCallNum] = useState(nextCallNumber);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "txt") {
      setErrorMsg("Only .pdf and .txt files are supported.");
      return;
    }
    setErrorMsg("");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState("uploading");
    setErrorMsg("");
    try {
      const result = await uploadTranscript(dealId, callNum, file);
      setState("done");
      onSuccess(result);
    } catch (err: unknown) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeUp 0.15s ease",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 650, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              Upload Call Transcript
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              PDF or .txt · ingested into Hindsight instantly
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              color: "var(--text-3)",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
          >
            ×
          </button>
        </div>

        {/* Deal ID (read-only) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Deal ID
          </label>
          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--border-muted)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--text-2)",
            fontFamily: "monospace",
          }}>
            {dealId}
          </div>
        </div>

        {/* Call number */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Call Number
          </label>
          <input
            type="number"
            min={1}
            value={callNum}
            onChange={e => setCallNum(Number(e.target.value))}
            style={{
              width: "100%",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 13,
              color: "var(--text-1)",
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Drop zone */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Transcript File
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : file ? "var(--green)" : "var(--border)"}`,
              borderRadius: 10,
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "var(--accent-dim)" : file ? "var(--green-dim)" : "var(--bg)",
              transition: "all 0.15s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {file ? (
              <>
                {/* File icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <polyline points="9,15 11,17 15,13"/>
                </svg>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </div>
              </>
            ) : (
              <>
                {/* Upload icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16,16 12,12 8,16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                  Drop your transcript here
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  or click to browse · .pdf and .txt
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{
            background: "var(--red-dim)",
            border: "1px solid rgba(229,72,77,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12.5,
            color: "var(--red)",
            lineHeight: 1.5,
          }}>
            {errorMsg}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || state === "uploading" || state === "done"}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: state === "done" ? "var(--green)" : "var(--accent)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: !file || state === "uploading" || state === "done" ? "not-allowed" : "pointer",
            opacity: !file || state === "uploading" ? 0.55 : 1,
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {state === "uploading" ? (
            <>
              <UploadSpinner />
              Ingesting into Hindsight…
            </>
          ) : state === "done" ? (
            <>✅ Call #{callNum} ingested!</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16,16 12,12 8,16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Upload &amp; Ingest into Hindsight
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function UploadSpinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
