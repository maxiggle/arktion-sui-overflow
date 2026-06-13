export const BadgeCategory = {
  READING_ACHIEVEMENT: 0,
  COMMUNITY: 1,
  SERIES_LORE: 2,
  CREATOR: 3,
  CONTRIBUTOR: 4,
} as const;
export type BadgeCategory = (typeof BadgeCategory)[keyof typeof BadgeCategory];

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.READING_ACHIEVEMENT]: "Reading Achievement",
  [BadgeCategory.COMMUNITY]: "Community",
  [BadgeCategory.SERIES_LORE]: "Series Lore",
  [BadgeCategory.CREATOR]: "Creator",
  [BadgeCategory.CONTRIBUTOR]: "Contributor",
};

/** Matches backend BadgesService.getMyBadges() response shape. */
export interface BadgeDto {
  id: string;
  suiObjectId: string;
  category: BadgeCategory;
  badgeType: number;
  tier: number;
  seriesId: string | null;
  metadataBlobId: string;
  awardedAt: string;
}

/** Reading Achievement badge types (category = 0). */
export const READING_BADGE_TYPE_LABELS: Record<number, string> = {
  0: "First Chapter",
  1: "Binge Reader",
  2: "Series Completionist",
  3: "Marathon Reader",
  4: "OG Reader",
};

/** Contributor badge types (category = 4). */
export const CONTRIBUTOR_BADGE_TYPE_LABELS: Record<number, string> = {
  0: "Submission Approved",
  1: "Translation Bounty Creator",
  2: "Fanfiction Patron",
};

/** Tier labels (0–3). */
export const TIER_LABELS: Record<number, string> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
  3: "Platinum",
};

export function getBadgeTypeLabel(
  category: BadgeCategory,
  badgeType: number,
): string {
  if (category === BadgeCategory.READING_ACHIEVEMENT) {
    return READING_BADGE_TYPE_LABELS[badgeType] ?? `Type ${badgeType}`;
  }
  if (category === BadgeCategory.CONTRIBUTOR) {
    return CONTRIBUTOR_BADGE_TYPE_LABELS[badgeType] ?? `Type ${badgeType}`;
  }
  return `Type ${badgeType}`;
}
