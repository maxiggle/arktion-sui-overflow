"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert, RefreshCcw } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RouteState
      badge="Public route error"
      title="This public page hit a snag."
      description="Try reloading the page or head back to discovery while we recover."
      details={error.digest ? `Error digest: ${error.digest}` : undefined}
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>
          <RefreshCcw />
          Retry
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">
            <TriangleAlert />
            Explore
          </Link>
        </Button>
      </div>
    </RouteState>
  );
}
