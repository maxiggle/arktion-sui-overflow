"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildGoogleOAuthUrl } from "@/lib/auth";
import { useAuth } from "@/contexts/auth-context";

// ─── Google G icon ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Arktion logo ─────────────────────────────────────────────────────────────

function ArktionLogo() {
  return (
    <svg
      viewBox="0 0 256 256"
      className="h-6 w-6"
      fill="#ffffff"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BENEFITS = [
  "earn ink tokens for every chapter you read",
  "on-chain reading history via arktionpassport",
  "save your library and reading progress",
  "tip creators directly in usdc",
] as const;

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Already signed in → go to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Surface errors passed back from /auth/callback
  useEffect(() => {
    const err = params.get("error");
    if (err === "auth_failed") setError("sign in failed — please try again");
    else if (err === "no_token") setError("google didn't return a token — try again");
    else if (err) setError(decodeURIComponent(err));
  }, [params]);

  function handleGoogleSignIn() {
    try {
      window.location.href = buildGoogleOAuthUrl();
    } catch {
      setError("google client id is not configured");
    }
  }

  return (
    <section className="min-h-screen bg-black flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px]">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-12">
          <ArktionLogo />
          <span className="text-white text-base font-normal tracking-tight">
            arktion
          </span>
        </div>

        {/* Headline */}
        <h1
          className="hero-title font-medium text-white leading-none mb-4"
          style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)" }}
        >
          your reading<br />identity,<br />on-chain.
        </h1>
        <p className="text-white/45 text-sm leading-relaxed mb-10">
          sign in with google to claim your arktionpassport, earn ink with every chapter, and own your reading history forever.
        </p>

        {/* Error */}
        {error && (
          <p className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black text-sm font-medium rounded-full px-6 py-[14px] hover:bg-neutral-100 transition-colors"
        >
          <GoogleIcon />
          continue with google
        </button>

        {/* Guest bypass */}
        <p className="mt-5 text-center text-[11px] text-white/25">
          just browsing?{" "}
          <Link
            href="/explore"
            className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
          >
            continue as guest
          </Link>
          {" "}— no ink earned
        </p>

        {/* Divider */}
        <div className="my-10 h-px bg-white/[0.07]" />

        {/* Benefits */}
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-px text-white/20 text-xs shrink-0">—</span>
              <span className="text-xs text-white/35 leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
