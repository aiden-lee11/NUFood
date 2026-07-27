// Shared vocabulary for the dining hall's per-item tag list (`DailyItem.filters`).
//
// The scraper hands us raw tag names exactly as the hall writes them — "Milk",
// "Sesame*", "Vegan", "Avoiding Gluten", "Good Source of Protein". Three kinds:
//
//   * diet tags        — filterable ("Avoiding Gluten" is shown as "Gluten-free")
//   * marketing tags   — display-only, never filterable
//   * everything else  — an allergen. A trailing `*` means "may contain" (traced),
//                        no star means "contains".
//
// Matching is case-insensitive throughout; prod does not serve `filters` yet, so
// every consumer must render nothing at all when the list is missing or empty.

import { DailyItem } from '../types/ItemTypes';

export interface DietOption {
  /** The raw tag name as the hall writes it — also what we persist in the profile. */
  key: string;
  /** What the UI says (the hall's "Avoiding Gluten" reads as "Gluten-free"). */
  label: string;
}

/** Display order for the Display Settings chips. */
export const DIET_OPTIONS: DietOption[] = [
  { key: 'Vegetarian', label: 'Vegetarian' },
  { key: 'Vegan', label: 'Vegan' },
  { key: 'Avoiding Gluten', label: 'Gluten-free' },
];

/**
 * Priority for the single green mini-tag a row is allowed to show: Vegan beats
 * Vegetarian beats Gluten-free (vegan items are almost always tagged vegetarian too).
 */
export const DIET_PRIORITY: string[] = ['Vegan', 'Vegetarian', 'Avoiding Gluten'];

/** Display-only tags — shown in the nutrition dialog, never offered as a filter. */
export const MARKETING_TAGS: string[] = ['Good Source of Protein', 'How Good Friendly'];

/** The always-offered allergen chips; the loaded menu can add more (see `allergenOptions`). */
export const COMMON_ALLERGENS: string[] = [
  'Milk',
  'Egg',
  'Wheat',
  'Gluten',
  'Soy',
  'Sesame',
  'Peanut',
  'Tree Nut',
  'Fish',
  'Shellfish',
  'Mustard',
  'Celery',
  'Sulphites',
  'Garlic',
  'Onion',
  'Tomato',
  'Beef',
  'Pork',
  'Poultry',
  'MSG',
];

/** Case/whitespace-insensitive key used for every comparison in this module. */
export const normalizeTag = (tag: string): string => tag.trim().toLowerCase();

export const tagsEqual = (a: string, b: string): boolean => normalizeTag(a) === normalizeTag(b);

const DIET_BY_KEY = new Map(DIET_OPTIONS.map((option) => [normalizeTag(option.key), option]));
const MARKETING_BY_KEY = new Map(MARKETING_TAGS.map((tag) => [normalizeTag(tag), tag]));

export interface ParsedTags {
  diets: DietOption[];
  marketing: string[];
  /** Allergens the item contains outright. */
  contains: string[];
  /** Allergens traced with a `*` — "may contain". */
  mayContain: string[];
}

const EMPTY_TAGS: ParsedTags = { diets: [], marketing: [], contains: [], mayContain: [] };

/**
 * Split a raw `filters` list into diet / marketing / contains / may-contain buckets,
 * preserving the hall's own capitalization for allergen names. Returns empty buckets
 * for a missing or empty list, which is the current production state.
 */
export const parseTags = (filters?: string[]): ParsedTags => {
  if (!filters || filters.length === 0) return EMPTY_TAGS;

  const diets: DietOption[] = [];
  const marketing: string[] = [];
  const contains: string[] = [];
  const mayContain: string[] = [];

  for (const raw of filters) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // A trailing star (possibly repeated) is the hall's "traced / may contain" marker.
    const traced = /\*+$/.test(trimmed);
    const name = trimmed.replace(/\*+$/, '').trim();
    if (!name) continue;

    const diet = DIET_BY_KEY.get(normalizeTag(name));
    if (diet) {
      if (!diets.some((d) => d.key === diet.key)) diets.push(diet);
      continue;
    }

    const marketingTag = MARKETING_BY_KEY.get(normalizeTag(name));
    if (marketingTag) {
      if (!marketing.includes(marketingTag)) marketing.push(marketingTag);
      continue;
    }

    const bucket = traced ? mayContain : contains;
    if (!bucket.some((existing) => tagsEqual(existing, name))) bucket.push(name);
  }

  return { diets, marketing, contains, mayContain };
};

/** The highest-priority diet tag on an item, for the row's single green mini-tag. */
export const primaryDietTag = (tags: ParsedTags): DietOption | null => {
  for (const key of DIET_PRIORITY) {
    const match = tags.diets.find((diet) => tagsEqual(diet.key, key));
    if (match) return match;
  }
  return null;
};

/** True when at least one item in the batch carries tag data (false on today's prod data). */
export const hasTagData = (items: DailyItem[]): boolean =>
  items.some((item) => (item.filters?.length ?? 0) > 0);

/**
 * Allergen names in a stable, human order: the common list first (in its own order),
 * then anything else, alphabetically. Mirrors iOS `DietaryTag.ordered`.
 */
export const orderedAllergens = (allergens: string[]): string[] => {
  const known = COMMON_ALLERGENS.filter((common) =>
    allergens.some((allergen) => tagsEqual(allergen, common)),
  );
  const extras = allergens
    .filter((allergen) => !COMMON_ALLERGENS.some((common) => tagsEqual(common, allergen)))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...extras];
};

/**
 * The allergen chips to offer: the common list, union-ed with any other allergen tag the
 * loaded menu carries — so a new upstream tag surfaces without a code change.
 */
export const allergenOptions = (items: DailyItem[]): string[] => {
  const seen = new Set(COMMON_ALLERGENS.map(normalizeTag));
  const extras: string[] = [];

  for (const item of items) {
    const { contains, mayContain } = parseTags(item.filters);
    for (const allergen of [...contains, ...mayContain]) {
      const key = normalizeTag(allergen);
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push(allergen);
    }
  }

  extras.sort((a, b) => a.localeCompare(b));
  return [...COMMON_ALLERGENS, ...extras];
};

/**
 * Ingredient strings arrive with the hall's own footnote markers ("SUGAR*", "SOY^").
 * Strip them per comma-separated token and re-join. Mirrors iOS `displayIngredients`.
 */
export const formatIngredients = (ingredients?: string): string => {
  if (!ingredients) return '';
  return ingredients
    .split(',')
    .map((token) => token.trim().replace(/^[*^]+|[*^]+$/g, '').trim())
    .filter(Boolean)
    .join(', ');
};
