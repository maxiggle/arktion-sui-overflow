"use client";

import React from "react";

export function HeroSection() {
  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="https://res.cloudinary.com/dzrtihz9v/video/upload/v1781220438/I_need_you_to_create_a_video_o_acftxk.mp4"
      />

      {/* Foreground content */}
      <div className="relative h-full w-full">

        {/* Staggered headline */}
        <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-4 md:left-10 top-[18%]">
          own
        </h1>
        <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] right-4 md:right-10 top-[36%]">
          your
        </h1>
        <h1 className="hero-title absolute text-white font-medium text-[11vw] md:text-[10vw] left-[4%] md:left-[8%] top-[57%]">
          stories
        </h1>

        {/* Description — sits between "your" and "stories" */}
        <p className="absolute left-6 md:left-10 top-[48%] max-w-[220px] text-[14px] leading-snug text-white/80">
          read manga, manhwa & web novels. earn ink with every chapter. your history on-chain, forever.
        </p>

        {/* Stat — top right */}
        <div className="absolute right-6 md:right-24 top-[14%]">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[20deg]" />
            <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+50k</span>
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1 text-right">active readers</p>
        </div>

        {/* Bottom gradient overlay */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />

        {/* Stat — bottom left */}
        <div className="absolute left-6 md:left-20 bottom-20 md:bottom-24">
          <div className="flex items-center gap-3">
            <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+2.5k</span>
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1">series published</p>
        </div>

        {/* Stat — bottom right */}
        <div className="absolute right-6 md:right-20 bottom-16 md:bottom-20">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
            <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+300k</span>
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1 text-right">chapters read</p>
        </div>

      </div>
    </section>
  );
}
