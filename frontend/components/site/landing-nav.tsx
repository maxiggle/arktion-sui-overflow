"use client";

import React, { useEffect, useState } from "react";

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
        <svg
          viewBox="0 0 256 256"
          className="h-5 w-5"
          fill="#ffffff"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
        </svg>
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

      {/* Right CTA */}
      <a
        href="/sign-in"
        className="bg-white text-black text-sm font-normal rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors"
      >
        start reading
      </a>
    </nav>
  );
}
