"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

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

const NEXT_STEPS = [
  "every chapter you read earns ink tokens — automatically",
  "your library syncs on-chain as you progress",
  "tip creators directly with usdc, no platform cut",
  "your passport grows with badges as you read more",
] as const;

export default function OnboardingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Guard: not signed in → back to sign-in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <span className="block h-5 w-5 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  const firstName = user.displayName?.split(" ")[0]?.toLowerCase() ?? null;
  const shortAddress = user.walletAddress
    ? `${user.walletAddress.slice(0, 8)}…${user.walletAddress.slice(-6)}`
    : null;

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

        {/* Welcome headline */}
        <h1
          className="hero-title font-medium text-white leading-none mb-3"
          style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)" }}
        >
          {firstName ? `welcome,\n${firstName}.` : "welcome\naboard."}
        </h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          your arktionpassport has been minted. your reading identity is now on-chain.
        </p>

        {/* Passport card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">
              arktionpassport
            </p>
            <span className="text-[10px] text-emerald-400/80 tracking-wide">
              ✦ minted
            </span>
          </div>

          {/* Avatar + name row */}
          <div className="flex items-center gap-3 mb-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover opacity-90"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-sm">
                {user.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm truncate">
                {user.displayName ?? "reader"}
              </p>
              {user.email && (
                <p className="text-white/30 text-xs truncate">{user.email}</p>
              )}
            </div>
          </div>

          {/* Wallet address */}
          <div className="bg-black/40 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-white/25 mb-1 tracking-widest uppercase">
              sui wallet
            </p>
            <p className="text-white/70 text-xs font-mono tracking-tight break-all">
              {shortAddress ?? "deriving address…"}
            </p>
          </div>
        </div>

        {/* What's next */}
        <div className="mb-10">
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-4">
            what you get
          </p>
          <ul className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-px text-white/20 text-xs shrink-0">—</span>
                <span className="text-xs text-white/40 leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/explore"
          className="block w-full text-center bg-white text-black text-sm font-medium rounded-full px-6 py-[14px] hover:bg-neutral-100 transition-colors"
        >
          start reading →
        </Link>

        <p className="mt-4 text-center text-[11px] text-white/20">
          your passport and ink balance are always at{" "}
          <Link href="/passport" className="underline underline-offset-2 hover:text-white/40 transition-colors">
            /passport
          </Link>
        </p>

      </div>
    </section>
  );
}
