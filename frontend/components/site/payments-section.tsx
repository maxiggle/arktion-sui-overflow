import React from "react";

const STEPS = [
  {
    num: "01",
    verb: "read",
    body: "every chapter you read earns ink tokens — for you and the creator. readers build a real stake in the platform they love.",
    tag: "automatic · no action needed",
  },
  {
    num: "02",
    verb: "earn",
    body: "creators receive ink and usdc directly to their wallet. no platform intermediary, no delayed payouts, no threshold before you can withdraw.",
    tag: "smart contract · instant · transparent",
  },
  {
    num: "03",
    verb: "own",
    body: "your ink balance, reading history, and earnings are permanently on-chain. no black-box accounting. no platform can revoke what you've built.",
    tag: "sui blockchain · verifiable · forever",
  },
] as const;

export function PaymentsSection() {
  return (
    <section
      id="payments"
      className="bg-neutral-950 py-24 md:py-32 scroll-mt-24 border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        {/* Heading block */}
        <div className="mb-16 md:mb-20 max-w-2xl">
          <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-5">payments</p>
          <h2
            className="hero-title font-medium text-white leading-none mb-6"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            money that reaches<br />creators.
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed">
            ink tokens, usdc tips, and gas-free transactions. we sponsor the gas so readers never have to think about blockchain overhead.
          </p>
        </div>

        {/* 3-step flow */}
        <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
          {STEPS.map((step) => (
            <div key={step.num} className="bg-neutral-950 p-8 md:p-10 flex flex-col">
              {/* Large ghost number */}
              <span
                className="hero-title font-medium text-white/8 leading-none block mb-6 select-none"
                style={{ fontSize: "clamp(4rem, 8vw, 7rem)", color: "rgba(255,255,255,0.07)" }}
              >
                {step.num}
              </span>

              <h3
                className="hero-title font-medium text-white mb-4"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                {step.verb}
              </h3>

              <p className="text-white/50 text-sm leading-relaxed flex-1">{step.body}</p>

              <p className="mt-6 text-[10px] tracking-[0.22em] uppercase text-white/25">
                {step.tag}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-[11px] text-white/25 tracking-wide text-center">
          powered by sui blockchain · gas fees sponsored by arktion · no crypto knowledge required to get started
        </p>

      </div>
    </section>
  );
}
