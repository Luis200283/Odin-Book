# TAREAS — Odin-Book

Estado resumido del proyecto. La app vive en `src/`. Los cambios actuales están en el working tree; **no se ha creado commit**.

---

## 1. Qué está listo ahora

### Fase 0 — limpieza base

- Next.js 16 + App Router + React 19 + TypeScript + Tailwind.
- `pnpm lint`, `pnpm build` y `pnpm prisma validate` pasan.
- `git diff --check` pasa.
- `output: "standalone"` en `next.config.ts`; flags experimentales eliminadas.
- `pnpm dev:all` levanta Next.js + Socket.IO.
- Redis:
  - `lib/redis.ts`: cliente singleton + `connectRedis()`.
  - URL por defecto `redis://localhost:6379`.
  - `src/compose.yaml`: servicio `redis:7-alpine`, healthcheck, volumen `redis-data`, `depends_on`.
  - Redis no es obligatorio para que la app siga funcionando en feed futuro; debe arrancarse con `docker compose up -d redis`.
- `.env.example` sin secretos reales; incluye `SOCKET_TOKEN_SECRET`, Supabase server-only y Google placeholders.
- Validación de entorno con Zod en `lib/env.ts`: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `REDIS_URL`, `SOCKET_TOKEN_SECRET`, Supabase.
- `/api/health` valida env, hace `SELECT 1` en Prisma y `PING` en Redis.
- Supabase client en `lib/supabase.ts`; `lib/supabse.ts` eliminado.
- `lib/socket.ts` antiguo y `lib/index.html` eliminados.
- `googleSignIn()` corregido en `lib/auth-client.ts`.
- Pruebas movidas a `/lab`; sin chat de producto todavía.

### Fase 1 — modelo social + seed + onboarding

Modelo Prisma en `prisma/schema.prisma`:

- `User`: `username` único, `bio`, `name`, `image`, `email`, auth Better Auth, `posts`, `comments`, `likes`, `following`, `followers`.
- `Post`: `authorId`, `content`, `imageUrl`, `likeCount`, `commentCount`, `createdAt`, `updatedAt`, `likes`, `comments`.
  - `content` máx. 280 en validación app; DB permite null pero app exige contenido o imagen.
  - índices `(authorId, createdAt desc, id desc)` y `(createdAt desc, id desc)`.
- `Like`: único `(userId, postId)`, índice `postId`, cascade.
- `Comment`: `postId`, `authorId`, `content`, `createdAt`, índice `(postId, createdAt desc)`, cascade.
- `Follow`: `(followerId, followingId)`, índice `followingId`, cascade.
- `message` antiguo para Socket.IO demo se mantiene.

Migración:

- `prisma/migrations/20261126223836_social_mvp/migration.sql`.
- Es aditiva: `username`, `bio`, tablas sociales, índices, FKs.
- **Todavía no se aplicó** porque la DB Neon no respondió (`P1001`). `pnpm prisma validate` sí pasa.

Seed:

- `prisma/seed.ts`.
- 6 usuarios demo, 18 posts, follows, likes, comentarios.
- Usuarios con password `password123`.
- Reconcilia `likeCount` / `commentCount`.
- Comandos: `pnpm db:seed`, `pnpm prisma migrate deploy`, `pnpm db:reconcile`.
- Script `scripts/reconcile-counts.ts` + `lib/counters.ts`.

Auth:

- Better Auth email/password + Google.
- `lib/session.ts` `getSession()`.
- `app/(app)/layout.tsx`: servidor; sin sesión redirige `/sign-in`; sin `username` redirige `/onboarding`.
- `/onboarding`: elegir username + bio.
- `PATCH /api/users/me`: actualiza perfil; `401`, `400`, `409`, `500`.
- `/dashboard` redirige `/home`.
- `/api/auth/[...all]` Better Auth.
- `/sign-in`, `/sign-up`, `/home`, `/lab`.

Validación app:

- `username`: 3–20, letras/números/`_`, lowercase.
- `bio`: 160.
- `createPostSchema`: `content` 280 + `imageUrl`, requiere texto o imagen.
- `commentSchema`: 1–280.
- `chatMessageSchema`: 1–500.
- Posts públicos solamente; sin privados.

### Estado actual visible

- `/home` protegida, perfil, pero **feed todavía placeholder**.
- `/` landing.
- `/onboarding`.
- `/lab`, `/lab/redis`, `/lab/socket`, `/lab/zod`.
- `/api/health`, `/api/users/me`, `/api/auth/[...all]`, `/api/lab/redis`, `/api/lab/zod`.
- `lib/socket-basic.ts`: Socket.IO standalone `pnpm socket:dev`, `pnpm socket:basic`; eventos demo `welcome`, `app:ping`, `chat message`; **sin auth ni Redis adapter todavía**.
- `SOCKET_TOKEN_SECRET` existe pero **aún no se usa para firmar/verificar tokens**.

---

## 2. Cómo correrlo ahora

Desde `src/`:

```bash
pnpm install
cp .env.example .env
# rellenar DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
# opcional: Google, Supabase, Redis, SOCKET_TOKEN_SECRET

docker compose up -d redis

pnpm prisma generate
pnpm prisma migrate deploy   # o pnpm db:migrate en desarrollo
pnpm db:seed
pnpm db:reconcile

pnpm dev:all
```

Checks:

```bash
pnpm lint
pnpm build
pnpm prisma validate
```

`pnpm dev:all` no arranca Docker Redis; se arranca aparte.  
`pnpm prisma migrate status`, `pnpm db:seed` y `pnpm db:reconcile` requieren DB accesible.  
Actualmente `pnpm prisma migrate status` falla con `P1001`; no se verificó seed contra Neon.

---

## 3. Qué falta para tener MVP listo

### 0. Cerrar Fase 0/1 contra entorno real

- Arrancar Neon/Postgres y Redis; verificar `.env`.
- `pnpm prisma migrate deploy`.
- `pnpm db:seed`.
- `pnpm db:reconcile`.
- `pnpm prisma migrate status`.
- `GET /api/health` → `ok: true`, `db: "up"`, `redis: "PONG"`.
- Smoke: sign-up/sign-in + onboarding + username + login demo.
- `docker compose up` reproducible.
- No commitear `.env`; no dejar secretos reales en `.env.example`; rotar cualquier secreto expuesto.

### Fase 2 — APIs core sociales

Implementar route handlers con Zod, sesión, ownership y errores consistentes `400/401/403/404/429/500`.

- `POST /api/posts`: crear post; `content` 280; `imageUrl` opcional; session required.
- `DELETE /api/posts/:id`: borrar post propio.
- `GET /api/feed?cursor=`: feed cronológico; posts públicos de `following + own`; cursor `(createdAt, id)`; `orderBy createdAt desc, id desc`; `take 21`; `limit`; `nextCursor`.
- `GET /api/posts/:id`: detalle.
- `POST /api/posts/:id/like`: toggle like idempotente; transacción; actualizar `likeCount`.
- `GET /api/posts/:id/comments`: listar comentarios.
- `POST /api/posts/:id/comments`: crear comentario; transacción; actualizar `commentCount`.
- `POST /api/users/:id/follow`: toggle follow; evitar self-follow; ownership no aplica porque acción sobre otro.
- `GET /api/users/:username`: perfil + posts.
- Opcional MVP original: `GET /api/explore`: usuarios sugeridos.
- `PATCH /api/users/me` ya existe; settings UI pendiente.
- Mantener solo posts públicos; no follows privados.
- Tests de APIs: validación, auth, ownership, idempotencia, transacciones, contadores.

### Fase 3 — UI feed + TanStack Query

- Añadir `@tanstack/react-query` (aceptado, aún no instalado).
- Provider + query keys + invalidación.
- `/home`: feed + composer.
- `Composer`, `PostCard`, `FeedList`, `CommentList`, skeletons, empty/error states.
- Paginación cursor / infinite scroll.
- Optimistic updates: like, follow, comment, post.
- `/post/[id]`: post + comentarios.
- `/u/[username]`: perfil + follow + posts.
- `/explore`: usuarios sugeridos.
- `/settings`: editar nombre, bio, avatar, username.
- `/home` placeholder “Feed coming next” reemplazar.
- Funcionar sin realtime antes de añadir sockets.

### Fase 4 — Redis cache + rate limit

- `lib/cache/keys.ts` y `lib/cache/invalidate.ts`; no keys manuales.
- Cache-aside primera página `feed:user:{userId}:v1`, JSON, TTL 60s + jitter, `X-Cache: HIT/MISS`.
- `post:{postId}:stats`, `user:{userId}:profile`, `following:{userId}`, `followers:{userId}`.
- Invalidación:
  - crear/borrar post → feeds followers + autor,
  - follow/unfollow → feed + sets,
  - like → `post:{id}:stats`,
  - comment → `post:{id}:stats`,
  - perfil → feeds + perfil.
- Si Redis falla → fallback Neon; app sigue lenta, no caída.
- Contadores denormalizados + reconciliación periódica.
- Rate limiting `INCR` + `EXPIRE`, `429`, `Retry-After`; p.ej. 5 posts/min, 60 likes/min, 10 comments/min.
- `scripts/bench-feed.ts`: p50/p95 frío vs caliente + conteo queries Prisma; segunda carga = HIT y menos queries.

### Fase 5 — Socket.IO realtime

- `GET /api/socket-token`: JWT 5 min con `SOCKET_TOKEN_SECRET`; requerir min 32; `jose`.
- Cliente `io(SOCKET_URL, { auth: { token }, transports: ["websocket"] })`; re-pedir token en reconexión.
- Socket middleware verificar JWT; `socket.join("user:" + userId)`.
- Redis adapter `@socket.io/redis-adapter` (ya dependencia): pub/sub separados, `connect`, `io.adapter(...)`.
- Puente Next.js → Socket.IO: mutaciones `redis.publish("realtime:events", ...)`; subscriber en socket; no requerir Prisma en socket.
- Eventos: `post:new`, `post:deleted`, `like:changed`, `comment:new`, `post:subscribe`, `post:unsubscribe`.
- Salas `user:{followerId}`, `post:{postId}`; máx. 50–100 posts suscritos.
- On reconnect invalidar feed; Redis caído = sin realtime pero app sigue con Neon.
- CORS exacto; producción websocket o sticky sessions.
- Separar lab `lib/socket-basic.ts` del producto; no enlazar desde MVP social.
- Tests con dos navegadores/usuarios en vivo.

### Fase 6 — Imágenes Supabase

- Bucket; `POST /api/uploads/sign`.
- Upload directo a Supabase; `imageUrl`.
- `SUPABASE_SERVICE_ROLE_KEY` server-only; cliente solo publishable key; policies bucket.
- Limites MIME/tamaño; render seguro; avatar opcional.
- Post con imagen end-to-end.
- Fase 6 si se sigue roadmap; no bloquear Fases 2–5 texto + realtime.

### Fase 7 — Hardening + deploy

- Env validation completa; `SOCKET_TOKEN_SECRET`, `BETTER_AUTH_SECRET`, Supabase, Google sin `as string`.
- Secrets no en git; `.env.example` placeholders.
- CORS, cookies/session, CSRF, ownership, rate limits, error handling, logs sin secretos.
- `/api/health` DB + Redis; readiness/liveness; `docker compose`; Docker standalone + Socket.IO + Redis + Neon + Supabase.
- CI: `pnpm lint`, `pnpm build`, `pnpm prisma validate`, `prisma migrate deploy`, `pnpm db:seed`, `pnpm db:reconcile`, `pnpm test`, smoke.
- Tests automáticos aún inexistentes: unit, API, componentes, e2e.
- Deploy temprano smoke cuando Fase 2 esté lista; URL pública con dos usuarios.
- README/docs actualizados.

---

## 4. Fuera del MVP (no hacer ahora)

- DMs / chat como producto.
- Notificaciones, reposts, stories, búsqueda avanzada.
- Ranking algorítmico; feed cronológico.
- Cuentas privadas, moderación avanzada, email verification, password reset.
- App móvil.
- Posts privados; solo públicos.
- TanStack Query optimistic UI completo si primero no cierran APIs Fase 2.

---

## 5. Reglas prácticas para encargarme tareas

- No tocar `.env`, secretos, `node_modules`, `.next`, generated si no es necesario.
- No commitear cambios sin pedir.
- Fase 0 + Fase 1 no requieren rehacer auth/Prisma; construir social APIs encima.
- No mezclar Redis cache/rate limit/socket realtime antes de cerrar APIs core.
- Mantener `pnpm lint`, `pnpm build`, `pnpm prisma validate`.
- Verificar contra DB/Redis real; `pnpm build` no prueba migraciones ni seed.
- Cambios actuales sin commit; revisar `git diff`.
