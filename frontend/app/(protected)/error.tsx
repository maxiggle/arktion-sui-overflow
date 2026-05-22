"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShieldAlert, RefreshCcw } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";
import { Button } from "@/components/ui/button";

export default function ProtectedError({
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
      badge="Protected route error"
      title="We couldn’t finish loading this workspace."
      description="This section is reserved for signed-in readers, creators, and admins. Retry or return to your dashboard."
      details={error.digest ? `Error digest: ${error.digest}` : undefined}
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>
          <RefreshCcw />
          Retry
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ShieldAlert />
            Dashboard
          </Link>
        </Button>
      </div>
    </RouteState>
  );
}
