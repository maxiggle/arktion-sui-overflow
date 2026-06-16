import React from "react";

const FEATURES = [
  {
    num: "01",
    title: "zero platform cut",
    body: "smart contracts route earnings directly to your wallet. no middleman, no percentage skimmed off the top, no unexplained fees at month-end.",
  },
  {
    num: "02",
    title: "own your ip on-chain",
    body: "your series is registered under your arktionpassport on the sui blockchain. your work belongs to you — permanently and verifiably, even if arktion ceased to exist tomorrow.",
  },
  {
    num: "03",
    title: "earn ink for every read",
    body: "ink tokens flow to you automatically as readers consume your work. the more readers, the more you earn. no forms to fill, no thresholds to hit.",
  },
  {
    num: "04",
    title: "publish with full control",
    body: "set your own release schedule, chapter pricing, and availability. no algorithm decides your reach based on whether you posted yesterday.",
  },
] as const;

export function CreatorsSection() {
  return (
    <section
      id="creators"
      className="bg-neutral-950 py-24 md:py-32 scroll-mt-24 border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-16 lg:gap-24 items-start">
          {/* Left — sticky heading */}
          <div className="lg:sticky lg:top-32">
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-5">
              creators
            </p>
            <h2
              className="hero-title font-medium text-white leading-none mb-6"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              your work,
              <br />
              your terms.
            </h2>
            <p className="text-[15px] text-white/50 leading-relaxed max-w-xs">
              arktion is built for creators who are done asking permission from
              platforms that were never on their side.
            </p>
          </div>

          {/* Right — numbered feature list */}
          <div>
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="flex gap-6 items-start py-8 border-b border-white/[0.07] first:border-t first:border-white/[0.07]"
              >
                <span className="text-xs text-white/25 tracking-widest font-mono shrink-0 mt-1 w-6">
                  {f.num}
                </span>
                <div>
                  <h3 className="text-white text-lg font-medium mb-2 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
