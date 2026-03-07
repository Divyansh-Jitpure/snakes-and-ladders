# Snakes and Ladders Online

Beginner-friendly starter with:
- `web`: Next.js + Tailwind + Framer Motion
- `realtime`: Express + Socket.IO
- `web/prisma`: Prisma schema for Postgres
- PWA-ready manifest + service worker
- Mobile-first responsive board and controls

## 1) Setup env files

```bash
cd web
copy .env.example .env
```

```bash
cd ..\realtime
copy .env.example .env
```

Update `DATABASE_URL` in `web/.env` with your Supabase/Neon Postgres URL.

## 2) Generate Prisma client

```bash
cd web
npm run prisma:generate
```

## 3) Run both apps

Terminal A:

```bash
cd realtime
npm run dev
```

Terminal B:

```bash
cd web
npm run dev
```

Open `http://localhost:3000`.

## 4) PWA setup (already included)

- `web/public/manifest.webmanifest` is configured
- `web/public/sw.js` is registered in production
- PWA icons are in `web/public/icon-192x192.svg` and `web/public/icon-512x512.svg`

To test install behavior:

```bash
cd web
npm run build
npm run start
```

Then open `http://localhost:3000` in a Chromium browser and use "Install app".

## What is already working

- Create room
- Join room
- Turn-based live dice rolls
- Snakes/ladders movement
- Win detection
- Room state sync for all players
- Responsive layout for mobile and desktop
- PWA install metadata and offline shell cache

## Next features to build

- Board UI (10x10 grid with piece animation)
- Guest auth + persistent users
- Save match + moves into Postgres
- Rejoin/disconnect handling
