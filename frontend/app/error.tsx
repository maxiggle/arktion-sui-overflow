"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";
import { Button } from "@/components/ui/button";

export default function RootError({
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
      badge="Application error"
      title="Something broke on this route."
      description="We hit an unexpected error while rendering this page. You can retry or return to the home screen."
      details={error.digest ? `Error digest: ${error.digest}` : undefined}
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>
          <RefreshCcw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <AlertTriangle />
            Go home
          </Link>
        </Button>
      </div>
    </RouteState>
  );
}
