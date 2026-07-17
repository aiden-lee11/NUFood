# NUFood iOS

Native SwiftUI port of [dining.nu](https://dining.nu). Talks to the same production
backend as the web app (read/write via the existing REST API — no backend changes).

## Requirements

- **Full Xcode** (not just Command Line Tools) from the Mac App Store. After installing, point
  the developer tools at it once:
  ```sh
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
- **XcodeGen** (already installed via Homebrew) — regenerates `NUFood.xcodeproj` from `project.yml`:
  ```sh
  cd ios && xcodegen generate
  ```
  Run this after adding/removing source files. The generated `.xcodeproj` is committed, so you
  only need it when the file list changes.

## Running

```sh
cd ios
xcodegen generate
open NUFood.xcodeproj
```

Then pick an iPhone simulator and press Run. First build downloads Swift Package
dependencies (Firebase, GoogleSignIn) — give it a few minutes.

## Google Sign-In setup (one-time, optional)

The app is fully usable signed-out (menus, hours, search, planner). Favorites/goals sync
requires Google sign-in, which needs an iOS app registered in the existing Firebase project:

1. Open the [Firebase console](https://console.firebase.google.com) → project **nufoodfinder-3c55d**.
2. Project settings → *Your apps* → **Add app** → iOS. Bundle ID: `me.nufood.app`.
3. Download `GoogleService-Info.plist` and drop it at `ios/NUFood/Resources/GoogleService-Info.plist`
   (gitignored).
4. Rebuild. A build script injects the Google redirect URL scheme automatically; auth then
   works with the same Google accounts and data as the website.

Without the plist, the sign-in button explains that setup is pending; nothing crashes.

## Layout

```
ios/
  project.yml            # XcodeGen project definition (SPM deps, build settings)
  docs/SPEC.md           # UI/UX spec extracted from the web frontend (source of truth for parity)
  NUFood/Sources/
    App/                 # entry point, tab root
    Models/              # Codable API models + nutrient parsing
    Networking/          # REST client (production Railway backend)
    Auth/                # Firebase + Google Sign-In wrapper
    State/               # AppStore (observable store), operating-hours logic, Central-time helpers
    Theme/               # Rosé Pine palette (light/dark), appearance setting
    Views/               # one folder per screen + Shared components
```

Design decisions of note: all menu-date and open/closed math is pinned to `America/Chicago`
(the web app uses device-local time; Central is correct for Northwestern data), and search is
plain case-insensitive matching instead of the web's Fuse.js fuzzy matching.
