"use client";

import { Suspense } from "react";
import GraphPageInner from "./GraphPageInner";

export default function GraphPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0F172A", minHeight: "100vh" }} />}>
      <GraphPageInner />
    </Suspense>
  );
}
