// Browser-native persistence for display preferences (which dining halls to show).
//
// These are read *synchronously* at first render so the initial paint is already
// correct — no popup flash and no "all halls -> your halls" collapse. For signed-in
// users we still mirror to the backend for cross-device sync; a fresh device with an
// empty store adopts the server's saved prefs once (see DailyItems).

const STORAGE_KEY = 'displayPreferences';

export interface StoredDisplayPreferences {
  visibleLocations: string[];
  hasSavedDisplayPreferences: boolean;
}

export const loadDisplayPreferences = (defaults: string[]): StoredDisplayPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { visibleLocations: defaults, hasSavedDisplayPreferences: false };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.visibleLocations)) {
      return { visibleLocations: defaults, hasSavedDisplayPreferences: false };
    }

    return {
      visibleLocations: parsed.visibleLocations.filter((loc: unknown): loc is string => typeof loc === 'string'),
      hasSavedDisplayPreferences: true,
    };
  } catch {
    // Corrupt/blocked storage — fall back to defaults rather than crashing the page.
    return { visibleLocations: defaults, hasSavedDisplayPreferences: false };
  }
};

export const saveDisplayPreferences = (visibleLocations: string[]): void => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ visibleLocations, hasSavedDisplayPreferences: true }),
    );
  } catch {
    // Storage may be unavailable (private mode / quota); non-fatal.
  }
};
