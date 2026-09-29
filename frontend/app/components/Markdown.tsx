/**
 * Lightweight inline markdown renderer.
 * Handles: headings, bold, italic, bullet lists, horizontal rules,
 * tables, and inline code. Zero external dependencies.
 */
import React from "react";

function parseInline(text: string): React.ReactNode[] {
  // Bold **text** or __text__, italic *text* or _text_, code `text`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code key={match.index} style={{ fontFamily: "ui-monospace, 'SF Mono', monospace", fontSize: "0.88em", background: "var(--bg-hover)", padding: "1px 5px", borderRadius: 3 }}>
          {match[5]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderTable(headerLine: string, bodyLines: string[]): React.ReactNode {
  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);

  const headers = parseRow(headerLine);
  const rows = bodyLines.filter((l) => !/^\|[\s:-]+\|/.test(l)).map(parseRow);

  return (
    <div style={{ overflowX: "auto", marginBottom: 14 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "7px 12px", textAlign: "left", color: "var(--text-1)", fontWeight: 600, borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                {parseInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid var(--border-muted)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "7px 12px", color: "var(--text-2)", fontSize: 12.5, verticalAlign: "top" }}>
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MarkdownProps {
  children: string;
  style?: React.CSSProperties;
}

export default function Markdown({ children, style }: MarkdownProps) {
  const lines = children.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = [20, 17, 15, 14];
      const weights = [700, 600, 600, 600];
      elements.push(
        <div key={i} style={{ fontSize: sizes[level - 1] ?? 14, fontWeight: weights[level - 1] ?? 600, color: "var(--text-1)", marginTop: level === 1 ? 8 : 16, marginBottom: 8, letterSpacing: "-0.01em", lineHeight: 1.35 }}>
          {parseInline(hMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<div key={i} style={{ borderTop: "1px solid var(--border)", margin: "14px 0" }} />);
      i++;
      continue;
    }

    // Table — detect by leading pipe
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1])) {
      const tableLines = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      elements.push(<div key={i}>{renderTable(tableLines[0], tableLines.slice(1))}</div>);
      i = j;
      continue;
    }

    // Bullet list — collect consecutive items
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*+]|\s*\d+\.)\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+\d.]+\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: "8px 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 5 }}>
          {items.map((item, li) => (
            <li key={li} style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={i} style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.75, margin: "0 0 10px" }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div style={{ ...style }}>
      {elements}
    </div>
  );
}
