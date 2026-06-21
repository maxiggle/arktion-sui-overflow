/**
 * Generates a dynamic SVG image for an ArktionPassport NFT.
 *
 * Used as the `image_url` in the Sui Display metadata:
 *   GET /passport/:address/image.svg
 *
 * Hard constraints (do not relax — this renders in zero-network sandboxes):
 *   - Single self-contained SVG string. No external fonts/images/CSS/JS, no @font-face.
 *     Only generic font families (system sans + monospace stacks).
 *   - Fully deterministic from the input. No Math.random, no Date — the endpoint is
 *     cached and an NFT image must always render identically.
 *   - Readability must not depend on SVG filters. Some explorers/marketplaces drop
 *     feGaussianBlur, so all glow is done with gradients that survive filter-less
 *     rendering, and no text sits on a blurred element.
 *   - Portrait 3:4 (600×800) with a ~9% safe inner margin so a centered square crop
 *     (y 100→700) still shows the wordmark, tier, hero stat, the three stats and the
 *     progress bar. Only the footer is allowed to fall outside the square.
 */

const W = 600;
const H = 800;

const LEVEL_NAMES: Record<number, string> = {
  1: 'Wanderer',
  2: 'Seeker',
  3: 'Devoted',
  4: 'Lorekeeper',
  5: 'Chronicle',
  6: 'Arktion Elder',
};

/** INK thresholds at which each level begins; index = level - 1. */
const LEVEL_THRESHOLDS = [0, 500, 2000, 6000, 15000, 40000];

interface TierPalette {
  primary: string; // structural accent (lines, strokes, bar)
  bright: string; // brightest highlight (values, emblem)
  halo: string; // radial-glow tint behind the medallion
  deep: string; // background floor tone for this tier
  metal: string; // prestige frame hairline (gold for top tiers)
}

/**
 * Ascending-prestige ramp. Lower tiers read cool and understated; higher tiers
 * warm toward gold so a level-up visibly feels rarer. Refined from the original
 * indigo→violet→cyan→emerald→amber→rose ramp.
 */
const TIER_PALETTES: Record<number, TierPalette> = {
  1: { primary: '#6d7dff', bright: '#aab6ff', halo: '#3a47b8', deep: '#090b16', metal: '#7c8cff' },
  2: { primary: '#2cc6f0', bright: '#8fe7ff', halo: '#176f93', deep: '#06111a', metal: '#5fd6ff' },
  3: { primary: '#22d39e', bright: '#7df0cd', halo: '#127a5c', deep: '#06140f', metal: '#46e3b4' },
  4: { primary: '#a77bff', bright: '#d3bcff', halo: '#5a36a8', deep: '#0d0819', metal: '#c9a6ff' },
  5: { primary: '#f5a524', bright: '#ffce6e', halo: '#9a6410', deep: '#140d03', metal: '#ffcf6e' },
  6: { primary: '#ff5d8f', bright: '#ffc27a', halo: '#9c2347', deep: '#150509', metal: '#ffd27a' },
};

export interface PassportImageData {
  walletAddress: string;
  suiObjectId: string;
  level: number;
  totalInkEarned: bigint | string;
  chaptersRead: number;
  seriesCompleted: number;
  seriesTracked: number;
}

// ── pure helpers ───────────────────────────────────────────────────────────────

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(Math.trunc(level), 1), 6);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 0x1234…abcd — short, recognizable, never near the edges. */
function truncateHex(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Deterministic comma grouping (avoids server-locale-dependent toLocaleString). */
function groupNumber(n: number): string {
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Compact INK: 0 · 310 · 1.2K · 40.0K · 1.5M. Handles bigint | string. */
function formatInk(ink: bigint | string): string {
  let n: bigint;
  try {
    n = BigInt(ink);
  } catch {
    n = 0n;
  }
  if (n < 0n) n = 0n;
  const num = Number(n);
  if (n >= 1_000_000n) return `${(num / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000n) return `${(num / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Stat counts: grouped under 100k, compacted above so columns never overflow. */
function formatCount(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 100_000) return `${(v / 1_000).toFixed(0)}K`;
  return groupNumber(v);
}

function inkToBigInt(ink: bigint | string): bigint {
  try {
    const n = BigInt(ink);
    return n < 0n ? 0n : n;
  } catch {
    return 0n;
  }
}

/** Mulberry32 — tiny deterministic PRNG so the starfield is seeded, not random. */
function makePrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromAddress(address: string): number {
  let hash = 2166136261;
  for (let i = 0; i < address.length; i++) {
    hash ^= address.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Address-seeded starfield across the full canvas, subtle enough to never hurt text. */
function buildStarfield(address: string, bright: string): string {
  const rand = makePrng(seedFromAddress(address));
  const stars: string[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (rand() * W).toFixed(1);
    const y = (rand() * H).toFixed(1);
    const r = (0.5 + rand() * 1.1).toFixed(2);
    const o = (0.12 + rand() * 0.4).toFixed(2);
    // A few address-unique accent sparkles; the rest are faint white dust.
    const accent = rand() > 0.86;
    const fill = accent ? bright : '#ffffff';
    const op = accent ? Math.min(0.6, Number(o) + 0.15).toFixed(2) : o;
    stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${op}"/>`);
  }
  return stars.join('');
}

/** Flat-top hexagon medallion outline points. */
function hexagonPoints(cx: number, cy: number, r: number): string {
  const dx = r;
  const hx = r / 2;
  const hy = r * 0.866;
  const pts: Array<[number, number]> = [
    [cx - dx, cy],
    [cx - hx, cy - hy],
    [cx + hx, cy - hy],
    [cx + dx, cy],
    [cx + hx, cy + hy],
    [cx - hx, cy + hy],
  ];
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

// ── renderer ─────────────────────────────────────────────────────────────────

export function generatePassportSvg(data: PassportImageData): string {
  const level = clampLevel(data.level);
  const pal = TIER_PALETTES[level];
  const name = (LEVEL_NAMES[level] ?? 'Wanderer').toUpperCase();

  const inkBig = inkToBigInt(data.totalInkEarned);
  const inkCompact = formatInk(data.totalInkEarned);
  const inkFull = groupNumber(Number(inkBig));

  const owner = xmlEscape(truncateHex(data.walletAddress));
  const object = xmlEscape(truncateHex(data.suiObjectId));

  // Progress within the current tier band toward the next threshold.
  const bandStart = LEVEL_THRESHOLDS[level - 1];
  const isMax = level >= 6;
  const nextThreshold = isMax ? bandStart : LEVEL_THRESHOLDS[level];
  let fraction = 0;
  let remaining = 0n;
  if (!isMax) {
    const span = nextThreshold - bandStart;
    const into = Number(inkBig) - bandStart;
    fraction = Math.min(1, Math.max(0, into / span));
    const rem = BigInt(nextThreshold) - inkBig;
    remaining = rem > 0n ? rem : 0n;
  }

  // Geometry (all within a ~9% safe margin; key content lives in y 100→700).
  const ML = 64; // content left
  const MR = W - 64; // content right (536)
  const CX = W / 2; // 300
  const barW = MR - ML; // 472
  const barFillW = Math.max(isMax ? barW : 0, Math.round(barW * fraction));

  const fontSans =
    "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";
  const fontMono =
    "ui-monospace,'SF Mono','SFMono-Regular','Menlo','Consolas',monospace";

  const starfield = buildStarfield(data.walletAddress, pal.bright);

  // Tri-stat columns.
  const colCx = [ML + barW / 6, CX, MR - barW / 6]; // 143, 300, 457
  const divX = [ML + barW / 3, ML + (barW * 2) / 3]; // 221.3, 378.7
  const stats: Array<[string, string]> = [
    ['CHAPTERS READ', formatCount(data.chaptersRead)],
    ['COMPLETED', formatCount(data.seriesCompleted)],
    ['TRACKED', formatCount(data.seriesTracked)],
  ];

  const medCy = 232;
  const medR = 58;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Arktion Passport — Level ${level} ${LEVEL_NAMES[level]}, ${inkFull} INK">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#05060c"/>
      <stop offset="55%" stop-color="${pal.deep}"/>
      <stop offset="100%" stop-color="#04050a"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${pal.halo}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="${pal.halo}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${pal.halo}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
    <linearGradient id="emblem" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal.bright}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${pal.primary}" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${pal.primary}"/>
      <stop offset="100%" stop-color="${pal.bright}"/>
    </linearGradient>
  </defs>

  <!-- base -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g>${starfield}</g>
  <ellipse cx="${CX}" cy="${medCy}" rx="300" ry="240" fill="url(#halo)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- premium frame: soft outer line + prestige metal hairline + corner ticks -->
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="24" fill="none" stroke="${pal.metal}" stroke-opacity="0.55" stroke-width="1.25"/>
  <g stroke="${pal.bright}" stroke-width="1.5" stroke-opacity="0.8" fill="none">
    <path d="M28 60 L28 40 Q28 28 40 28 L60 28"/>
    <path d="M${W - 28} 60 L${W - 28} 40 Q${W - 28} 28 ${W - 40} 28 L${W - 60} 28"/>
    <path d="M28 ${H - 60} L28 ${H - 40} Q28 ${H - 28} 40 ${H - 28} L60 ${H - 28}"/>
    <path d="M${W - 28} ${H - 60} L${W - 28} ${H - 40} Q${W - 28} ${H - 28} ${W - 40} ${H - 28} L${W - 60} ${H - 28}"/>
  </g>

  <!-- header -->
  <text x="${ML}" y="98" font-family="${fontMono}" font-size="11" letter-spacing="4" fill="${pal.bright}" fill-opacity="0.75">ON-CHAIN IDENTITY</text>
  <text x="${ML}" y="130" font-family="${fontSans}" font-size="30" font-weight="800" letter-spacing="7" fill="#f6f8ff">ARKTION</text>
  <text x="${MR}" y="130" text-anchor="end" font-family="${fontMono}" font-size="13" letter-spacing="5" fill="#ffffff" fill-opacity="0.55">PASSPORT</text>
  <line x1="${ML}" y1="150" x2="${MR}" y2="150" stroke="${pal.primary}" stroke-opacity="0.35" stroke-width="1"/>

  <!-- tier medallion -->
  <polygon points="${hexagonPoints(CX, medCy, medR + 7)}" fill="none" stroke="${pal.primary}" stroke-opacity="0.30" stroke-width="1"/>
  <polygon points="${hexagonPoints(CX, medCy, medR)}" fill="url(#emblem)" stroke="${pal.bright}" stroke-opacity="0.85" stroke-width="1.75"/>
  <text x="${CX}" y="${medCy - 14}" text-anchor="middle" font-family="${fontMono}" font-size="11" letter-spacing="3" fill="${pal.bright}" fill-opacity="0.8">LEVEL</text>
  <text x="${CX}" y="${medCy + 30}" text-anchor="middle" font-family="${fontSans}" font-size="52" font-weight="800" fill="#ffffff">${level}</text>

  <!-- tier name pill -->
  <text x="${CX}" y="322" text-anchor="middle" font-family="${fontSans}" font-size="20" font-weight="700" letter-spacing="5" fill="${pal.bright}">${name}</text>

  <!-- hero stat: total INK -->
  <text x="${CX}" y="372" text-anchor="middle" font-family="${fontMono}" font-size="12" letter-spacing="4" fill="#ffffff" fill-opacity="0.55">TOTAL INK EARNED</text>
  <text x="${CX}" y="436" text-anchor="middle" font-family="${fontSans}" font-size="64" font-weight="800" fill="#ffffff">${inkCompact}</text>
  <text x="${CX}" y="464" text-anchor="middle" font-family="${fontMono}" font-size="12" letter-spacing="2" fill="${pal.bright}" fill-opacity="0.85">${inkFull} INK</text>

  <!-- three stats -->
  <line x1="${ML}" y1="496" x2="${MR}" y2="496" stroke="${pal.primary}" stroke-opacity="0.30" stroke-width="1"/>
  <line x1="${divX[0].toFixed(1)}" y1="512" x2="${divX[0].toFixed(1)}" y2="566" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
  <line x1="${divX[1].toFixed(1)}" y1="512" x2="${divX[1].toFixed(1)}" y2="566" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
  ${stats
    .map(
      ([label, value], i) => `<text x="${colCx[i].toFixed(1)}" y="540" text-anchor="middle" font-family="${fontSans}" font-size="28" font-weight="800" fill="#ffffff">${value}</text>
  <text x="${colCx[i].toFixed(1)}" y="562" text-anchor="middle" font-family="${fontMono}" font-size="10" letter-spacing="1.5" fill="#ffffff" fill-opacity="0.50">${label}</text>`,
    )
    .join('\n  ')}
  <line x1="${ML}" y1="592" x2="${MR}" y2="592" stroke="${pal.primary}" stroke-opacity="0.30" stroke-width="1"/>

  <!-- level progress -->
  <text x="${ML}" y="624" font-family="${fontMono}" font-size="11" letter-spacing="2" fill="#ffffff" fill-opacity="0.55">TIER PROGRESS</text>
  <text x="${MR}" y="624" text-anchor="end" font-family="${fontMono}" font-size="11" letter-spacing="2" fill="${pal.bright}" fill-opacity="0.9">${isMax ? 'MAX TIER' : `${formatInk(remaining.toString())} TO NEXT`}</text>
  <rect x="${ML}" y="636" width="${barW}" height="10" rx="5" fill="#ffffff" fill-opacity="0.08"/>
  <rect x="${ML}" y="636" width="${barFillW}" height="10" rx="5" fill="url(#bar)"/>
  ${
    isMax
      ? ''
      : `<rect x="${ML}" y="636" width="${barFillW}" height="10" rx="5" fill="none" stroke="${pal.bright}" stroke-opacity="0.5" stroke-width="0.75"/>`
  }

  <!-- footer identity -->
  <line x1="${ML}" y1="688" x2="${MR}" y2="688" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
  <text x="${ML}" y="712" font-family="${fontMono}" font-size="10" letter-spacing="2" fill="#ffffff" fill-opacity="0.40">OBJECT</text>
  <text x="${ML}" y="730" font-family="${fontMono}" font-size="13" fill="#ffffff" fill-opacity="0.72">${object}</text>
  <text x="${MR}" y="712" text-anchor="end" font-family="${fontMono}" font-size="10" letter-spacing="2" fill="#ffffff" fill-opacity="0.40">OWNER</text>
  <text x="${MR}" y="730" text-anchor="end" font-family="${fontMono}" font-size="13" fill="${pal.bright}" fill-opacity="0.85">${owner}</text>

  <!-- SUI mark / security indicator -->
  <g transform="translate(${CX - 52}, 750)">
    <path d="M6 0 C10 5 12 8 12 11 A6 6 0 1 1 0 11 C0 8 2 5 6 0 Z" fill="${pal.bright}" fill-opacity="0.85"/>
    <text x="22" y="14" font-family="${fontMono}" font-size="11" letter-spacing="3" fill="#ffffff" fill-opacity="0.55">SECURED ON SUI</text>
  </g>
</svg>`;
}
