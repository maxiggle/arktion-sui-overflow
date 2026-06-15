import React from "react";

const COMPLAINTS = [
  {
    quote:
      "patreon took 12% off the top this month. for what, exactly? nobody can give me a straight answer.",
    author: "manga creator",
    platform: "Patreon",
    color: "#FEF08A",
    rotate: "-2.5deg",
    offsetY: "0px",
  },
  {
    quote:
      "my series got removed without any warning. three years of work. no appeal, no explanation, no recovery.",
    author: "writer",
    platform: "Wattpad",
    color: "#FDE68A",
    rotate: "2deg",
    offsetY: "20px",
  },
  {
    quote:
      "i have 40,000 followers and i can't pay rent. the platform keeps all the ad revenue and calls it 'exposure'.",
    author: "webtoon creator",
    platform: "LINE Webtoon",
    color: "#FEF9C3",
    rotate: "-1.5deg",
    offsetY: "-12px",
  },
  {
    quote:
      "missed one week of posting. the algorithm buried my series. two years of growth, gone in days.",
    author: "creator",
    platform: "Tapas",
    color: "#DCFCE7",
    rotate: "3deg",
    offsetY: "8px",
  },
  {
    quote:
      "my readers in southeast asia literally can't support me. the payment methods just don't work there.",
    author: "manhwa creator",
    platform: "multiple platforms",
    color: "#DBEAFE",
    rotate: "-2deg",
    offsetY: "-8px",
  },
  {
    quote:
      "if this platform ever shuts down, five years of my work disappears. i own nothing. i never did.",
    author: "web novel author",
    platform: "Royal Road",
    color: "#FEE2E2",
    rotate: "1.5deg",
    offsetY: "14px",
  },
] as const;

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="bg-black py-24 md:py-32 scroll-mt-24 border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        {/* Heading block */}
        <div className="mb-16 md:mb-24">
          <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-5">
            the problem
          </p>
          <h2
            className="hero-title font-medium text-white leading-none mb-6"
            style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
          >
            sound familiar?
          </h2>
          <p className="max-w-sm text-[15px] text-white/50 leading-relaxed">
            we talked to creators, translators, and readers. these are the complaints that kept coming up.
          </p>
        </div>

        {/* Sticky notes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {COMPLAINTS.map((note, i) => (
            <div
              key={i}
              className="relative p-6 pt-8"
              style={{
                backgroundColor: note.color,
                transform: `rotate(${note.rotate}) translateY(${note.offsetY})`,
                boxShadow: "4px 8px 28px rgba(0,0,0,0.55)",
              }}
            >
              {/* Pin */}
              <span
                className="absolute top-3 left-1/2 -translate-x-1/2 block w-3 h-3 rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.18)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }}
              />

              <p className="text-neutral-800 text-[15px] leading-relaxed font-normal">
                &ldquo;{note.quote}&rdquo;
              </p>
              <p className="mt-5 text-[11px] uppercase tracking-wider text-neutral-500">
                — {note.author} · {note.platform}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
