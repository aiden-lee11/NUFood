// The dietary profile lives in its own tiny zustand store rather than in `DailyItems`
// page state, because three unrelated places touch it: the Display Settings dialog (edits
// it), the Daily Items list (filters by it), and the nutrition dialog (a diet capsule can
// add to it) — the last of which sits four levels deep. Every mutation writes straight
// through to localStorage; nothing here is ever sent to the backend.

import { create } from 'zustand';
import {
  ConflictMode,
  DietaryProfile,
  loadDietaryProfile,
  saveDietaryProfile,
} from '../util/dietaryProfile';
import { tagsEqual } from '../util/dietaryTags';

interface DietaryProfileStore {
  profile: DietaryProfile;
  toggleDiet: (key: string) => void;
  addDiet: (key: string) => void;
  toggleAllergen: (allergen: string) => void;
  setMayContainUnsafe: (value: boolean) => void;
  setConflictMode: (mode: ConflictMode) => void;
}

export const useDietaryProfile = create<DietaryProfileStore>((set) => {
  // Read synchronously at module init so the first paint is already filtered.
  const update = (mutate: (profile: DietaryProfile) => DietaryProfile) =>
    set((state) => {
      const profile = mutate(state.profile);
      saveDietaryProfile(profile);
      return { profile };
    });

  return {
    profile: loadDietaryProfile(),

    toggleDiet: (key) =>
      update((profile) => ({
        ...profile,
        selectedDiets: profile.selectedDiets.some((diet) => tagsEqual(diet, key))
          ? profile.selectedDiets.filter((diet) => !tagsEqual(diet, key))
          : [...profile.selectedDiets, key],
      })),

    addDiet: (key) =>
      update((profile) =>
        profile.selectedDiets.some((diet) => tagsEqual(diet, key))
          ? profile
          : { ...profile, selectedDiets: [...profile.selectedDiets, key] },
      ),

    toggleAllergen: (allergen) =>
      update((profile) => ({
        ...profile,
        avoidedAllergens: profile.avoidedAllergens.some((entry) => tagsEqual(entry, allergen))
          ? profile.avoidedAllergens.filter((entry) => !tagsEqual(entry, allergen))
          : [...profile.avoidedAllergens, allergen],
      })),

    setMayContainUnsafe: (value) => update((profile) => ({ ...profile, mayContainUnsafe: value })),

    setConflictMode: (mode) => update((profile) => ({ ...profile, conflictMode: mode })),
  };
});
