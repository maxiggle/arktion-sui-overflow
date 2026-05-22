import Link from "next/link";
import { ArrowLeft, BookOpen, Home } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";

export default function PublicNotFound() {
  return (
    <RouteState
      badge="Public 404"
      title="That public route doesn’t exist."
      description="This page is part of the public surface, so visitors can recover without logging in."
      details="Use Explore to browse stories, or go back home if you landed here from an old link."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Home className="size-4" />
          Home
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <BookOpen className="size-4" />
          Explore
        </Link>
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>
    </RouteState>
  );
}
