import { Suspense } from "react";
import SimulationPage from "./SimulationPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationPage />
    </Suspense>
  );
}
