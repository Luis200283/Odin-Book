# Odin-Book

A small social app built to learn how Next.js, Prisma, Redis and Socket.IO fit
together. The MVP is a chronological public feed with posts, follows, likes,
comments and realtime updates.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS
- Better Auth (email/password + Google)
- Prisma 7 + Neon Postgres
- Redis (cache, counters, rate limits, Socket.IO adapter)
- Socket.IO (separate Node process)
- Supabase Storage (post images)
- Zod for runtime validation
- TanStack Query for client data (Phase 3)

## Requirements

- Node.js 20+
- pnpm 12+
- A Neon Postgres database
- Redis 7+ (local, Docker, or a hosted Redis)
- Supabase project (optional until Phase 6)
- Google OAuth credentials (optional)

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in the values in .env
```

Generate the Prisma client, apply migrations and seed the demo data:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed
```

Start Next.js and the Socket.IO server together:

```bash
pnpm dev:all
```

Or run them in separate terminals:

```bash
pnpm dev
pnpm socket:dev
```

Open http://localhost:3000.

## Demo users

All seeded users use the password `password123`:

| Email | Username |
|---|---|
| ana@odin.local | @ana |
| luis@odin.local | @luis |
| maya@odin.local | @maya |
| diego@odin.local | @diego |
| sofia@odin.local | @sofia |
| noah@odin.local | @noah |

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm socket:dev` | Socket.IO dev server with watch mode |
| `pnpm dev:all` | Both processes with `concurrently` |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Create/apply a Prisma migration in development |
| `pnpm db:seed` | Seed users, posts, follows, likes and comments |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reconcile` | Recompute `likeCount` and `commentCount` |

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/sign-in`, `/sign-up` | Auth |
| `/onboarding` | Pick a username after sign-up |
| `/home` | Protected app shell (feed in Phase 3) |
| `/lab` | Redis, Zod and Socket.IO experiments |
| `/api/health` | Database + Redis health check |

## Redis in development

If you already have Redis on port 6379, use it. Otherwise:

```bash
docker compose up -d redis
```

The compose file also has a `redis` service with a healthcheck and a persistent
volume. If port 6379 is already in use, stop the other Redis or change the
published port and `REDIS_URL`.

## Security notes

- `.env` is ignored by git. `.env.example` contains placeholders only.
- Rotate any Google OAuth secret that was ever written to a tracked or shared
  file.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never import it into a client
  component.

## Next phases

- Phase 2: posts, feed, follow, like and comment APIs.
- Phase 3: feed UI with TanStack Query.
- Phase 4: Redis feed cache, stats and invalidation.
- Phase 5: authenticated Socket.IO with Redis adapter.
- Phase 6: Supabase signed uploads.
- Phase 7: hardening and deploy.
