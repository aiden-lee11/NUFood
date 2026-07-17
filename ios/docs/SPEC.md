# NUFood — UI/UX Specification for iOS SwiftUI Port

This document is the authoritative specification of the NUFood React web app (a Northwestern
University dining menu / nutrition app) for a faithful native iOS SwiftUI port. It is derived
entirely from the React source at `frontend/src`. iOS implementers should treat this as the
source of truth alongside screenshots.

**App identity:** brand name is **`NUFood`** (also referred to as "NU Food Finder" in toasts).
Production domain: `https://dining.nu`. All dining data is **Northwestern University** (Evanston, IL)
— everything runs on **US Central time** conceptually, but see the important timezone note in §3.

---

## 0. Global concepts & vocabulary

### 0.1 The five dining halls ("locations")
The app's core menu features revolve around 5 dining commons, referenced by these exact short names
(this array is `DEFAULT_LOCATIONS` in `DailyItems.tsx`, order matters for default display):

```
["Sargent", "Elder", "Allison", "Plex East", "Plex West"]
```

Campus grouping (used by Location Preferences quick-select buttons):
- **North Campus:** `["Sargent", "Elder"]`
- **South Campus:** `["Allison", "Plex East", "Plex West"]`

The backend returns operating-hours records under *long* names, so the app maps short → long via
**`locationAliases`** (`util/helper.ts`). An alias list is tried in order (first match wins):

```
Elder       -> ["Elder Dining Commons"]
Sargent     -> ["Sargent Dining Commons"]
Allison     -> ["Allison Dining Commons"]
Plex East   -> ["Foster Walker Plex East"]
Plex West   -> ["Foster Walker Plex West & Market", "Foster Walker Plex West"]
```
(The dual Plex West alias exists because the scraper name changed on 4/28/2025.)

### 0.2 Meal periods ("times of day")
Exactly three, in this fixed order:
```
["Breakfast", "Lunch", "Dinner"]
```
Items carry a `TimeOfDay` field that is one of these strings.

### 0.3 Item / data model
`DailyItem` (menu item for a specific hall+meal+day):
```
Name: string            // e.g. "Scrambled Eggs"
Description: string
Location: string        // short name, e.g. "Sargent"
StationName: string     // sub-section within a hall, e.g. "Comfort", "Rooted"
Date: string            // "YYYY-MM-DD"
TimeOfDay: string        // "Breakfast" | "Lunch" | "Dinner"
portion?: string        // e.g. "1 each", "4 oz"
calories?: string       // numeric-as-string, e.g. "220"; may be "NaN"/undefined
protein?: string        // e.g. "12" or "less than 1 gram"
carbs?: string
fat?: string
```
All macro values are **strings** and may be missing, `"NaN"`, `"NaNg"`, `"undefined"`, or the
literal phrase `"less than 1 gram"`. Parse defensively (see §3.7).

`Item` = `{ Name: string }` (used on All Items / Preferences screens, which only care about name).

`OperationHoursData` (per physical location, long name):
```
Name: string          // long name
Week: Day[]           // 7 entries, index 0 = Sunday ... 6 = Saturday
```
`Day`:
```
Day: string           // day-of-week number as string, "0".."6"
Date: string          // "YYYY-MM-DD"
Status: string        // "closed" when closed; otherwise an "open"-ish status
Hours: Hour[] | null  // null when closed
```
`Hour` / `OperatingTime`:
```
StartHour: number  StartMinutes: number  EndHour: number  EndMinutes: number
```
(Backend sometimes sends these as numeric strings; code coerces with `parseInt`. Handle both.)

---

## 1. Navigation structure

### 1.1 Routes
Five screens, React Router paths:

| Path          | Screen             | Nav label          | Icon (lucide)  | Auth-gated? |
|---------------|--------------------|--------------------|----------------|-------------|
| `/`           | Daily Items        | "Daily Items"      | Home           | No          |
| `/all`        | All Items          | "All Items"        | ListTodo       | No          |
| `/hours`      | Operation Hours    | "Operation Hours"  | CalendarDays   | No          |
| `/planner`    | Nutrient Planner   | "Nutrient Planner" | PieChart       | No          |
| `/preferences`| Your Favorites     | "Your Favorites"   | Heart          | **Yes** (only shown/reachable when signed in) |

The **default/home screen** is Daily Items (`/`).

### 1.2 Layout chrome (`layout.tsx`)
The web app uses a **two-pane desktop layout** and a **collapsible drawer on mobile**. For iOS,
the natural mapping is a **TabBar or a sidebar-style navigation**; the content below describes what
each surface contains.

**Desktop sidebar (≥1024px, `lg`):** fixed 224px-wide (`w-56`) left column, `bg-background`:
- Top: 56px-tall header row with app title **"NUFood"** (links to `/`), bottom border.
- Nav list: the 4 always-visible nav items, plus "Your Favorites" appended **only when signed in**.
  Active route highlighted with `bg-accent text-accent-foreground`; others transparent with hover
  `bg-accent`. Each row: icon + label, `rounded-lg`, small padding, `text-sm font-medium`.
- Bottom pinned block (separated by top border, `p-4`, vertical spacing):
  - **"Account"** button (outline, `User` icon) → opens Account popup.
  - **"Send Feedback"** button (outline, `MessageSquare` icon) → opens Feedback dialog.
  - **"Support this project"** button (outline, `Coffee` icon) → opens
    `https://buymeacoffee.com/aidenlee11` in a new tab; tooltip "Buy me a coffee!".

**Top header bar (all sizes, 56px tall, bottom border, `bg-background`):**
- Left (mobile only, hidden ≥lg): hamburger **Menu** icon button opening the left drawer (`Sheet`).
- Center/left: `<h1>` showing the **current screen's title** (looked up from nav items by path;
  falls back to "Dashboard" if no match — in practice every route matches).
- Right: **theme toggle** button (outline, icon-only). Shows `Moon` icon when currently light,
  `Sun` icon when currently dark; tapping toggles light⇄dark.

**Mobile drawer (`Sheet`, slides from left, 224px wide):** same nav list as sidebar (with the
"Your Favorites" item when signed in), tapping a link closes the drawer. Below the nav, a bottom
block with the same Account / Send Feedback / Support this project buttons.

**Main content:** scrollable region (`overflow-y-auto`), padding `p-4` (mobile) / `p-6` (desktop).

**Banner** (`banner.tsx`): currently renders **nothing** (`() => null`). There is a `BannerContext`
whose `containerRef` is used by All Items to scroll to top on page change. No visible banner UI to
port. (Safe to omit; keep a no-op scroll-to-top on pagination.)

### 1.3 Default theme
App default theme is **dark** (`defaultTheme="dark"`, storageKey `vite-ui-theme`). Theme persists in
localStorage. Options are `dark` | `light` | `system` (only dark/light are toggled by the UI button).

---

## 2. Per-screen specification

### 2.1 Daily Items (`/`, `pages/DailyItems.tsx`)  — the home screen

**Purpose:** Show today's (or a chosen day's) menu grouped by dining hall → meal → station, with
favoriting, search, open/closed status, and display filtering.

**Header (`header-controls.tsx`):**
- Title: **`Daily Items for {date}`** where date is formatted like `Jul 12, 2026`
  (date-fns `"PP"` format = `MMM d, yyyy`).
- Sub-line below title (`text-lg`): if ≥1 location open → **`({N} locations open)`**; else
  **`(All locations closed)`**. `N` = count of `openLocations` computed from *current wall-clock time*
  vs the selected day's hours (see §2.1 "open locations" logic).
- A row with two controls:
  - **"Display Settings"** button (outline, `Settings` icon) → opens the Display Settings dialog (§2.1.5).
  - **Date picker** button (outline, `CalendarIcon` + formatted date `"PP"`, e.g. "Jul 12, 2026").
    Tapping opens a calendar popover. Selectable range is limited to the dates present as keys in
    `weeklyItems` (min…max, inclusive); dates outside are disabled. If no data, falls back to
    today ±3 days.

**Search input:** full-width text field, placeholder **"Search for an item..."**. Fuzzy search
(Fuse.js, key `Name`, threshold `0.5`) filters the day's items live. Empty query → all of the day's
items.

**Body — `LocationItemGrid`:** A responsive grid of **location cards** (1 col mobile, 2 col `sm`,
3 col `lg`). Only locations in `visibleLocations` are rendered. Cards are **sorted so that locations
that currently have items come first** (stable otherwise). Each card:
- Rounded `rounded-xl`, `bg-card`, border, custom left-bottom drop shadow. If the location has **no
  items** for the visible meals, card is dimmed (`opacity-75`).
- **`<h2>` location short name** (e.g. "Sargent").
- **Status line** (`Status.tsx`, see §2.1.4): a colored text like "Status -- Open until 8:00 PM".
- For each meal in `["Breakfast","Lunch","Dinner"]` **that is in `visibleTimes`** AND has ≥1 item:
  a section with an `<h3>` meal name and a **`DailyItemAccordion`** (§2.1.3).
- If the location has no items at all: centered muted text **"No items available"**.

**Important interaction — visibleTimes defaults to the *current* meal.** On load, the app computes
the current meal from wall-clock time (see `getCurrentTimeOfDay`, §3.6) and sets `visibleTimes` to
just that meal (e.g. only "Lunch" at noon). Outside meal hours `visibleTimes` may be empty → no meal
sections show until the user enables a time in Display Settings → Times. (This is a real, sometimes
surprising, behavior — see §7 Ambiguities.)

**2.1.1 Favoriting (item tap):**
- If **not signed in** → open Auth popup ("Not Signed In", §2.6). No state change.
- If signed in → toggle the item's `Name` in `userPreferences` (case-insensitive, trimmed compare;
  when adding, store the original-cased `item.Name`). Optimistically update store + `availableFavorites`,
  then POST the full new preferences array to `/api/userPreferences`.

**2.1.2 "Available favorites" derivation:** favorites that are actually on today's menu.
```
if userPreferences && userPreferences.length > 0:
    prefNames = Set(userPreferences)               // exact-name set
    availableFavorites = dailyItems.filter(i => prefNames.has(i.Name))
else:
    availableFavorites = []                          // cleared on sign-out / empty
```
Within a given location+meal, favorites are de-duplicated by `Name` (a Map keyed on Name).

**2.1.3 `DailyItemAccordion` (station grouping) — the core menu list widget:**
Items for one location+meal are grouped by `StationName` into collapsible accordions. Rendering order:
1. **"My Favorites"** accordion — shown only if this location+meal has available favorites. Always
   expanded by default. Its items render with a distinct favorite style (border uses `chart-5`,
   the "saturated purple for favorites" color). Each row shows `{Name} ★`.
2. **Default-expanded stations** — any station whose name is in this whitelist renders next, expanded
   by default, in this order:
   ```
   ["My Favorites", "Comfort", "Comfort 1", "Comfort 2", "Rooted", "Rooted 1",
    "Rooted 2", "Pure Eats", "Pure Eats 1", "Pure Eats 2", "Kitchen Entree", "Kitchen Sides"]
   ```
   (These are Northwestern's recurring station names; they open by default so common food shows immediately.)
3. **All remaining stations** — rendered as controlled accordions. Default collapsed, UNLESS the
   global "Expand All Folders by Default" visual preference is on (then all start expanded).
   The user can expand/collapse each independently.
- Each item row is a full-width left-aligned button, `rounded-lg`, `border-2`, hover scale 1.02 +
  shadow. Selected/favorited items: `bg-item-selected text-item-selected-foreground border-primary`
  and show `{Name} ★`. Unselected: `bg-card` + `border-border`, hover `bg-item-hover`, show `{Name} ☆`.
- The MUI accordion header shows the station name and an expand chevron (`ExpandMoreIcon`).

**2.1.4 `Status.tsx` — open/closed status for a location (live, recomputed every 60s):**
Input: that location's `OperatingTime[] | null` for the selected day (from `getDailyLocationOperationTimes`).
Rendering:
- `operatingTimes == null` (or the string `"closed"`) → red text **`Status -- Closed`**.
- `operatingTimes` is a string but not "closed" → yellow text **`Status -- Invalid Data`**.
- Otherwise compute (pseudocode):
```
now = current wall-clock time
currentlyOpen = false; nextClose = null; nextOpen = null
for each interval (SH,SM,EH,EM) in operatingTimes:
    start = today at SH:SM
    end   = today at EH:EM
    if end <= start: end += 1 day       // crosses midnight
    if start <= now < end:
        currentlyOpen = true
        nextClose = min(nextClose, end)
    else if now < start:
        nextOpen = min(nextOpen, start)

if currentlyOpen:
    diffMins = floor((nextClose - now)/60000)
    text = diffMins < 60 ? "Closes in {diffMins} minute[s]"
                         : "Open until {h:mm AM/PM}"      // of nextClose
    color = green
else:
    if nextOpen exists:
        diffMins = floor((nextOpen - now)/60000)
        text = diffMins < 60 ? "Opens in {diffMins} minute[s]"
                             : "Closed until {h:mm AM/PM}"  // of nextOpen
    else: text = "Closed"
    color = red
display "Status -- {text}"
```
Pluralization: "minute" vs "minutes" (singular only when diffMins === 1). Time format `h:mm AM/PM`
(no leading zero on hour; e.g. "8:05 PM").

**2.1.5 Display Settings dialog (`preferences.tsx`) — three tabs:**
Title **"Display Settings"**. Tabs: **Locations**, **Times**, **Visual**.
- **Locations tab** (`location-preferences.tsx`): three quick buttons —
  **"North Campus"** (`MapPin`, sets Sargent+Elder), **"South Campus"** (`MapPin`, sets
  Allison+Plex East+Plex West), **"Clear Locations"** (sets none). Below: a checkbox per location
  in `DEFAULT_LOCATIONS`, checked = visible. Toggling persists (§3.4).
- **Times tab** (`time-preferences.tsx`): a checkbox per meal (Breakfast/Lunch/Dinner), checked =
  that meal's sections are shown on cards.
- **Visual tab** (`visual-preferences.tsx`): single checkbox **"Expand All Folders by Default"** →
  controls `expandFolders` (default all station accordions open).

**Auto-open behavior:** on a brand-new browser (no saved display prefs) and not dismissed this
session, the dialog auto-opens on first load. Once dismissed (or prefs saved), it stays closed
(`sessionStorage["showPreferences"]="false"`). For iOS, model as "first-run onboarding sheet for
choosing which halls to show."

**2.1.6 Error popup (`error-popup.tsx`):** If the selected day has **zero items** but there IS
operating-hours data for that day (i.e. a hall should be open but no menu was scraped), show a modal:
title **"Error Loading Data"** (red, `AlertTriangle` icon), body **"We're having trouble loading the
menu items. This could be due to a temporary issue with our data source. Please try again later or
contact support if the problem persists."**, plus a "Send Feedback" button. Dismissible.

**2.1.7 States:**
- Loading: no dedicated spinner on this page (data appears when store populates).
- Empty day (no items, no hours) → cards show "No items available" / all-closed subline.
- Signed-out → favoriting shows Auth popup; no "My Favorites" section (no userPreferences).

---

### 2.2 All Items (`/all`, `pages/AllItems.tsx`)

**Purpose:** Browse & favorite the full catalog of item names (across all halls/time), paginated.

- Title: **"Select Your Favorite Items"**.
- Data: `allItems` (a `string[]` of item names) mapped to `{ Name }`. When signed out, this is the
  general catalog; when signed in, the same list plus the user's `userPreferences` to mark favorites.
- **Search:** full-width input, placeholder **"Search for an item..."**, Fuse.js (key `Name`,
  threshold `0.5`). Searching resets to page 1.
- **Pagination:** `ITEMS_PER_PAGE = 100`. Rendered both above and below the list, only when
  `totalPages > 1`.
  - Mobile (`< sm`): a **Prev** / **"Page X of Y"** / **Next** row (chevron icons). Disabled at ends.
  - Desktop (`≥ sm`): numbered pagination with Previous/Next and ellipses. Page-number algorithm:
    show up to 5 numbers, always include first & last, ellipsis (`...`) for gaps, current-page
    window of ±1 (clamped near ends). Active page highlighted.
  - Changing pages smooth-scrolls the container to top.
- **Item rows:** full-width left-aligned buttons, `rounded-lg`, `border-2`, hover scale 1.02.
  Favorited: `bg-item-selected text-item-selected-foreground border-primary`, label `{Name} ★`.
  Not favorited: `bg-card border-border`, hover `bg-item-hover`, label `{Name} ☆`.
- **Favoriting:** identical logic to Daily Items (toggle in `userPreferences`, POST). Signed-out tap
  → Auth popup.
- States: no explicit loading/empty message beyond an empty list.

---

### 2.3 Operation Hours (`/hours`, `pages/OperationHours.tsx`)

**Purpose:** Visual weekly-style hours grid for all dining/retail locations on a chosen day.

- Header: title **"Dining Hours"** + a **Date picker** (same DatePicker component). The picker is
  range-limited to the loaded dataset's Sunday→Saturday span (`weekDays[0].Date` … last).
- Locations are organized into **three groups** rendered top-to-bottom, each with an `<h2>` header:
  ```
  "Dining Commons": ["Allison", "Sargent", "Plex East", "Plex West", "Elder"]
  "Norris Center":  ["847 Burger", "Buen Dia", "Shake Smart", "Chicken & Boba",
                     "Wildcat Deli", "Starbucks", "Forno Pizza Co.", "The Market at Norris"]
  "Retail Dining":  ["Protein Bar", "847 at Fran's Cafe", "Tech Express",
                     "Backlot at Kresge Cafe", "Cafe Coralie", "Lisa's Cafe"]
  ```
  (Note: only the 5 Dining Commons have `locationAliases`; the Norris/Retail names are matched
  directly against `OperationHoursData.Name`. Some may have no data → treated closed.)

**Selected day resolution:** find the `Week` entry whose `Date == toLocalISODate(selectedDate)`;
if not found (TZ mismatch), fall back to matching `Day == selectedDate.getDay()`; else index 0.

**Two presentations depending on width:**

**A. Wide screens (`≥ sm`): a time-grid.** For each group:
- Compute a display hour range from the group's locations for that day: min start / max end across
  all open intervals, with midnight-crossover handling (end < start ⇒ end+24), then a 1-hour buffer
  on each side, clamped, and **always at least 8 AM–5 PM**. If no location has hours → default 8–17.
- Rows = one per hour slot; columns = 80px "Time" gutter + one column per location (min 150px).
- Header row: "Time" + each location short name (truncated with tooltip).
- Green blocks (`bg-green-600`) fill cells where a location is open, at **half-hour resolution**
  (each hour cell split into top-half = :00–:30 and bottom-half = :30–:00). Contiguous open blocks
  visually merge (borders drawn only on the outer edges, using the `accent` color; blocks extend
  ±2px to connect across slots). See `getLocationTimeInfo` for the half-hour overlap math.
- A **red horizontal "now" line** (`bg-red-500`, subtle glow) is drawn at the current-time position,
  only if the current wall-clock time falls within that group's displayed range. Updates every 60s.
- The grid scrolls horizontally if wider than viewport.

**B. Narrow screens (`< sm`): stacked cards.** For each location a card with the short name header
and one row: weekday name (left) + hours or "Closed" (right). Open → primary color; closed → red
(`text-destructive`). Hours rendered as multiple `"h:mmAM – h:mmPM"` lines (via `formatTime`, note:
no space before AM/PM here, e.g. `"8:00AM – 5:00PM"`).

**Live:** `currentTime` state refreshes every 60s to move the now-line.

---

### 2.4 Nutrient Planner (`/planner`, `pages/NutrientPlanner.tsx`)

**Purpose:** Build a plan from **today's** menu items and track macro totals against goals.

- Title: **"Nutrient Planner"**.
- **Loading state:** centered spinning `Loader2` (`min-h-[80vh]`) while `store.loading`.
- **Error state:** `Error loading data: {error}` in destructive color.

**Data source:** `todaysItems = weeklyItems[getCurrentDateFormatted()]` — **today only**, keyed by
`YYYY-MM-DD` from local `new Date()`. If none, empty list. There is **no date picker** here.

**Two-column layout (desktop `≥ md`), tabbed on mobile:**
- Mobile shows a 2-tab switch: **"Food Items"** and **"My Plan"** (the My Plan tab shows a count
  Badge of selected items). Desktop shows both columns side by side.

**Left column — `FoodItemsList` (browse & add):**
- Header: search input (placeholder **"Search food items..."**, `Search` icon, 150ms debounce,
  Fuse.js threshold `0.3`, minMatchCharLength 2; for 1–2 char queries it prefers substring matches
  first). A **Filter** toggle button (`Filter` icon) shows/hides the filter panel (open by default).
- Filter panel (collapsible): **Sort By** select (`Name`, `Calories`, `Protein`, `Carbs`, `Fat`),
  **Order** select (`Ascending`/`Descending`), **Filter by Location** select (`All Locations` +
  the locations present in today's items, sorted), **Filter by Time of Day** select (`All Times` +
  the meals present, ordered Breakfast/Lunch/Dinner then alpha).
- List: one `FoodItemRow` per item. If none: centered muted text **"No food items match your search
  criteria."**
- **`FoodItemRow`:** a tappable card (`border-2 rounded-lg`). Selected → `bg-item-selected
  border-primary` + an **"Added"** Badge next to the name. Shows: bold `Name`; muted subtitle
  `{Location} ({TimeOfDay})`; then key/value rows: **Portion Size**, **Calories**, **Protein**,
  **Carbs**, **Fat**. Macro display: missing → `N/A`; `"less than 1 gram"` shown verbatim; else the
  string value with a `g` suffix appended for protein/carbs/fat (calories shown raw). Tapping toggles
  selection.

**Right column — `SelectedItemsList` ("My Food Plan"):**
- Header: **"My Food Plan"** + a **Settings** (gear) button opening the Nutrition Goals dialog.
- **Daily Totals** block (`grid 2×2`): **Calories** `{total} / {goal}`, **Protein** `{total}g / {goal}g`,
  **Carbs** `{total}g / {goal}g`, **Fat** `{total}g / {goal}g`. Totals `toFixed(1)`.
- List of selected items. If empty: **"No items in your plan yet"** and (mobile only) an
  **"Add Food Items"** button that switches to the Food Items tab.
- Each selected item card shows: `Name` (primary color), muted `{Location} ({TimeOfDay})`, and macro
  rows **scaled by quantity** (Portion Size raw; Calories = `parseFloat(calories)*qty` toFixed(1);
  protein/carbs/fat = value*qty + `g`, or the "less than 1 gram" phrase verbatim). On the right: a
  **−** button (disabled at qty 1), the quantity number, a **+** button, and an **X** (destructive)
  remove button.

**2.4.1 Selection identity & quantity.** An item is uniquely identified by the tuple
`(Name, Location, TimeOfDay, Date)`. Selecting adds `{...item, quantity:1}`; re-selecting the same
tuple removes it. Quantity min is 1 (`Math.max(1, qty+change)`).

**2.4.2 Macro totals (`calculateNutritionTotals`):**
```
for each selected item:
    for each macro in [calories, protein, carbs, fat]:
        v = parseFloat(item[macro] || "0")
        if not NaN: total_macro += v * item.quantity
```
NaN / missing macros contribute 0. Totals are plain numbers; goals are integers.

**2.4.3 Goal percentage (`calculateGoalPercentage`), used by NutritionSummary:**
`round(value / goal * 100)`; if goal is 0/missing, fall back to defaults (calories 2000, protein 50,
carbs 275, fat 78). (Note: `NutritionSummary.tsx` exists using MUI but is **not** rendered by the
current planner page — the live UI uses the "Daily Totals" block above. Port the Daily Totals block;
the percentage helper is optional.)

**2.4.4 Nutrition Goals dialog (`NutritionGoalsDialog.tsx`):** Title **"Set Nutrition Goals"**,
subtitle "Set your daily nutrition goals to track your progress". Four numeric inputs: **Daily
Calories**, **Protein (g)**, **Carbs (g)**, **Fat (g)** (min 0). Buttons **Cancel** / **Save Goals**.
Empty field saves as 0. On save: update store immediately, then persist — if signed in via
`saveNutritionGoals(token, goals)` → POST `/api/nutritionGoals`; if signed out, `saveGoalsToStorage`
→ localStorage `nutritionGoals`.

**2.4.5 Persistence:** selected plan items persist in **sessionStorage** key `nutrientplannerItems`
(survives navigation, cleared when the tab/session ends). Loaded on mount via `getSavedItemsFromStorage`.

**Default nutrition goals:** `{ calories: 2000, protein: 50, carbs: 275, fat: 78 }`.

---

### 2.5 Your Favorites (`/preferences`, `pages/Preferences.tsx`)

**Purpose:** List & manage the user's favorited item names (only meaningful when signed in).

- Title: **"Your Favorite Items"**.
- If `userPreferences` non-empty: a list of buttons, each showing `{Name} ★` on the left and a red
  **`−`** (minus) glyph on the right. Tapping the row removes that favorite (toggles it out of
  `userPreferences`, POST to backend).
- If empty/none: muted text **"You have no favorite items yet."**
- This route only appears in nav when signed in. (Signed-out users have `userPreferences = null`.)

---

### 2.6 Auth popup (`AuthPopup.tsx`) — shown when a signed-out user tries to favorite

Modal. Title **"Not Signed In"**, description **"You need to log in to add this item to your
favorites."** Buttons: **"Dismiss"** (X icon, closes) and **"Sign in with Google"** (Google icon;
while working shows spinner + "Signing in..."). On success: toast "Login Successful" / "Welcome to
NU Food Finder!", reset fetch flags, close.

### 2.7 Account popup (`account-popup.tsx`)
Opened from the "Account" button. Two states:
- **Signed out:** title **"Sign In"**, description "Get the best out of our app by signing in!",
  body "Sign in to save your preferences, access your favorites, and more!", full-width **"Sign in
  with Google"** button.
- **Signed in:** title **"Account Information"**, description "Manage your account settings and
  preferences." Shows **Email** (the user's email), and a **Notifications** toggle (`Switch`) with
  helper text "Get emailed a list of where your favorites will be at the start of each day!"
  Toggling posts to `/api/mailing` and stores `sessionStorage["mailing"]`. Full-width destructive
  **"Sign Out"** button (spinner "Signing out..." while working; toast on success).

### 2.8 Feedback dialog (`feedback-button.tsx`)
Title **"Send Feedback"**, description "Let us know if you encountered any issues or have suggestions
for improvement." Fields: **Email** (optional if signed out; pre-filled & read-only if signed in) and
**Your Feedback** textarea (required). Submits via EmailJS; toast "Feedback Sent" / "Thank you for
your feedback!". (For iOS, could map to a mailto or a native feedback form — the exact EmailJS
integration is web-specific.)

---

## 3. Data layer

### 3.1 Store shape (`store.ts`, zustand)
```
UserDataResponse: {
    allItems: string[]                      // catalog of item names
    weeklyItems: { [YYYY-MM-DD]: DailyItem[] }   // menu keyed by local date
    userPreferences: string[] | null       // favorites; null when signed out
    locationOperationHours: OperationHoursData[] // per-location weekly hours
    mailing: boolean
    nutritionGoals: { calories, protein, carbs, fat }   // numbers
    displayPreferences: { visibleLocations: string[], hasSavedDisplayPreferences: bool } | null
}
loading: boolean
error: string | null
hasFetchedAllData / hasFetchedGeneralData / hasFetchedOperatingTimes: boolean  // fetch guards
```
Actions: `fetchAllData(token)`, `fetchGeneralData()`, `fetchNutritionGoals(token)`,
`saveNutritionGoals(token, goals)`, `setUserPreferences(list)`, `updateNutritionGoals(goals)`,
`resetFetchFlags()`, `clearUserData()`.

### 3.2 Backend endpoints
Base URL from `VITE_BACKEND_URL` (dev fallback `http://localhost:8081`). Production backend is the
NUFood API. Endpoints used:
- `GET /api/generalData` — no auth. Returns `{ allItems, weeklyItems, locationOperatingTimes,
  nutritionGoals }`. (Note server field is `locationOperatingTimes`, mapped into store's
  `locationOperationHours`.) For signed-out users, `userPreferences` is set to `null`,
  `displayPreferences` to `null`, `mailing` false.
- `GET /api/allData` — auth (Bearer token). Returns everything above **plus** `userPreferences`,
  `mailing`, and `displayPreferences`.
- `POST /api/userPreferences` — body = full `string[]` of favorite names (auth).
- `POST /api/mailing` — body `{ mailing: bool }` (auth).
- `POST /api/displayPreferences` — body `{ visibleLocations: string[] }` (auth).
- `GET/POST /api/nutritionGoals` — get/save goals (auth). **Backend uses PascalCase keys**
  (`Calories`, `Protein`, `Carbs`, `Fat`); the store maps them to camelCase on read.

### 3.3 When data is fetched (`data-loader.tsx`)
On mount and whenever auth resolves:
- If a previous token existed and now it's null → **sign-out**: `clearUserData()` (wipes user fields,
  resets flags, then immediately `fetchGeneralData()`).
- Else if `token` present → `fetchAllData(token)`.
- Else (initial, no token ever) → `fetchGeneralData()`.
Each fetch is guarded by its `hasFetched*` flag (won't refetch until flags reset). Signing in resets
the flags (via `resetFetchFlags`) so `fetchAllData` runs. `authLoading` gates all of this (nothing
fetches until Firebase auth state resolves).

### 3.4 Local persistence (localStorage / sessionStorage keys)
| Store | Key | Contents |
|-------|-----|----------|
| localStorage | `vite-ui-theme` | theme: "dark"/"light"/"system" |
| localStorage | `displayPreferences` | `{ visibleLocations: string[], hasSavedDisplayPreferences: true }` |
| localStorage | `nutritionGoals` | goals object (signed-out users) |
| sessionStorage | `nutrientplannerItems` | selected planner items (with quantity) |
| sessionStorage | `showPreferences` | "false" once the display-settings dialog is dismissed |
| sessionStorage | `mailing` | "true"/"false" mirror of the notifications toggle |
| sessionStorage | `userPreferences`, `availableFavorites` | removed on sign-out (legacy cleanup) |

**Display preferences precedence** (`displayPreferences.ts` + DailyItems effects): browser-local
localStorage is the source of truth for the next paint. For signed-in users, changes are also
mirrored to the backend. On a *fresh* browser (nothing saved locally) that signs in, the app adopts
the server's saved `visibleLocations` **once** and writes them locally; if local prefs already exist,
local wins and the server value is ignored (prevents flicker). Sign-out does NOT clear
`visibleLocations` (display prefs survive sign-out).

### 3.5 Date handling & timezone (⚠ important)
- `toLocalISODate(date)` (`util/date.ts`) formats a `Date` as `YYYY-MM-DD` **using the device's
  local calendar fields** (`getFullYear/getMonth/getDate`) — NOT UTC. `weeklyItems` and hours are
  keyed/looked-up by this local date string.
- `getCurrentDateFormatted()` in the planner does the same thing inline for "today".
- **Timezone caveat:** the *data* is Northwestern (US Central) dining data, but the app computes
  "today", "current meal", and "open now" against the **device's local clock/timezone**, not
  explicitly Central. On the web this is fine because users are on campus. **For the iOS port,
  decide deliberately:** to match web behavior exactly, use the device local timezone; to be correct
  for a user physically outside Central time, you would pin to `America/Chicago`. The React code does
  NOT pin to Central anywhere — it relies on device local time. Recommend pinning menu-day and
  open/closed calculations to `America/Chicago` for correctness, and document the divergence.
- Operation Hours indexes `Week` by `date.getDay()` (0=Sun…6=Sat) as a fallback, and by matching the
  `Date` string primarily.

### 3.6 Current-meal computation (`getCurrentTimeOfDay`, `util/helper.ts`)
By local hour:
```
7  <= hour <= 10  -> "Breakfast"
11 <= hour <= 16  -> "Lunch"
17 <= hour <= 22  -> "Dinner"
otherwise         -> ""   (no meal)
```
Used to default `visibleTimes` on Daily Items. (Note the gaps: before 7am and 23:00–24:00 yield no
default meal.)

### 3.7 Open-now / open-locations logic
`getDailyLocationOperationTimes(hours, date)` → `{ [shortName]: OperatingTime[] | null }`:
for each of the 5 halls, find the `OperationHoursData` by alias, take `Week[date.getDay()]`; if
`Status === "closed"` or no `Hours` → `null`, else the `Hours` array.

`isLocationOpenNow(operatingTimes)` → true if **now** is within any interval (`start <= now < end`,
same calendar day; does not itself handle midnight-cross — that nuance lives in `Status.tsx`).

`getCurrentTimeOfDayWithLocations(map)` → `{ timeOfDay, openLocations }` where `openLocations` is the
list of short names currently open (used for the "N locations open" subline).

### 3.8 Nutrient helpers (`nutrientPlannerUtils.ts`)
- `getNutrientDisplay(value, qty, unit)` → "N/A" for missing/`NaN`/`NaNg`/`undefined`, else
  `(num*qty).toFixed(1)+unit`.
- `calculatePercentage(value, dailyValue)` = `round(value/dailyValue*100)`.
- `calculateGoalPercentage` (see §2.4.3).
- Goals load/save to localStorage `nutritionGoals`; items load/save to sessionStorage
  `nutrientplannerItems`. Defaults `{2000,50,275,78}`.

---

## 4. Auth flow

- **Provider:** Firebase Auth, **Google Sign-In via popup** (`signInWithPopup` + `GoogleAuthProvider`).
  On iOS, use Firebase Auth's native Google Sign-In flow (or Sign in with Apple as an additional
  option if desired) — the app model just needs: a Firebase user + a fresh ID token.
- **Token acquisition (`useAuthToken.ts`):** `onAuthStateChanged` sets `user`, clears `authLoading`.
  If a user is present, fetch a fresh ID token (`getIdToken(true)`) and subscribe to
  `onIdTokenChanged` to keep `token` current. Signed out → `token = null`.
- **Where tokens attach:** every authed request sends `Authorization: Bearer <token>` (see §3.2).
- **UI changes when signed in:**
  - "Your Favorites" (`/preferences`) nav item appears.
  - Favoriting works (no Auth popup); `★/☆` reflect saved favorites; "My Favorites" accordion appears
    on Daily Items when favorites are on today's menu.
  - Account popup shows email, notifications toggle, and Sign Out.
  - Nutrition goals persist to backend (not just local).
  - Display preferences sync to backend for cross-device.
- **On sign-in:** `resetFetchFlags()` then `fetchAllData(token)` re-pulls user data.
- **On sign-out:** `clearUserData()` wipes user fields and reloads general data; `userPreferences`
  becomes `[]`→ effectively cleared, favorites views empty.

---

## 5. Visual design

### 5.1 Theme = Rosé Pine. Colors are HSL CSS vars (`index.css`). All values below are `H S% L%`.

**Light mode ("Rosé Pine Dawn"):**
| Token | HSL | Approx hex |
|-------|-----|-----------|
| background | 32 57% 95% | #faf4ed |
| foreground (text) | 248 25% 35% | #4d4668 |
| card / popover | 35 100% 98% | #fffaf3 |
| card-foreground | 248 25% 35% | #4d4668 |
| primary (iris) | 268 35% 55% | #8b7ab8 |
| primary-foreground | 32 57% 95% | #faf4ed |
| secondary / muted / border / input | 30 40% 88% | #ede0d3 |
| muted-foreground | 248 18% 48% | #726a85 |
| accent | 268 25% 65% | #a394c7 |
| accent-foreground | 248 25% 25% | #3e3a4f |
| destructive (love) | 343 45% 52% | #c85577 |
| destructive-foreground | 32 57% 95% | #faf4ed |
| ring | 268 35% 55% | #8b7ab8 |
| chart-1 (love) | 343 45% 52% | |
| chart-2 (foam) | 189 35% 45% | |
| chart-3 (pine) | 197 55% 30% | |
| chart-4 (gold) | 35 85% 50% | |
| chart-5 (favorites purple) | 268 55% 65% | |
| item-hover | 30 25% 95% | subtle warm |
| item-selected | 268 20% 88% | soft iris |
| item-selected-foreground | 248 25% 30% | |

**Dark mode ("Rosé Pine Main"), app default:**
| Token | HSL | Approx hex |
|-------|-----|-----------|
| background | 249 22% 12% | #191724 |
| foreground | 245 60% 92% | #e6e3f7 |
| card / popover | 249 20% 16% | #24202f |
| primary (iris) | 267 65% 80% | #ceadee |
| primary-foreground | 249 22% 12% | #191724 |
| secondary / muted / border / input | 248 30% 22% | #2d2a42 |
| muted-foreground | 248 20% 65% | #9f9bb8 |
| accent | 267 45% 70% | #b89ad6 |
| accent-foreground | 245 60% 92% | #e6e3f7 |
| destructive (love) | 343 80% 70% | #f16d96 |
| ring | 267 65% 80% | #ceadee |
| chart-4 (gold) | 35 90% 74% | |
| chart-5 (favorites purple) | 267 75% 85% | |
| item-hover | 248 15% 28% | |
| item-selected | 267 30% 35% | muted dark iris |
| item-selected-foreground | 245 50% 91% | |

**Status/semantic colors (hardcoded, not theme vars):**
- Open (status text & hours-grid blocks): green — status uses `text-green-500`; grid fill uses
  `bg-green-600` (#16a34a).
- Closed / invalid-data errors: red — `text-red-500`, plus `text-destructive` for closed hours.
- "Invalid Data" status: yellow — `text-yellow-500`.
- Error popup title: `text-red-600`.
- Hours-grid "now" line: `bg-red-500` (#ef4444) with a subtle glow (`box-shadow: 0 0 4px rgba(239,68,68,0.8)`).
- Contiguous open-block outline in the grid uses the theme `accent` color.

### 5.2 Radius, shadows, fonts
- `--radius: 0.5rem`. Tailwind `rounded-lg = 0.5rem`, `md = radius-2px`, `sm = radius-4px`. Item
  buttons use `rounded-lg`; location cards `rounded-xl`.
- Custom shadow `shadow-left-bottom`: `-4px 4px 8px rgba(0,0,0,0.1), -2px 2px 4px rgba(0,0,0,0.06)`
  (light); heavier in dark. Used on location cards.
- Fonts: the app uses the default system/Tailwind sans stack (no custom web font imported in
  source). For iOS use the system font (SF Pro). Headings are bold; titles `text-2xl`/`text-3xl`.

### 5.3 Card / accordion / item idioms
- **Location card:** `p-6`, `rounded-xl`, `bg-card`, 1px border, left-bottom shadow; dimmed 75% when
  no items.
- **Item button (list row):** full width, left-aligned, `p-4`, `rounded-lg`, `border-2`,
  transition, hover `scale(1.02)` + shadow. Selected: filled `item-selected` bg + `primary` border +
  `★`. Unselected: `card` bg + `border` + hover `item-hover`/`muted-foreground` border + `☆`.
- **Accordion (MUI):** header row with station name + expand chevron; content is the item list.
  Favorites/default stations start expanded; others collapsed (unless expand-all).
- **Badges:** `Added` badge (planner) = filled primary; count badge = secondary. Rounded `md`,
  `text-xs font-semibold`.

### 5.4 Animations
- Item hover: 200ms transform scale + shadow.
- Card/color transitions: 200–300ms.
- Loader spinner: `Loader2` rotating (planner loading).
- Hours "now" line: 1000ms position transition; recomputed every 60s.
- Status text: recomputed every 60s.
- Theme change: 200ms color transition on several pages.
Minimal, tasteful motion — nothing elaborate. Reduced-motion is respected only for a legacy logo spin
(not in app UI).

### 5.5 Star glyphs
Favorited = `★` (U+2605), not favorited = `☆` (U+2606). Remove control on Favorites page = `−`
(minus, U+2212) in destructive color.

---

## 6. Exact strings (verbatim)

**Brand / titles:** `NUFood` (sidebar & tab titles), "NU Food Finder" (login toast).

**Nav labels:** `Daily Items`, `All Items`, `Operation Hours`, `Nutrient Planner`, `Your Favorites`.
**Header fallback title:** `Dashboard`. **Account button:** `Account`.

**Screen titles / key text:**
- Daily Items: `Daily Items for {MMM d, yyyy}`; sublines `({N} locations open)` / `(All locations closed)`.
- Search placeholders: `Search for an item...` (Daily/All), `Search food items...` (planner).
- Display settings button: `Display Settings`; dialog title `Display Settings`; tabs `Locations`,
  `Times`, `Visual`.
- Location quick-selects: `North Campus`, `South Campus`, `Clear Locations`.
- Visual pref: `Expand All Folders by Default`.
- Favorites accordion header: `My Favorites`.
- "No items available" (empty location card); `No food items match your search criteria.` (planner list);
  `No items in your plan yet` (planner plan); `You have no favorite items yet.` (favorites page).
- All Items title: `Select Your Favorite Items`; pagination `Page {x} of {y}`, `Prev`, `Next`.
- Operation Hours: `Dining Hours`; group headers `Dining Commons`, `Norris Center`, `Retail Dining`;
  time gutter header `Time`; closed cell text `Closed`.
- Planner: `Nutrient Planner`, tabs `Food Items` / `My Plan`, `My Food Plan`, `Daily Totals`,
  `Add Food Items`, `Error loading data: {msg}`. Row fields: `Portion Size:`, `Calories:`,
  `Protein:`, `Carbs:`, `Fat:`, value `N/A`, badge `Added`.
- Goals dialog: `Set Nutrition Goals`, `Set your daily nutrition goals to track your progress`,
  labels `Daily Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, buttons `Cancel` / `Save Goals`.
- Favorites page title: `Your Favorite Items`.
- Status: `Status -- Closed`, `Status -- Invalid Data`, `Status -- Open until {time}`,
  `Status -- Closes in {n} minute[s]`, `Status -- Opens in {n} minute[s]`, `Status -- Closed until {time}`.
- Auth popup: `Not Signed In`, `You need to log in to add this item to your favorites.`, `Dismiss`,
  `Sign in with Google`, `Signing in...`.
- Account popup: `Account Information` / `Sign In`, `Manage your account settings and preferences.`
  / `Get the best out of our app by signing in!`, `Email`, `Notifications`, `Get emailed a list of
  where your favorites will be at the start of each day!`, `Sign in to save your preferences, access
  your favorites, and more!`, `Sign Out`, `Signing out...`.
- Error popup: `Error Loading Data`, `We're having trouble loading the menu items. This could be due
  to a temporary issue with our data source. Please try again later or contact support if the problem
  persists.`
- Feedback: `Send Feedback`, `Let us know if you encountered any issues or have suggestions for
  improvement.`, `Email`, `Your Feedback`, `Send feedback`, toast `Feedback Sent` / `Thank you for
  your feedback!`.
- Support: `Support this project`, tooltip `Buy me a coffee!` (→ buymeacoffee.com/aidenlee11).
- Toasts: `Login Successful` / `Welcome to NU Food Finder!`; `Login Failed` / `An error occurred
  during login. Please try again.`; `Signed Out Successfully` / `We hope to see you again soon!`.

**Station whitelist (default-expanded, exact):**
`My Favorites, Comfort, Comfort 1, Comfort 2, Rooted, Rooted 1, Rooted 2, Pure Eats, Pure Eats 1,
Pure Eats 2, Kitchen Entree, Kitchen Sides`.

**Weekday names** (from `getWeekday`, index 0=Sunday): `Sunday, Monday, Tuesday, Wednesday, Thursday,
Friday, Saturday`.

---

## 7. Notable / surprising / ambiguous findings

1. **`visibleTimes` defaults to only the current meal.** On Daily Items load, only the current meal
   section shows (e.g. only Lunch at noon), and **outside meal windows (before 7am, 23:00–24:00) NO
   meal shows** until the user enables a time in Display Settings → Times. This is easy to mistake for
   "no data." Consider defaulting to all three meals on iOS, or replicate faithfully and surface a hint.

2. **Timezone is device-local, not pinned to Central.** Despite being Northwestern (Central time)
   data, "today", "current meal," and "open now" all use the device clock. Off-campus users in other
   timezones will see the wrong "today"/status. Recommend pinning to `America/Chicago` on iOS and
   noting the divergence (§3.5).

3. **Macro values are messy strings.** Fields can be `undefined`, `"NaN"`, `"NaNg"`, `"undefined"`,
   or the phrase `"less than 1 gram"`. Every display path guards against these. Port the exact
   defensive formatting (N/A rules; verbatim "less than 1 gram"; `g` suffix on protein/carbs/fat but
   not calories).

4. **Two different open/closed computations.** `isLocationOpenNow` (helper, no midnight handling,
   used for the "N open" count) vs `Status.tsx` (full midnight-cross + next-open/next-close text).
   They can theoretically disagree around midnight. Port `Status.tsx`'s richer logic for badges.

5. **Operation Hours grid is complex.** The half-hour green-block merging with edge-only borders is
   intricate (`getLocationTimeInfo`, `shouldExtendUp/Down`). A simpler iOS rendering (e.g. per-location
   open-interval bars or a schedule list) would likely be acceptable and much simpler; the grid's
   exact pixel-merging behavior is not load-bearing to the app's purpose.

6. **`NutritionSummary.tsx` is dead code** — it's an MUI component not mounted by the current planner
   page (which uses the "Daily Totals" block in `SelectedItemsList`). Don't port NutritionSummary's
   layout; port Daily Totals.

7. **Banner renders nothing** — `banner.tsx` is a no-op. Only its context's scroll-to-top ref is used
   (All Items pagination). No banner UI to build.

8. **Favorites are matched by exact `Name` for "available favorites" but case-insensitively for the
   toggle.** `availableFavorites` uses `Set(userPreferences).has(item.Name)` (exact), while the
   add/remove toggle compares `.toLowerCase().trim()`. Duplicated names across halls dedupe by `Name`.

9. **Planner has no date picker** — it always uses *today* (`weeklyItems[today]`). Daily Items and
   Operation Hours DO have date pickers (range-limited to the loaded week).

10. **`allItems` is a flat `string[]`** (names only) — All Items and Favorites screens have no macro
    or location context, unlike Daily Items / Planner which use full `DailyItem` objects.

11. **Pagination page-size is 100**; the desktop numbered pager caps at 5 visible numbers with
    ellipses. Simplify to a standard iOS list/section if desired.

12. **Notifications toggle (`mailing`)** posts to the backend and is mirrored in sessionStorage but
    is only surfaced in the Account popup — it drives a daily "where are your favorites" email.
