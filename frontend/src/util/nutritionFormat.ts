import { DailyItem } from '../types/ItemTypes';

// Mirrors the iOS `NutritionFormat` helper (NutritionDetailSheet / inline caption).
// Nutrition fields on DailyItem are optional strings (calories/protein/carbs/fat),
// and the scraper can emit junk ("NaN", "NaNg", "undefined") — treat those as missing.

const isJunk = (value: string | undefined): boolean =>
  !value || value === 'NaN' || value === 'NaNg' || value === 'undefined';

/** Parse a raw nutrient string to a number, or null when missing/junk. */
const num = (value: string | undefined): number | null => {
  if (isJunk(value)) return null;
  const n = parseFloat(value as string);
  return isNaN(n) ? null : n;
};

/** Whole numbers print without a decimal ("320"); fractional values keep one ("2.5"). */
const trim = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/**
 * One-line macro caption: "320 cal · 42g protein · 40g carbs · 9g fat".
 * Segments with missing data are omitted; null when nothing at all is available.
 */
export const inlineCaption = (item: DailyItem): string | null => {
  const parts: string[] = [];
  const cal = num(item.calories);
  if (cal !== null) parts.push(`${trim(cal)} cal`);
  const protein = num(item.protein);
  if (protein !== null) parts.push(`${trim(protein)}g protein`);
  const carbs = num(item.carbs);
  if (carbs !== null) parts.push(`${trim(carbs)}g carbs`);
  const fat = num(item.fat);
  if (fat !== null) parts.push(`${trim(fat)}g fat`);
  return parts.length ? parts.join(' · ') : null;
};

/** A macro-grid cell value, or "—" when the datum is missing/junk. */
export const macroCell = (value: string | undefined, unit: string = ''): string => {
  const n = num(value);
  return n === null ? '—' : trim(n) + unit;
};
