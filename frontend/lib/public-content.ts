import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Compass,
  Crown,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export type PublicNavItem = {
  label: string;
  href: string;
};

export type StoryCategory =
  | "featured"
  | "webtoon"
  | "manga"
  | "novel"
  | "translation";

export type PublicStory = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: StoryCategory;
  chapters: number;
  readers: string;
  status: string;
  accent: string;
};

export type PublicFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type PublicMilestone = {
  quarter: string;
  title: string;
  description: string;
};

export const publicNavItems: PublicNavItem[] = [
  { label: "Explore", href: "/explore" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "About", href: "/about" },
];

export const featuredStories: PublicStory[] = [
  {
    slug: "emberfall",
    title: "Emberfall",
    tagline: "A city of ash, saints, and broken systems.",
    description:
      "A ceremonial fantasy serial that follows rebels, archivists, and defectors trying to keep a burning archive alive.",
    category: "featured",
    chapters: 42,
    readers: "128k",
    status: "Updated daily",
    accent:
      "linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(249, 115, 22, 0.08), transparent)",
  },
  {
    slug: "moon-reckoner",
    title: "Moon Reckoner",
    tagline: "A moonbound heist with ritual math.",
    description:
      "Heist fiction with tactical timing, divine ledgers, and a crew that never agrees on the plan.",
    category: "novel",
    chapters: 18,
    readers: "81k",
    status: "Weekly release",
    accent:
      "linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(34, 211, 238, 0.08), transparent)",
  },
  {
    slug: "glass-kingdom",
    title: "Glass Kingdom",
    tagline: "Political fantasy with ruthless court intrigue.",
    description:
      "A multilingual saga about dynasties, translations, and the fragile contracts that keep empires intact.",
    category: "translation",
    chapters: 76,
    readers: "211k",
    status: "Across 7 languages",
    accent:
      "linear-gradient(135deg, rgba(232, 121, 249, 0.22), rgba(139, 92, 246, 0.08), transparent)",
  },
  {
    slug: "solstice-drift",
    title: "Solstice Drift",
    tagline: "A calm sci-fi journey between broken stations.",
    description:
      "A softer, character-driven series about crews repairing habitats, memories, and each other.",
    category: "manga",
    chapters: 23,
    readers: "54k",
    status: "Seasonal drops",
    accent:
      "linear-gradient(135deg, rgba(52, 211, 153, 0.22), rgba(132, 204, 22, 0.08), transparent)",
  },
];

export const publicFeatures: PublicFeature[] = [
  {
    icon: Sparkles,
    title: "Premium discovery",
    description:
      "Editorially shaped browse surfaces surface the right story instead of dumping a wall of content.",
  },
  {
    icon: BookOpenText,
    title: "Narrative-first reading",
    description:
      "Reader pages stay immersive and distraction-free while preserving progression and chapter context.",
  },
  {
    icon: ShieldCheck,
    title: "Trust and clarity",
    description:
      "The public surface communicates status, access, and ownership without sounding like a generic SaaS shell.",
  },
  {
    icon: HeartHandshake,
    title: "Creator-friendly growth",
    description:
      "Stories can grow from the public side into creator tools, community features, and monetization.",
  },
];

export const publicMilestones: PublicMilestone[] = [
  {
    quarter: "Phase 1",
    title: "Public discovery and reading",
    description:
      "Ship the landing page, explore surface, story pages, and full-screen reading experience first.",
  },
  {
    quarter: "Phase 2",
    title: "Reader retention",
    description:
      "Add follows, reading history, bookmarks, recommendations, and better chapter navigation.",
  },
  {
    quarter: "Phase 3",
    title: "Creator growth",
    description:
      "Open publishing, analytics, monetization, and community tools once the public story feels polished.",
  },
  {
    quarter: "Phase 4",
    title: "Ecosystem expansion",
    description:
      "Support translations, world bibles, fandom layers, and richer cross-story discovery.",
  },
];

export const publicPrinciples = [
  {
    title: "Distinct visual language",
    description:
      "Arktion uses warmer contrast, sharper spacing, and editorial layout rhythm instead of a generic app shell.",
    icon: Crown,
  },
  {
    title: "Clear route architecture",
    description:
      "Public, auth, reader, creator, and admin are separated intentionally so the app stays maintainable.",
    icon: Compass,
  },
  {
    title: "Useful customization",
    description:
      "We can keep custom components where shadcn ends and add hooks only where they improve state or reuse.",
    icon: WandSparkles,
  },
];
