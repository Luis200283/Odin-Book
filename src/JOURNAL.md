# My Social Media App Design Journal

> This is my personal guide for building an app (the hardest I've writing so far), and I'm written it for posterity. I'll try to be specific and structure this guide as a tutorial for each tool I implement. I'd also like to make a few comments about the theory, functionality, and bugs that I'll find along the way. With nothing more to add let's get started.

## What does the project involve?

This is a Social Media App, so i going to split this project in a two matters parts. The Backend: `Next.js` inside `Docker` on `Render`. `Prisma` pointing to `Neon`. `Redis` as the connecting tissue. `Socket.IO` for real-time communication. `Better` Auth for identity, `Zod` for trust, and `Supabase` for images. Follow the journey of a piece of data. The otherwise is the Frontend with a `React.js` as a UI runtime, `React-router` for move in a SPA, and `TailwindCSS` for inline styles. So come on step for step

# 1. **<i>Scaffolding</i>**

We go to install all that we need to begin our project amd create the directory structure. Once we've done that, we'll explain each of the tools we use.

1. Create a [`github`](https://github.com/) repository and clone it whith his SSH code:

```bash
cd repos-dir-name
git clone git@github.com:username/project-name
cd project-name
```

2. Create a new [`Next.js`](https://nextjs.org/docs/app/getting-started/installation#create-with-the-cli) app whole directory it's named src
3. cd src and start the dev server.

```bash
pnpm create next-app@latest src --yes
cd src
pnpm dev
```

- --yes skips prompts using saved preferences or defaults. The default setup enables TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack, with import alias @/\* .

4. Visit http://localhost:3000.
   You would see the Next.js tamplate in your browser

5. Sign up and create a [Neon](https://neon.com/docs/guides/prisma) DB follow the inctructions

6. Add `Prisma.v7` to your project:

```bash
pnpm add @prisma/client@7 @prisma/adapter-neon dotenv
pnpm add  prisma@7 --save-dev
```

- Note: if you have an erro in console (Ignored build scripts: esbuild@0.28.2) is no bad is the pnpm protection against malicious packages that execute code upon installation (supply-chain).

7. init `Prisma`:

```bash
 pnpm dlx prisma@7 init --no-skills
```

8. create a .env file in your project and page the connections strings:

```bash
code .env
```

9. copy the pooled and unpooled strings in the button connect in `Neon` (.env) and page it in the `.env` file:

Example to String:

```.env
# Pooled connection for your application
DATABASE_URL="postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require&channel_binding=require"

# Direct (unpooled) connection for Prisma CLI
DIRECT_URL="postgresql://[user]:[password]@[endpoint].[region].aws.neon.tech/[dbname]?sslmode=require&channel_binding=require"
```

- Note: change the button connection pooling for get the unpooling string and chage his name in the `.env` file for `DIRECT_URL`

10. Check to see if the script has created a `prisma/schema.prisma` and create manualy the `db/client.ts`:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

```ts
// db/client.ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });
```

11. chek yo see `prisma7.config.ts` (remove the 7 for the file name):

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DIRECT_URL") },
});
```

12. add postinstall script to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "postinstall": "prisma generate"
}
```

13. create your first migration a get a prisma-client:

```bash
pnpm exec prisma migrate dev --name init
pnpm dlx prisma@7 generate
```

14. Add `Supabase` to your project:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

15. Sign up and create a [Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) proyect and copy the pooled and unpooled strings in the button connect in `Supabse` (.env) and page it in the .env file

Example to String:

```
NEXT_PUBLIC_SUPABASE_URL=<SUBSTITUTE_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUBSTITUTE_SUPABASE_PUBLISHABLE_KEY>
```

16. create `lib/supabase,ts` :

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
```

18. install the `zod` package:

```bash
pnpm add zod
```

18. We'll install and run an application stack whith [`Docker`](https://docs.docker.com/guides/nextjs/), first, configure Next.js — Open or create `next.config.ts in your project root:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

19. Create a file named `Dockerfile` with the following contents (uses node):

- Note: change the `ARG NODE_VERSION` for your own node version, after to version number keep the -slim flag to memory performance.

```docker
  # ============================================
  # Stage 1: Dependencies Installation Stage
  # ============================================

  ARG NODE_VERSION=24.14.0-slim

  FROM node:${NODE_VERSION} AS dependencies

  # Set working directory
  WORKDIR /app

  # Install OpenSSL so Prisma can detect the correct libssl/openssl version
  RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

  # Copy package-related files first to leverage Docker's caching mechanism
  # pnpm-workspace.yaml holds the allowBuilds policy needed for a non-interactive install
  COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./

  # Copy Prisma schema: `prisma generate` runs during postinstall and needs it
  COPY prisma ./prisma

  # Install project dependencies with frozen lockfile for reproducible builds
  RUN --mount=type=cache,target=/root/.npm \
      --mount=type=cache,target=/usr/local/share/.cache/yarn \
      --mount=type=cache,target=/root/.local/share/pnpm/store \
    if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    elif [ -f yarn.lock ]; then \
      corepack enable yarn && yarn install --frozen-lockfile --production=false; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable pnpm && pnpm install --frozen-lockfile; \
    else \
      echo "No lockfile found." && exit 1; \
    fi

  # ============================================
  # Stage 2: Build Next.js application in standalone mode
  # ============================================

  FROM node:${NODE_VERSION} AS builder

  # Set working directory
  WORKDIR /app

  # Copy project dependencies from dependencies stage
  COPY --from=dependencies /app/node_modules ./node_modules

  # Copy application source code
  COPY . .

  ENV NODE_ENV=production

  # Next.js collects completely anonymous telemetry data about general usage.
  # Learn more here: https://nextjs.org/telemetry
  # Uncomment the following line in case you want to disable telemetry during the build.
  # ENV NEXT_TELEMETRY_DISABLED=1

  # Build Next.js application
  # If you want to speed up Docker rebuilds, you can cache the build artifacts
  # by adding: --mount=type=cache,target=/app/.next/cache
  # This caches the .next/cache directory across builds, but it also prevents
  # .next/cache/fetch-cache from being included in the final image, meaning
  # cached fetch responses from the build won't be available at runtime.
  RUN if [ -f package-lock.json ]; then \
      npm run build; \
    elif [ -f yarn.lock ]; then \
      corepack enable yarn && yarn build; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable pnpm && pnpm build; \
    else \
      echo "No lockfile found." && exit 1; \
    fi

  # ============================================
  # Stage 3: Run Next.js application
  # ============================================

  FROM node:${NODE_VERSION} AS runner

  # Set working directory
  WORKDIR /app

  # OpenSSL is required at runtime by the Prisma query engine
  RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

  # Set production environment variables
  ENV NODE_ENV=production
  ENV PORT=3000
  ENV HOSTNAME="0.0.0.0"

  # Next.js collects completely anonymous telemetry data about general usage.
  # Learn more here: https://nextjs.org/telemetry
  # Uncomment the following line in case you want to disable telemetry during the run time.
  # ENV NEXT_TELEMETRY_DISABLED=1

  # Copy production assets
  COPY --from=builder --chown=node:node /app/public ./public

  # Set the correct permission for prerender cache
  RUN mkdir .next
  RUN chown node:node .next

  # Automatically leverage output traces to reduce image size
  # https://nextjs.org/docs/advanced-features/output-file-tracing
  COPY --from=builder --chown=node:node /app/.next/standalone ./
  COPY --from=builder --chown=node:node /app/.next/static ./.next/static

  # If you want to persist the fetch cache generated during the build so that
  # cached responses are available immediately on startup, uncomment this line:
  # COPY --from=builder --chown=node:node /app/.next/cache ./.next/cache

  # Switch to non-root user for security best practices
  USER node

  # Expose port 3000 to allow HTTP traffic
  EXPOSE 3000

  # Start Next.js standalone server
  CMD ["node", "server.js"]
```

20. Create the `compose.yaml` file, and the `.dockerignore` file:

```yaml
services:
  server:
    build:
      context: .
    ports:
      - 3000:3000
```

```.dockerignore
# Dependencies (installed inside the image, never copy from host)
node_modules/
.pnp/
.pnp.js
.pnpm-store/

# Next.js build output (generated during the image build)
.next/
out/
dist/
build/
.vercel/

# Testing (not needed in the production image)
coverage/
.nyc_output/
__tests__/
__mocks__/
jest/
cypress/
playwright-report/
test-results/
.vitest/

# Environment files (avoid leaking secrets into the build context)
.env
.env*
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug and log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
*.log

# IDE and editor files
.vscode/
.idea/
.cursor/
.cursorrules
.copilot/
*.swp
*.swo
*~

# Git
.git/
.gitignore
.gitattributes

# Docker files (reduce build context; not needed inside the image)
Dockerfile*
.dockerignore
docker-compose*.yml
compose*.yaml

# Documentation (not needed in the image)
*.md
docs/

# CI/CD (not needed in the image)
.github/
.gitlab-ci.yml
.travis.yml
.circleci/
Jenkinsfile

# TypeScript and build metadata
*.tsbuildinfo

# Cache and temporary directories
.cache/
.parcel-cache/
.eslintcache
.stylelintcache
.turbo/
.tmp/
.temp/

# Sensitive or dev-only config (optional; omit if your build needs these)
.pem
.editorconfig
.prettierrc*
.eslintrc*
.stylelintrc*
.babelrc*
*.iml

# OS-specific files
.DS_Store
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
Desktop.ini

```

21. Build the Next.js application image. Run the following command from the root of your project:

```bash
docker build --tag project-name .
```

- Uses the Dockerfile in the current directory (.)
- Packages the application and its dependencies into a Docker image
- Tags the image as nextjs-sample so you can reference it later

22. View local images:

```bash
docker images
```

Example Output:

```bash
REPOSITORY       TAG      IMAGE ID       CREATED         SIZE
project-name   latest   8c5fc80f098e   14 seconds ago   130MB
```

23. Run the containerized application:

```bash
docker run -p 3000:3000 project-name
```

press ctrl+c in the terminal to stop your application.

24. Now, try to run the application in the background:

```bash
docker run -d -p 3000:3000 --name nextjs-app project-name
```

To confirm that the container is running, use the docker ps command:

```bash
docker ps
```

Example Output:

```bash
CONTAINER ID      IMAGE           COMMAND            CREATED             STATUS                 PORTS                NAMES
f49b74736a9d   project-name   "node server.js"   About a minute ago   Up About a minute  0.0.0.0:3000->3000/tcp   nextjs-app
```

To stop the application, run:

```bash
docker stop nextjs-app
```

25. Create a development Dockerfile. Create a file named `Dockerfile.dev` in your project root with the following content:

```Dockerfile
# ============================================
# Development Dockerfile for Next.js
# ============================================
ARG NODE_VERSION=24.14.0-slim

FROM node:${NODE_VERSION} AS dev

WORKDIR /app

# Install OpenSSL so Prisma can detect the correct libssl/openssl version
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy package-related files first to leverage Docker's caching mechanism
# pnpm-workspace.yaml holds the allowBuilds policy needed for a non-interactive install
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./

# Copy Prisma schema: `prisma generate` runs during postinstall and needs it
COPY prisma ./prisma

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    if [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
    elif [ -f yarn.lock ]; then \
    corepack enable yarn && yarn install --frozen-lockfile --production=false; \
    elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm install --frozen-lockfile; \
    else \
    echo "No lockfile found." && exit 1; \
    fi

COPY . .

ENV WATCHPACK_POLLING=true
ENV HOSTNAME="0.0.0.0"

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["sh", "-c", "if [ -f package-lock.json ]; then npm run dev; elif [ -f yarn.lock ]; then yarn dev; elif [ -f pnpm-lock.yaml ]; then pnpm dev; else npm run dev; fi"]
```

- Note: Is very matter this part because prisma works:

```Dockerfile
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./
COPY prisma ./prisma
```

26. Update your compose.yaml file:

```yaml
services:
  nextjs-prod-standalone:
    build:
      context: .
      dockerfile: Dockerfile
    image: nextjs-sample:prod
    container_name: nextjs-sample-prod
    ports:
      - "3000:3000"

  nextjs-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    image: nextjs-sample:dev
    container_name: nextjs-sample-dev
    ports:
      - "3000:3000"
    environment:
      - WATCHPACK_POLLING=true
    develop:
      watch:
        - action: sync
          path: .
          target: /app
          ignore:
            - node_modules/
            - .next/
        - action: rebuild
          path: package.json
```

- The `nextjs-prod-standalone` service builds and runs your production Next.js app using the standalone output.
- The `nextjs-dev` service runs your Next.js development server with hot module replacement.
- `watch` triggers file sync with Compose Watch.
- `WATCHPACK_POLLING=true` ensures file changes are detected properly inside Docker.
- The `rebuild` action for `package.json` ensures dependencies are reinstalled when the file changes.

27. Start Compose Watch:

````bash
docker compose watch nextjs-dev
```
Test Compose Watch with Next.js

- Open the app/page.tsx file in your text editor (or src/app/page.tsx if your project uses a src directory).
- Locate the main content area and find a text element to modify.
- Make a visible change, for example, update a heading:

```HTML
<h1>Hello from Docker Compose Watch!</h1>
````

- Save the file.
- Open your browser at http://localhost:3000.
- lastly stop the compose watch

```bash
docker compose down
```

28. Create a [Redis](https://redis.io/docs/latest/develop/setup/) deployment :

```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

and connect to your deployment:

```bash
docker exec -it redis redis-cli
```

Congratulations! You have successfully set up your Redis deployment and connected to it. Press `Crt+C` for get out to CLI.

29. Install `redin` in your project:

```bash
pnpm add redis
```

30. Create a `lib/redis.ts`:

```ts
import { createClient } from "redis";

const client = createClient();
client.on("error", (err) => console.log("Redis Client Error", err));
await client.connect();

await client.set("bike:1", "Process 134");
const value = await client.get("bike:1");
console.log(value);
```

and test whith:

```bash
node lib/redis.ts
```

must be return `Process 134`

# 2. **Next JS**

Next.js is a React framework that enables server-side rendering, static site generation, and full-stack capabilities.

## Folder and file conventions

### Top-level folders

Top-level folders are used to organize your application's code and static assets.

|                                                                    |                                    |
| ------------------------------------------------------------------ | ---------------------------------- |
| [`app`](/docs/app)                                                 | App Router                         |
| [`pages`](/docs/pages/building-your-application/routing)           | Pages Router                       |
| [`public`](/docs/app/api-reference/file-conventions/public-folder) | Static assets to be served         |
| [`src`](/docs/app/api-reference/file-conventions/src-folder)       | Optional application source folder |

### Top-level files

Top-level files are used to configure your application, manage dependencies, run proxy, integrate monitoring tools, and define environment variables.

|                                                                              |                                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Next.js**                                                                  |                                                                                    |
| [`next.config.js`](/docs/app/api-reference/config/next-config-js)            | Configuration file for Next.js                                                     |
| [`package.json`](/docs/app/getting-started/installation#manual-installation) | Project dependencies and scripts                                                   |
| [`instrumentation.ts`](/docs/app/guides/instrumentation)                     | OpenTelemetry and Instrumentation file                                             |
| [`proxy.ts`](/docs/app/api-reference/file-conventions/proxy)                 | Next.js request proxy                                                              |
| [`.env`](/docs/app/guides/environment-variables)                             | Environment variables (should not be tracked by version control)                   |
| [`.env.local`](/docs/app/guides/environment-variables)                       | Local environment variables (should not be tracked by version control)             |
| [`.env.production`](/docs/app/guides/environment-variables)                  | Production environment variables (should not be tracked by version control)        |
| [`.env.development`](/docs/app/guides/environment-variables)                 | Development environment variables (should not be tracked by version control)       |
| [`eslint.config.mjs`](/docs/app/api-reference/config/eslint)                 | Configuration file for ESLint                                                      |
| `.gitignore`                                                                 | Git files and folders to ignore                                                    |
| [`next-env.d.ts`](/docs/app/api-reference/config/typescript#next-envdts)     | TypeScript declaration file for Next.js (should not be tracked by version control) |
| `tsconfig.json`                                                              | Configuration file for TypeScript                                                  |
| `jsconfig.json`                                                              | Configuration file for JavaScript                                                  |

### Routing Files

Add `page` to expose a route, `layout` for shared UI such as header, nav, or footer, `loading` for skeletons, `error` for error boundaries, and `route` for APIs.

|                                                                               |                     |                              |
| ----------------------------------------------------------------------------- | ------------------- | ---------------------------- |
| [`layout`](/docs/app/api-reference/file-conventions/layout)                   | `.js` `.jsx` `.tsx` | Layout                       |
| [`page`](/docs/app/api-reference/file-conventions/page)                       | `.js` `.jsx` `.tsx` | Page                         |
| [`loading`](/docs/app/api-reference/file-conventions/loading)                 | `.js` `.jsx` `.tsx` | Loading UI                   |
| [`not-found`](/docs/app/api-reference/file-conventions/not-found)             | `.js` `.jsx` `.tsx` | Not found UI                 |
| [`error`](/docs/app/api-reference/file-conventions/error)                     | `.js` `.jsx` `.tsx` | Error UI                     |
| [`global-error`](/docs/app/api-reference/file-conventions/error#global-error) | `.js` `.jsx` `.tsx` | Global error UI              |
| [`route`](/docs/app/api-reference/file-conventions/route)                     | `.js` `.ts`         | API endpoint                 |
| [`template`](/docs/app/api-reference/file-conventions/template)               | `.js` `.jsx` `.tsx` | Re-rendered layout           |
| [`default`](/docs/app/api-reference/file-conventions/default)                 | `.js` `.jsx` `.tsx` | Parallel route fallback page |

### Nested routes

Folders define URL segments. Nesting folders nests segments. Layouts at any level wrap their child segments. A route becomes public when a `page` or `route` file exists.

| Path                        | URL pattern     | Notes                         |
| --------------------------- | --------------- | ----------------------------- |
| `app/layout.tsx`            | â€”             | Root layout wraps all routes  |
| `app/blog/layout.tsx`       | â€”             | Wraps `/blog` and descendants |
| `app/page.tsx`              | `/`             | Public route                  |
| `app/blog/page.tsx`         | `/blog`         | Public route                  |
| `app/blog/authors/page.tsx` | `/blog/authors` | Public route                  |

### Dynamic routes

Parameterize segments with square brackets. Use `[segment]` for a single param, `[...segment]` for catchâ€‘all, and `[[...segment]]` for optional catchâ€‘all. Access values via the [`params`](/docs/app/api-reference/file-conventions/page#params-optional) prop.

| Path                            | URL pattern                                                          |
| ------------------------------- | -------------------------------------------------------------------- |
| `app/blog/[slug]/page.tsx`      | `/blog/my-first-post`                                                |
| `app/shop/[...slug]/page.tsx`   | `/shop/clothing`, `/shop/clothing/shirts`                            |
| `app/docs/[[...slug]]/page.tsx` | `/docs`, `/docs/layouts-and-pages`, `/docs/api-reference/use-router` |

### Route groups and private folders

Organize code without changing URLs with route groups [`(group)`](/docs/app/api-reference/file-conventions/route-groups#convention), and colocate non-routable files with private folders [`_folder`](#private-folders).

| Path                            | URL pattern | Notes                                     |
| ------------------------------- | ----------- | ----------------------------------------- |
| `app/(marketing)/page.tsx`      | `/`         | Group omitted from URL                    |
| `app/(shop)/cart/page.tsx`      | `/cart`     | Share layouts within `(shop)`             |
| `app/blog/_components/Post.tsx` | â€”         | Not routable; safe place for UI utilities |
| `app/blog/_lib/data.ts`         | â€”         | Not routable; safe place for utils        |

### Parallel and Intercepted Routes

These features fit specific UI patterns, such as slot-based layouts or modal routing.

Use `@slot` for named slots rendered by a parent layout. Use intercept patterns to render another route inside the current layout without changing the URL, for example, to show a details view as a modal over a list.

| Pattern (docs)                                                                              | Meaning              | Typical use case                         |
| ------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------- |
| [`@folder`](/docs/app/api-reference/file-conventions/parallel-routes#slots)                 | Named slot           | Sidebar + main content                   |
| [`(.)folder`](/docs/app/api-reference/file-conventions/intercepting-routes#convention)      | Intercept same level | Preview sibling route in a modal         |
| [`(..)folder`](/docs/app/api-reference/file-conventions/intercepting-routes#convention)     | Intercept parent     | Open a child of the parent as an overlay |
| [`(..)(..)folder`](/docs/app/api-reference/file-conventions/intercepting-routes#convention) | Intercept two levels | Deeply nested overlay                    |
| [`(...)folder`](/docs/app/api-reference/file-conventions/intercepting-routes#convention)    | Intercept from root  | Show arbitrary route in current view     |

### Metadata file conventions

#### App icons

|                                                                                                                 |                                     |                          |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------ |
| [`favicon`](/docs/app/api-reference/file-conventions/metadata/app-icons#favicon)                                | `.ico`                              | Favicon file             |
| [`icon`](/docs/app/api-reference/file-conventions/metadata/app-icons#icon)                                      | `.ico` `.jpg` `.jpeg` `.png` `.svg` | App Icon file            |
| [`icon`](/docs/app/api-reference/file-conventions/metadata/app-icons#generate-icons-using-code-js-ts-tsx)       | `.js` `.ts` `.tsx`                  | Generated App Icon       |
| [`apple-icon`](/docs/app/api-reference/file-conventions/metadata/app-icons#apple-icon)                          | `.jpg` `.jpeg` `.png`               | Apple App Icon file      |
| [`apple-icon`](/docs/app/api-reference/file-conventions/metadata/app-icons#generate-icons-using-code-js-ts-tsx) | `.js` `.ts` `.tsx`                  | Generated Apple App Icon |

## Redis

```
               ┌────────────────────────────────────────────────────────┐
               │                  CLIENT (Web Browser)                  │
               └─────────┬────────────────────────────────────▲─────────┘
                HTTP / Server Actions                     Socket.io
               (JSON / Zod Validation)                Real-time Events
                         ▼                                    ▼
       ┌────────────────────────────────────────────────────────────────┐
       │               NEXT.JS SERVER-SIDE FRAMEWORK                    │
       │  (BetterAuth Session Middleware  •  Socket.io WebSocket Node)  │
       └─────────┬────────────────────────────────────────────┬─────────┘
            Cache Lookups /                                Pub/Sub
        Fast KV Reads & Writes                        Real-time Scaling
                 ▼                                            ▼
    ┌─────────────────────────────────┐            ┌───────────────────┐
    │          REDIS LAYER            │ ◄────────► │    REDIS LAYER    │
    │    (In-Memory Cache & Store)    │            │  (Pub/Sub Broker) │
    └─────────────────────────────────┘            └───────────────────┘
                         ▲
                   Cache Miss /
                   Write-through
                         ▼
       ┌─────────────────────────────────┐
       │          PRISMA ORM             │
       └─────────────────┬───────────────┘
                    SQL Queries
                         ▼
       ┌─────────────────────────────────┐
       │     NEON DATABASE (Postgres)    │
       │    (Persistent App State)       │
       └─────────────────────────────────┘

```

## Docker

```
               ┌────────────────────────────────────────────────────────┐
               │                  CLIENTE (Navegador)                   │
               └──────────────────────────┬─────────────────────────────┘
                                   http://localhost:3000
                                          ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              ENTORNO DOCKER (PC LOCAL)                                 │
 │  ┌─────────────────────────────────────┐      ┌─────────────────────────────────────┐  │
 │  │        CONTENEDOR NEXT.JS           │      │          CONTENEDOR REDIS           │  │
 │  │                                     │      │                                     │  │
 │  │  • App Servidor (Next.js)           │◄────►│  • Cache en memoria                 │  │
 │  │  • Servidor WebSocket (Socket.io)   │      │  • Pub/Sub Broker                   │  │
 │  │  • Validaciones (Zod)               │      │  • Puerto interno: 6379             │  │
 │  │  • ORM (Prisma Client)              │      └─────────────────────────────────────┘  │
 │  │  • Puerto expuesto: 3000            │                                               │
 │  └──────────────────┬──────────────────┘                                               │
 └─────────────────────┼──────────────────────────────────────────────────────────────────┘
                 Prisma Queries
             (A través de Internet)
                       ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                NUBE (Servicios Externos)                               │
 │  ┌─────────────────────────────────────┐                                               │
 │  │       NEON POSTGRES (Serverless)    │                                               │
 │  │  • Base de datos persistente        │                                               │
 │  │  • Almacena Usuarios, Posts, Likes  │                                               │
 │  └─────────────────────────────────────┘                                               │
 └────────────────────────────────────────────────────────────────────────────────────────┘

```

# Docker

el kernel es un software, específicamente es el programa informático más fundamental y privilegiado de un sistema operativo.
