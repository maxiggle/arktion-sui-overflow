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

export interface BadgeDto {
  id: string;
  suiObjectId: string;
  category: BadgeCategory;
  badgeType: number;
  tier: number;
  seriesKey: string;
  awardedAt: string;
}
