"use client";

import React, { useEffect, useState } from "react";
import { LandingNavCta } from "@/components/site/auth-nav-actions";

const NAV_LINKS = [
  { label: "problem",     href: "#problem" },
  { label: "creators",    href: "#creators" },
  { label: "translators", href: "#translators" },
  { label: "payments",    href: "#payments" },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed z-50 left-0 right-0 top-0 flex items-center justify-between gap-4 px-6 md:px-10 transition-all duration-300 ${
        scrolled ? "py-4" : "pt-6 pb-0"
      }`}
    >
      {/* Left pill — logo */}
      <a
        href="#"
        className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur rounded-full pl-4 pr-6 py-3"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/arktion-icon-dark.svg"
          alt="Arktion"
          className="h-5 w-5"
        />
        <span className="text-white text-sm font-normal tracking-tight">arktion</span>
      </a>

      {/* Center pill — section anchors, hidden on mobile */}
      <div className="hidden md:flex items-center gap-1 bg-neutral-900/90 backdrop-blur rounded-full px-3 py-2">
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="text-neutral-300 hover:text-white transition-colors text-sm px-5 py-2 rounded-full"
          >
            {label}
          </a>
        ))}
      </div>

      {/* Right CTA — auth-aware */}
      <LandingNavCta />
    </nav>
  );
}
