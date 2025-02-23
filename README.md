# NUFood

A modern, fast alternative to Northwestern University's Dine on Campus app. View dining hall menus, operating hours, and save your favorite foods to get personalized recommendations on where to dine.

Live at: [nufood.me](https://nufood.me)

## Features

- 🚀 Fast, responsive interface
- 🍽️ Real-time dining hall operating hours
- 🔍 Search through all available menu items
- ⭐ Save favorite foods and get personalized recommendations
- 📱 Mobile-friendly design
- 🔐 User authentication via Firebase
- 📊 Daily menu updates via automated scraping

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

## API Endpoints

```
GET /api/userPreferences         # Get user's favorite items and return matching available items for today
GET    /api/allData                 # Get all dining data
GET    /api/generalData             # Get general dining info
GET    /api/operatingTimes          # Get dining location hours
POST   /api/scrapeDailyItems        # Trigger daily menu scrape
POST   /api/scrapeOperatingTimes    # Trigger hours scrape
DELETE /api/deleteDailyItems        # Clear daily items
DELETE /api/deleteOperatingTimes    # Clear operating times
```
## Deployment

The application is deployed using:
- Frontend: Vercel
- Backend: Railway
- Database: Railway PostgreSQL

## Screenshots

### Operation Hours
![Operation Hours View showing dining locations and their status](./frontend/public/images/operationTimes.png)

### Favorite Items Selection
![Favorite Items View showing how to select preferred menu items](./frontend/public/images/allItems.png)

### Daily Items View
![Daily Items View showing dining locations and their current status](./frontend/public/images/main.png)

## Why Go?

Go was chosen for the backend to explore its:
- Excellent error handling system
- Built-in testing capabilities
- Strong typing and struct system
- Clean syntax and organization

While not all Go features (like goroutines for concurrency) were utilized, the language provided a solid foundation for building a reliable backend service.

## Contributing

This is primarily a personal project for Northwestern University students, but feel free to open issues if you encounter any bugs or have suggestions for improvements.

## License

MIT License

Copyright (c) 2025 [Aiden Lee]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
