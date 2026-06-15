"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

// ─── Shared avatar helper ──────────────────────────────────────────────────────

function UserAvatar({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "?";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={displayName}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ${className}`}
    >
      {initials}
    </span>
  );
}

// ─── Desktop header actions (PublicShell) ─────────────────────────────────────

export function PublicHeaderActions() {
  const { isAuthenticated, isLoading } = useAuth();

  // Avoid a flash of the wrong buttons while the token is being verified.
  if (isLoading) {
    return <div className="h-8 w-32 animate-pulse rounded-full bg-muted" />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <UserAvatar className="size-7" />
        <Button asChild size="sm">
          <Link href="/dashboard">
            <LayoutDashboard className="size-3.5" />
            Go to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/sign-in">Get started</Link>
      </Button>
    </div>
  );
}

// ─── Mobile sheet footer actions (PublicMobileNav) ────────────────────────────

export function MobileNavAuthActions() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <UserAvatar className="size-7 shrink-0" />
        <Button asChild className="flex-1">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="outline">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/sign-in">Get started</Link>
      </Button>
    </>
  );
}

// ─── Landing nav CTA (dark pill style) ───────────────────────────────────────

export function LandingNavCta() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-[46px] w-36 animate-pulse rounded-full bg-neutral-800/90" />
    );
  }

  if (isAuthenticated && user) {
    const displayName = user.displayName ?? user.email?.split("@")[0] ?? "reader";
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 bg-white text-black text-sm font-normal rounded-full pl-2 pr-5 py-2 hover:bg-neutral-200 transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
            {initials}
          </span>
        )}
        dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="bg-white text-black text-sm font-normal rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors"
    >
      start reading
    </Link>
  );
}
