"use client";

import { Suspense } from "react";
import ObservationsInner from "./ObservationsInner";

export default function ObservationsPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0F172A", minHeight: "100vh" }} />}>
      <ObservationsInner />
    </Suspense>
  );
}
