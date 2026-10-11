# Remix of Ropseller (81)

qara menga sotuvchi ROP lar uchun barcha narsani nazorat qiladigan sayt qilib ber zakazlar ham shu yerdan urilsin va har bir sotuvchi va har bir kun oy va hohlagan sanalar boyicha malumotlar chiqib tursin menga mukammal sayt qilib ber va har bir sotuvchi uchun alohida profile ber va u ozi haqida barcha malumotlar bilib tursin

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/76af2d90-0f70-4b9a-bd9c-80647cad934a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

This project runs entirely locally now: a React/Vite frontend and an Express + PostgreSQL backend (`server/`), no external services required.

### Prerequisites

- Node.js and npm
- A local PostgreSQL server (this project was set up against PostgreSQL 17 on `localhost:5433`, database `daraja_erp`)

### First-time setup

```sh
# Frontend deps
npm i

# Backend deps
cd server
npm i
cp .env .env.local   # or edit server/.env directly: set DATABASE_URL, JWT_SECRET, etc.
npm run db:push       # creates the schema in the daraja_erp database
npm run db:seed       # seeds the default lead stages
cd ..
```

### Running

```sh
npm run dev:all   # starts both the Vite frontend (8080) and the API server (4000)
```

Or run them separately: `npm run dev` (frontend) and `npm run dev:server` (backend).

The frontend proxies `/api` and `/uploads` to the backend (see `vite.config.ts`), so it talks to `http://localhost:4000` transparently in dev.

### Optional integrations

`server/.env` has placeholders for Telegram bot, Google Sheets, and Facebook Leads webhook credentials. The app works fully without them — those features just no-op until configured.
