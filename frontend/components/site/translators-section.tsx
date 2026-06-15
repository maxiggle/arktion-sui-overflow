import React from "react";

const CARDS = [
  {
    title: "earn per read",
    body: "every time a reader opens your translated chapter, you earn ink tokens. passive, automatic, and permanent — even while you sleep.",
  },
  {
    title: "on-chain attribution",
    body: "your name is recorded on-chain alongside every chapter you translate. no platform can remove your credit. no dispute over who did the work.",
  },
  {
    title: "verified work rises",
    body: "community-verified translations rank higher in discovery. quality gets rewarded with reach — not just appreciation.",
  },
  {
    title: "split earnings openly",
    body: "work directly with original creators to agree on ink split percentages. everything written into a smart contract, visible to both parties.",
  },
] as const;

export function TranslatorsSection() {
  return (
    <section
      id="translators"
      className="bg-black py-24 md:py-32 scroll-mt-24 border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        {/* Heading block */}
        <div className="mb-16 md:mb-20 max-w-2xl">
          <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-5">translators</p>
          <h2
            className="hero-title font-medium text-white leading-none mb-6"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            stories without<br />borders.
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed">
            translators are the reason manga and manhwa reach the world. arktion is the first platform to treat them as first-class earners — not volunteers.
          </p>
        </div>

        {/* 2×2 card grid */}
        <div className="grid sm:grid-cols-2 gap-px bg-white/[0.06]">
          {CARDS.map((card) => (
            <div key={card.title} className="bg-black p-8 md:p-10">
              <h3 className="text-white text-xl font-medium tracking-tight mb-3">
                {card.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
