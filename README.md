# MusicX — Spotify Monthly Listener Futures MVP

Predict monthly listener counts for top and rising Spotify artists by settlement dates (e.g. November 1st). Built on the same stack pattern as FitStreak:
- **Backend**: Express + SQLite CPMM liquidity pools (ready for **Railway**)
- **Web**: React 19 + TypeScript + Vite responsive dark-mode (ready for **Vercel**)
- **Mobile**: Universal Expo React Native app structure (iOS & Android)

---

## 📁 Project Structure

```
musicx/
├── server/          # Node/Express API with SQLite + Seed Data (Railway)
│   ├── src/
│   │   ├── db.js    # SQLite schema (users, artists, markets, positions)
│   │   ├── seed.js  # 6 seeded artists (Chappell Roan, Billie Eilish, Diljit, etc.)
│   │   └── index.js # REST endpoints (/api/markets, /api/predict, /api/user)
│   └── railway.json # One-click deployment config
│
├── web/             # Responsive Web & Mobile Web App (Vercel)
│   ├── src/
│   │   ├── App.tsx  # Spotify Listener Futures trading UI & portfolio
│   │   └── index.css# Dark-mode glassmorphic styling
│   └── vercel.json  # SPA rewrites & build configuration
│
└── mobile/          # Expo iOS & Android App configuration
    └── app.json     # Bundle IDs: fun.musicx.futures (iOS / Android)
```

---

## 🚀 Running Locally

### 1. Start the Backend API (Port 3001)
```bash
cd musicx/server
npm install
npm run seed     # Seeds test markets & artist listener stats
npm run dev      # Starts API on http://localhost:3001
```

### 2. Start the Web App (Port 5173)
```bash
cd musicx/web
npm install
npm run dev      # Opens http://localhost:5173
```

---

## 🚢 Production Deployment

### Backend on Railway
1. Push this repo to GitHub.
2. In [Railway.app](https://railway.app), create a new project from your repo pointing to `/musicx/server`.
3. Railway automatically detects `railway.json` and runs `npm start`.

### Frontend on Vercel
1. In [Vercel](https://vercel.com), add a new project pointing to root directory `musicx/web`.
2. Add environment variable:
   - `VITE_API_URL`: `https://your-railway-url.up.railway.app`
3. Click **Deploy**.
