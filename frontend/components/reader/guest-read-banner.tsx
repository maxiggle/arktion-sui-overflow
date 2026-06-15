"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/**
 * Sticky bottom banner shown to unauthenticated readers.
 * Explains that reading works as a guest but INK earning requires sign-in.
 * Dismissible within the session (state lives in component, not persisted).
 */
export function GuestReadBanner() {
  const { isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't render for signed-in users or while loading
  if (isLoading || isAuthenticated || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-neutral-900/95 backdrop-blur border-t border-white/[0.07] px-5 py-3.5"
    >
      {/* Left: status indicator + message */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
        <p className="text-xs text-white/55 leading-snug truncate">
          you&apos;re reading as a guest —{" "}
          <span className="text-white/85">sign in to earn ink and save your progress</span>
        </p>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/sign-in"
          className="text-xs bg-white text-black font-medium rounded-full px-4 py-1.5 hover:bg-neutral-200 transition-colors"
        >
          sign in
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="dismiss"
          className="text-white/25 hover:text-white/55 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
