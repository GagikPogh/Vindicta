# Vindicta AI

AI-powered investigative intelligence platform.

## Stack

- **Frontend:** Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend:** FastAPI, PostgreSQL, Neo4j, Redis
- **Auth:** JWT, Google OAuth, Apple OAuth

## Quick Start

```bash
cp .env.example .env
docker compose up -d
cd frontend && npm install && npm run dev
```

Or double-click **Vindicta AI** on the desktop (Linux).

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Phone Intelligence — выбор API

| API | Тип | Рекомендация |
|-----|-----|--------------|
| **Twilio Lookup** | Официальный | Лучший для production: CNAM, carrier, fraud |
| **Numverify** | Официальный | Быстрая валидация и оператор |
| **Truecaller Business** | Официальный | Caller ID для бизнес-приложений |
| **GetContact wrappers** | Неофициальный | ❌ Не использовать — бан, ToS, нестабильность |

### Настройка в `.env`

```env
NUMVERIFY_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

## Demo Phone Numbers

- `+79001234567` — RU demo with contact tags and social profiles
- `+14155550100` — US demo

## Pages

- `/` — Landing
- `/dashboard` — Dashboard
- `/phone` — Phone Intelligence
- `/search` — Entity search
- `/investigations` — Cases
- `/graph` — Relationship graph
- `/timeline` — Timeline
- `/reports` — Reports
- `/settings` — Settings

## License

Proprietary — Vindicta AI © 2026
