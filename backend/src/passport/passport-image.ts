/**
 * Generates a dynamic SVG image for an ArktionPassport NFT.
 *
 * Used as the `image_url` in the Sui Display metadata:
 *   GET /passport/:address/image.svg
 *
 * The SVG is self-contained — no external fonts or assets — so it renders
 * correctly on Sui explorers (Suiscan, etc.) and any NFT marketplace.
 */

const LEVEL_NAMES: Record<number, string> = {
  1: 'Wanderer',
  2: 'Seeker',
  3: 'Devoted',
  4: 'Lorekeeper',
  5: 'Chronicle',
  6: 'Arktion Elder',
};

const LEVEL_COLORS: Record<
  number,
  { primary: string; glow: string; accent: string }
> = {
  1: { primary: '#6366f1', glow: '#6366f140', accent: '#818cf8' }, // indigo
  2: { primary: '#8b5cf6', glow: '#8b5cf640', accent: '#a78bfa' }, // violet
  3: { primary: '#06b6d4', glow: '#06b6d440', accent: '#22d3ee' }, // cyan
  4: { primary: '#10b981', glow: '#10b98140', accent: '#34d399' }, // emerald
  5: { primary: '#f59e0b', glow: '#f59e0b40', accent: '#fbbf24' }, // amber
  6: { primary: '#f43f5e', glow: '#f43f5e40', accent: '#fb7185' }, // rose (elder)
};

/** Derive a deterministic accent hue from a wallet address for visual uniqueness. */
function addressToHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatInk(ink: bigint | string): string {
  const n = BigInt(ink);
  if (n >= 1_000_000n) return `${(Number(n) / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000n) return `${(Number(n) / 1_000).toFixed(1)}K`;
  return n.toString();
}

export interface PassportImageData {
  walletAddress: string;
  suiObjectId: string;
  level: number;
  totalInkEarned: bigint | string;
  chaptersRead: number;
  seriesCompleted: number;
  seriesTracked: number;
}

export function generatePassportSvg(data: PassportImageData): string {
  const level = Math.min(Math.max(data.level, 1), 6);
  const colors = LEVEL_COLORS[level];
  const levelName = LEVEL_NAMES[level] ?? 'Wanderer';
  const hue = addressToHue(data.walletAddress);
  const uniqueColor = `hsl(${hue}, 70%, 65%)`;

  const ink = formatInk(data.totalInkEarned);
  const addr = truncateAddress(data.walletAddress);

  // Star pattern — deterministic from address
  const stars = Array.from({ length: 30 }, (_, i) => {
    const seed =
      parseInt(data.walletAddress.slice(2 + i * 2, 4 + i * 2) || 'ff', 16) /
      255;
    return {
      x: Math.round(seed * 500),
      y: Math.round(((seed * 137.508) % 1) * 500),
      r: seed > 0.85 ? 1.5 : 0.8,
      opacity: 0.3 + seed * 0.5,
    };
  });

  const starDots = stars
    .map(
      (s) =>
        `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="white" opacity="${s.opacity.toFixed(2)}"/>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0.03"/>
    </linearGradient>
    <linearGradient id="inkBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="100%" stop-color="${colors.accent}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="card">
      <rect x="30" y="30" width="440" height="440" rx="24"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="500" height="500" fill="url(#bg)"/>

  <!-- Star field -->
  <g clip-path="url(#card)">${starDots}</g>

  <!-- Card border glow -->
  <rect x="30" y="30" width="440" height="440" rx="24"
    fill="url(#cardGrad)"
    stroke="${colors.primary}" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Top glow orb -->
  <ellipse cx="250" cy="80" rx="120" ry="60"
    fill="${colors.glow}" filter="url(#softglow)"/>

  <!-- Unique address-derived accent circle -->
  <circle cx="420" cy="80" r="40"
    fill="${uniqueColor}" opacity="0.08" filter="url(#softglow)"/>

  <!-- Header bar -->
  <rect x="30" y="30" width="440" height="56" rx="24" fill="${colors.primary}" fill-opacity="0.12"/>
  <rect x="30" y="62" width="440" height="24" fill="${colors.primary}" fill-opacity="0.06"/>

  <!-- ARKTION wordmark -->
  <text x="60" y="68"
    font-family="monospace" font-size="13" font-weight="700" letter-spacing="4"
    fill="${colors.accent}" fill-opacity="0.9">ARKTION</text>

  <!-- PASSPORT label -->
  <text x="340" y="68"
    font-family="monospace" font-size="11" font-weight="400" letter-spacing="3"
    fill="white" fill-opacity="0.4">PASSPORT</text>

  <!-- Level badge -->
  <rect x="60" y="104" width="110" height="36" rx="8"
    fill="${colors.primary}" fill-opacity="0.25"
    stroke="${colors.primary}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="115" y="127"
    font-family="monospace" font-size="11" font-weight="600" letter-spacing="1"
    fill="${colors.accent}" text-anchor="middle">LVL ${level} · ${levelName.toUpperCase()}</text>

  <!-- INK icon + value -->
  <circle cx="80" cy="195" r="18" fill="${colors.primary}" fill-opacity="0.2"
    stroke="${colors.primary}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="80" y="200" font-family="monospace" font-size="13" font-weight="700"
    fill="${colors.accent}" text-anchor="middle" filter="url(#glow)">✦</text>

  <text x="108" y="188"
    font-family="monospace" font-size="10" letter-spacing="1"
    fill="white" fill-opacity="0.4">TOTAL INK</text>
  <text x="108" y="207"
    font-family="monospace" font-size="24" font-weight="700"
    fill="white">${ink}</text>

  <!-- Divider -->
  <line x1="60" y1="235" x2="440" y2="235"
    stroke="${colors.primary}" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- Stats grid -->
  <!-- Chapters Read -->
  <text x="60" y="268"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.4">CHAPTERS READ</text>
  <text x="60" y="290"
    font-family="monospace" font-size="20" font-weight="700"
    fill="white">${data.chaptersRead.toLocaleString()}</text>

  <!-- Series Completed -->
  <text x="210" y="268"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.4">COMPLETED</text>
  <text x="210" y="290"
    font-family="monospace" font-size="20" font-weight="700"
    fill="white">${data.seriesCompleted.toLocaleString()}</text>

  <!-- Series Tracked -->
  <text x="340" y="268"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.4">TRACKED</text>
  <text x="340" y="290"
    font-family="monospace" font-size="20" font-weight="700"
    fill="white">${data.seriesTracked.toLocaleString()}</text>

  <!-- Divider -->
  <line x1="60" y1="316" x2="440" y2="316"
    stroke="${colors.primary}" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- INK progress bar toward next level -->
  <text x="60" y="344"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.4">IDENTITY</text>
  <rect x="60" y="352" width="380" height="4" rx="2" fill="white" fill-opacity="0.08"/>
  <rect x="60" y="352" width="${Math.min(380, Math.round(380 * Math.min(Number(BigInt(data.totalInkEarned)) / 40000, 1)))}" height="4" rx="2"
    fill="url(#inkBar)" filter="url(#glow)"/>

  <!-- Object ID -->
  <text x="60" y="394"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.3">OBJECT</text>
  <text x="60" y="410"
    font-family="monospace" font-size="9"
    fill="white" fill-opacity="0.5">${truncateAddress(data.suiObjectId)}</text>

  <!-- Wallet address -->
  <text x="60" y="434"
    font-family="monospace" font-size="9" letter-spacing="1"
    fill="white" fill-opacity="0.3">OWNER</text>
  <text x="60" y="450"
    font-family="monospace" font-size="9"
    fill="${colors.accent}" fill-opacity="0.7">${addr}</text>

  <!-- Sui logo mark (bottom right) -->
  <circle cx="440" cy="444" r="16"
    fill="${colors.primary}" fill-opacity="0.15"
    stroke="${colors.primary}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="440" y="449"
    font-family="monospace" font-size="10" font-weight="700"
    fill="${colors.accent}" fill-opacity="0.8" text-anchor="middle">SUI</text>
</svg>`;
}
