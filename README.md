# NUFood

A modern, fast alternative to Northwestern University's Dine on Campus app. View dining hall menus, operating hours, track your nutrition, and save your favorite foods to get personalized recommendations on where to dine.

Live at: [nufood.me](https://nufood.me)

## Features

-  Fast, responsive interface
-  Real-time dining hall items and operating hours
-  View future and past daily menus within the week
-  Search through all available menu items
-  Save favorite foods and get personalized recommendations
-  Mobile-friendly design
-  Email notifications of where favorite foods are
-  Nutrition tracking to hit your goals
-  Retain the last 100 days of successfully scraped menus

## Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Firebase Authentication
- Google Analytics for usage tracking

### Backend
- Go (Golang) for API and scraping
- PostgreSQL database 
- Firebase Admin SDK for auth verification
- Headless Chromium (`chromedp`) for browser-context DineOnCampus API fetching

## Deployment

The application is deployed using:
- Frontend: Vercel
- Backend: Railway
- Database: Railway PostgreSQL

### Backend Runtime Note
The backend now relies on a Chrome-based headless runtime for scraping. Use the pinned `backend/Dockerfile` on Railway to guarantee Chromium availability and set `CHROME_BIN` consistently.

### Scheduled Scraping

The Vercel cron calls `/api/scrape`, which invokes the protected Railway scrape endpoints. Configure:

- Vercel: `BACKEND_URL`, `CRON_SECRET`, and optionally `SCRAPE_TOKEN`
- Railway: `SCRAPE_TOKEN` (the same value as Vercel's `SCRAPE_TOKEN`, or `CRON_SECRET` when the optional value is omitted)
- Optional remote browser: `BROWSERLESS_WS_URL` or `BROWSER_WS_ENDPOINT`

Scrape endpoints accept authenticated `POST` requests only. Menu updates are transactional: failed or partial scrapes leave existing data unchanged, successful scrapes replace only the requested dates, and menu rows older than 100 days are pruned.

## Screenshots

### Weekly Items View
![Weekly Items View showing dining locations items and their current status](./frontend/public/images/main.png)

### All Items View
![Display of all historical items that Northwestern has served.](./frontend/public/images/allItems.png)

### Operation Hours
![Operation Hours View showing dining locations and their status](./frontend/public/images/operationTimes.png)

### Nutrition Tracker
![Nutrition Tracker that allows you to see the macros of the foods being served.](./frontend/public/images/nutrition.png)

### Favorite Items Selection
![Favorite Items View showing your selected favorites.](./frontend/public/images/favorites.png)

## Contributing

This is primarily a personal project for Northwestern University students, but feel free to open issues if you encounter any bugs or have suggestions for improvements.
