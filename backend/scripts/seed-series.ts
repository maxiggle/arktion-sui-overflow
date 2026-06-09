/**
 * MangaDex Series Seed Script
 *
 * Fetches ~50 series from MangaDex's public API and upserts them into the
 * Arktion series table. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   pnpm tsx scripts/seed-series.ts
 *
 * Requires DATABASE_URL in .env (uses the same config as the NestJS app).
 *
 * Format type mapping (mirrors FormatType in series.service.ts):
 *   0 = novel, 1 = manga, 2 = manhwa, 3 = manhua, 4 = webtoon
 *
 * MangaDex manga.attributes.originalLanguage:
 *   ja → manga (1)
 *   ko → manhwa (2)
 *   zh / zh-hk → manhua (3)
 *   (anything else) → manga (1) as fallback
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─── MangaDex API ─────────────────────────────────────────────────────────────

const MANGADEX_BASE = 'https://api.mangadex.org';

interface MangaDexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    originalLanguage: string;
    status: string;
    tags: Array<{ attributes: { name: Record<string, string>; group: string } }>;
    lastChapter: string | null;
  };
}

interface MangaDexCoverRelation {
  id: string;
  type: string;
  attributes?: { fileName: string };
}

interface MangaDexResponse {
  data: MangaDexManga[];
  total: number;
}

async function fetchManga(
  offset: number,
  limit: number,
  originalLanguage: string[],
): Promise<MangaDexManga[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    'includes[]': 'cover_art',
    'order[followedCount]': 'desc',
    availableTranslatedLanguage: 'en',
  });
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  for (const lang of originalLanguage) {
    params.append('originalLanguage[]', lang);
  }

  const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
    headers: {
      'User-Agent': 'Arktion/1.0 (hackathon demo; contact@arktion.app)',
    },
  });

  if (!res.ok) {
    throw new Error(
      `MangaDex API error: ${res.status} ${res.statusText} for ${originalLanguage.join(',')}`,
    );
  }

  const json = (await res.json()) as { data: MangaDexManga[] };
  return json.data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickTitle(titles: Record<string, string>): string {
  return (
    titles['en'] ??
    titles['ja-ro'] ??
    titles['ko-ro'] ??
    titles['zh-ro'] ??
    Object.values(titles)[0] ??
    'Unknown Title'
  );
}

function pickDescription(desc: Record<string, string>): string {
  return desc['en'] ?? desc[Object.keys(desc)[0]] ?? '';
}

function getFormatType(originalLanguage: string): number {
  if (originalLanguage === 'ko') return 2; // manhwa
  if (originalLanguage === 'zh' || originalLanguage === 'zh-hk') return 3; // manhua
  return 1; // manga (ja and anything else)
}

function getCoverUrl(
  mangaId: string,
  relationships: MangaDexCoverRelation[],
): string | null {
  const cover = relationships.find((r) => r.type === 'cover_art');
  if (!cover?.attributes?.fileName) return null;
  return `https://uploads.mangadex.org/covers/${mangaId}/${cover.attributes.fileName}.256.jpg`;
}

function mapStatus(mangaDexStatus: string): string {
  switch (mangaDexStatus) {
    case 'completed':
      return 'completed';
    case 'hiatus':
      return 'hiatus';
    case 'cancelled':
      return 'dropped';
    default:
      return 'ongoing';
  }
}

// ─── Seed batches config ──────────────────────────────────────────────────────

const BATCHES: Array<{
  languages: string[];
  label: string;
  limit: number;
}> = [
  { languages: ['ja'], label: 'Japanese manga', limit: 20 },
  { languages: ['ko'], label: 'Korean manhwa', limit: 15 },
  { languages: ['zh', 'zh-hk'], label: 'Chinese manhua', limit: 10 },
  // Extra manga to round out to ~50
  { languages: ['ja'], label: 'Japanese manga (extra)', limit: 10 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Arktion series seed — fetching from MangaDex...\n');

  let total = 0;
  let created = 0;
  let skipped = 0;

  for (const batch of BATCHES) {
    console.log(`Fetching ${batch.limit} ${batch.label}...`);

    let mangaList: MangaDexManga[];
    try {
      mangaList = await fetchManga(0, batch.limit, batch.languages);
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${batch.label}:`, (err as Error).message);
      continue;
    }

    // Rate limit: MangaDex allows 5 req/s; we're doing sequential batch calls
    await new Promise((r) => setTimeout(r, 300));

    for (const manga of mangaList) {
      total++;

      const title = pickTitle(manga.attributes.title);
      const description = pickDescription(manga.attributes.description);
      const formatType = getFormatType(manga.attributes.originalLanguage);
      const sourceLanguage = manga.attributes.originalLanguage;
      const status = mapStatus(manga.attributes.status);
      const coverUrl = getCoverUrl(
        manga.id,
        (manga as unknown as { relationships: MangaDexCoverRelation[] })
          .relationships ?? [],
      );

      try {
        const result = await prisma.series.upsert({
          where: { externalId: manga.id },
          create: {
            externalId: manga.id,
            title,
            formatType,
            sourceLanguage,
            coverUrl,
            description: description.slice(0, 5000), // cap at 5k chars
            status,
          },
          update: {
            // Only update mutable fields — externalId and title are stable
            coverUrl,
            description: description.slice(0, 5000),
            status,
          },
        });

        const wasCreated =
          result.createdAt.getTime() === result.updatedAt?.getTime();
        if (wasCreated) {
          created++;
          console.log(`  ✓ ${title} [${formatType === 2 ? 'manhwa' : formatType === 3 ? 'manhua' : 'manga'}]`);
        } else {
          skipped++;
          console.log(`  → ${title} (already exists, updated)`);
        }
      } catch (err) {
        console.error(`  ✗ Failed to upsert "${title}":`, (err as Error).message);
      }
    }

    console.log('');
  }

  console.log('─'.repeat(50));
  console.log(`Done. Processed: ${total} | Created: ${created} | Updated/skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
