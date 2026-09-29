"use client";

import { Suspense } from "react";
import ChatPageInner from "./ChatPageInner";

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0F172A", minHeight: "100vh" }} />}>
      <ChatPageInner />
    </Suspense>
  );
}
