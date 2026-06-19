import { Suspense } from "react";

import OAuthCallbackClient from "./oauth-callback-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function OAuthCallbackPage({ params }: { params: Promise<{ provider: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full max-w-sm mx-auto mt-24 rounded-2xl" />}>
      <OAuthCallbackClient params={params} />
    </Suspense>
  );
}
