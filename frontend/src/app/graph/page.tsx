import { Suspense } from "react";

import GraphPageClient from "./graph-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function GraphPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full max-w-7xl mx-auto rounded-2xl" />}>
      <GraphPageClient />
    </Suspense>
  );
}
