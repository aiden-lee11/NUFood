// Browser-native persistence for the dietary profile (diets + allergens to avoid).
//
// Deliberately local-only — unlike display preferences there is no backend mirror, so
// the profile never leaves the device. Same shape as `displayPreferences.ts`: read
// synchronously at first render, write on every change, never throw on blocked storage.

import { DailyItem } from '../types/ItemTypes';
import {
  DIET_OPTIONS,
  DietOption,
  normalizeTag,
  orderedAllergens,
  parseTags,
  primaryDietTag,
  tagsEqual,
} from './dietaryTags';

const STORAGE_KEY = 'dietaryProfile';

/** What to do with an item that carries one of my allergens. */
export type ConflictMode = 'hide' | 'warn';

export interface DietaryProfile {
  /** Raw diet tag keys ("Vegan", "Avoiding Gluten"); an item must carry them all. */
  selectedDiets: string[];
  /** Allergen names to avoid, matched case-insensitively against the item's tags. */
  avoidedAllergens: string[];
  /** Whether a traced ("may contain") tag counts as a conflict. */
  mayContainUnsafe: boolean;
  conflictMode: ConflictMode;
}

export const DEFAULT_DIETARY_PROFILE: DietaryProfile = {
  selectedDiets: [],
  avoidedAllergens: [],
  mayContainUnsafe: true,
  conflictMode: 'hide',
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

export const loadDietaryProfile = (): DietaryProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DIETARY_PROFILE;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_DIETARY_PROFILE;

    return {
      selectedDiets: stringList(parsed.selectedDiets),
      avoidedAllergens: stringList(parsed.avoidedAllergens),
      mayContainUnsafe:
        typeof parsed.mayContainUnsafe === 'boolean'
          ? parsed.mayContainUnsafe
          : DEFAULT_DIETARY_PROFILE.mayContainUnsafe,
      conflictMode: parsed.conflictMode === 'warn' ? 'warn' : 'hide',
    };
  } catch {
    // Corrupt/blocked storage — fall back to defaults rather than crashing the page.
    return DEFAULT_DIETARY_PROFILE;
  }
};

export const saveDietaryProfile = (profile: DietaryProfile): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage may be unavailable (private mode / quota); non-fatal.
  }
};

/** Nothing selected means nothing to filter, warn about, or summarize. */
export const isProfileActive = (profile: DietaryProfile): boolean =>
  profile.selectedDiets.length > 0 || profile.avoidedAllergens.length > 0;

export interface AllergenConflict {
  /** The offending allergen, as the hall names it. */
  allergen: string;
  /** True when the tag was traced (`*`) rather than an outright ingredient. */
  mayContain: boolean;
}

export interface ItemEvaluation {
  /** The item carries every selected diet tag. */
  meetsDiet: boolean;
  /** The first avoided allergen found (contains before may-contain), if any. */
  conflict: AllergenConflict | null;
  /** Highest-priority diet tag on the item, for the row's green mini-tag. */
  dietTag: DietOption | null;
}

export const evaluateItem = (item: DailyItem, profile: DietaryProfile): ItemEvaluation => {
  const tags = parseTags(item.filters);

  const meetsDiet = profile.selectedDiets.every((selected) =>
    tags.diets.some((diet) => tagsEqual(diet.key, selected)),
  );

  const avoided = new Set(profile.avoidedAllergens.map(normalizeTag));
  let conflict: AllergenConflict | null = null;

  for (const allergen of tags.contains) {
    if (avoided.has(normalizeTag(allergen))) {
      conflict = { allergen, mayContain: false };
      break;
    }
  }

  if (!conflict && profile.mayContainUnsafe) {
    for (const allergen of tags.mayContain) {
      if (avoided.has(normalizeTag(allergen))) {
        conflict = { allergen, mayContain: true };
        break;
      }
    }
  }

  return { meetsDiet, conflict, dietTag: primaryDietTag(tags) };
};

export interface ProfileFilterResult {
  items: DailyItem[];
  /** Dropped for failing the diet, or for an allergen conflict in "hide" mode. */
  hiddenCount: number;
  /** Kept but badged, in "warn" mode. */
  flaggedCount: number;
}

/**
 * Apply the profile to a list of items.
 *
 * `enabled` is the caller's "this menu actually carries tag data" check — without it a
 * user with "Vegan" saved would see an empty page on the current (untagged) production
 * feed, because no item can prove it is vegan.
 */
export const applyDietaryProfile = (
  items: DailyItem[],
  profile: DietaryProfile,
  enabled: boolean,
): ProfileFilterResult => {
  if (!enabled || !isProfileActive(profile)) {
    return { items, hiddenCount: 0, flaggedCount: 0 };
  }

  const kept: DailyItem[] = [];
  let hiddenCount = 0;
  let flaggedCount = 0;

  for (const item of items) {
    const { meetsDiet, conflict } = evaluateItem(item, profile);

    if (!meetsDiet) {
      hiddenCount += 1;
      continue;
    }

    if (conflict) {
      if (profile.conflictMode === 'hide') {
        hiddenCount += 1;
        continue;
      }
      flaggedCount += 1;
    }

    kept.push(item);
  }

  return { items: kept, hiddenCount, flaggedCount };
};

/**
 * "Vegan · sesame, peanut" — the descriptive half of the status pill. Diets come first in
 * canonical order, then the allergens as one comma-separated run. Mirrors iOS `summary`.
 */
export const profileSummary = (profile: DietaryProfile): string => {
  const parts: string[] = DIET_OPTIONS.filter((option) =>
    profile.selectedDiets.some((diet) => tagsEqual(diet, option.key)),
  ).map((option) => option.label);

  if (profile.avoidedAllergens.length > 0) {
    parts.push(
      orderedAllergens(profile.avoidedAllergens)
        .map((allergen) => allergen.toLowerCase())
        .join(', '),
    );
  }

  return parts.join(' · ');
};

/** "14 items hidden" / "1 item flagged"; empty when nothing was touched. */
export const profileCountLabel = (result: ProfileFilterResult, mode: ConflictMode): string => {
  const flagged = mode === 'warn' && result.flaggedCount > 0;
  const count = flagged ? result.flaggedCount : result.hiddenCount;
  if (count === 0) return '';
  return `${count} ${count === 1 ? 'item' : 'items'} ${flagged ? 'flagged' : 'hidden'}`;
};

/** "contains sesame" / "may contain sesame" — the row's amber warn badge. */
export const conflictLabel = (conflict: AllergenConflict): string =>
  `${conflict.mayContain ? 'may contain' : 'contains'} ${conflict.allergen.toLowerCase()}`;
