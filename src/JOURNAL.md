# My Social Media App Design Journal

> This is my personal guide for building an app (the hardest I've writing so far), and I'm written it for posterity. I'll try to be specific and structure this guide as a tutorial for each tool I implement. I'd also like to make a few comments about the theory, functionality, and bugs that I'll find along the way. With nothing more to add let's get started.

## What does the project involve?

This is a Social Media App, so i going to split this project in a two matters parts. The Backend: `Next.js` inside `Docker` on `Render`. `Prisma` pointing to `Neon`. `Redis` as the connecting tissue. `Socket.IO` for real-time communication. `Better` Auth for identity, `Zod` for trust, and `Supabase` for images. Follow the journey of a piece of data. The otherwise is the Frontend with a `NextJs` too, but used `React` as UI runtime, and `TailwindCSS` for inline styles. So come on step for step

# 1. **<i>Scaffolding</i>**

We go to install all that we need to begin our project and create the directory structure. Once we've done that, we'll explain each of the tools we use.

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

- Note: if you have an error in console (Ignored build scripts: esbuild@0.28.2) is no bad is the pnpm protection against malicious packages that execute code upon installation (supply-chain).

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
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model message {
  id            Int    @id @default(autoincrement())
  client_offset String @unique
  content       String
}

```

```ts
// db/client.ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });
```

11. check the `prisma.config.ts` file:

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

16. create `lib/supabase.ts` (note: in the repo the file is currently named `lib/supabse.ts`; rename it so the import path matches the name):

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
```

17. install the `zod` package:

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

  # Copy the Prisma client generated by `postinstall` in the dependencies stage.
  # `generated/prisma` is gitignored, so it is NOT part of the build context and
  # would be missing on a clean checkout (e.g. Render), breaking `next build`.
  COPY --from=dependencies /app/generated ./generated

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

```.dockerignore
# Dependencies (installed inside the image, never copy from host)
node_modules/
.pnp/
.pnp.js
.pnpm-store/

# Next.js build output (generated during the image build)
.next/
out/

# Prisma client (generated inside the image by `postinstall`; a stale local copy
# must never overwrite the one generated from the current schema)
generated/
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

```bash
docker compose watch nextjs-dev
```
Test Compose Watch with Next.js

- Open the app/page.tsx file in your text editor (or src/app/page.tsx if your project uses a src directory).
- Locate the main content area and find a text element to modify.
- Make a visible change, for example, update a heading:

```HTML
<h1>Hello from Docker Compose Watch!</h1>
```

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

must be return `Process 134`,

31. add [BetterAuth](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs) to ypur ptoject:

```bash
pnpm add better-auth @better-auth/prisma-adapter
```

and set this enviroment variables:

```.env
BETTER_AUTH_SECRET=new-secret-base64,1:old-secret-base64
BETTER_AUTH_URL=http://localhost:3000 # Base URL of your app
```

- use to generate the secret the next comand:

```bash
openssl rand -base64 32
```

- Note: A secret value used for encryption and hashing. It must be at least 32 characters and generated with high entropy.

32. Create a better Auth instance.
    create a file named auth.ts in this lib/auth.js folder:

```ts
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/db/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});
```

33. create a Better Auth schema whit the CLI tool :

```bash
pnpm dlx auth@latest generate
pnpm prisma migrate dev --name add-auth-models
pnpm prisma generate
```

34. In the src/app/api directory, create an auth/[...all] folder structure and a route.ts file inside it:

```bash
mkdir -p "app/api/auth/[...all]"
touch "app/api/auth/[...all]/route.ts"
```

Add the following code to the newly created route.ts file:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

In the src/lib directory, create an auth-client.ts file:

```ts
import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient();
```

35. Next, build the user interface for authentication. In the src/app directory, create the following folder structure:

- app/sign-up/page.tsx
- app/sign-in/page.tsx
- app/dashboard/page.tsx

```bash
mkdir -p app/{sign-up,sign-in,dashboard}
touch app/{sign-up,sign-in,dashboard}/page.tsx
```

36. Creating your Google OAuth Credentials:

1. Open Google Cloud Console → APIs & Services → Credentials
1. Click Create Credentials → OAuth client ID
1. Choose Web application
1. Add your redirect URIs:
   - http://localhost:3000/api/auth/callback/google (for local development)
   - https://your-domain.com/api/auth/callback/google (for production)

1. Copy the Client ID and Client Secret into your environment variables

1. Configure the provider (lib/auth.js):

```ts
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/db/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  //sigIn whit email and password
  emailAndPassword: {
    enabled: true,
  },
  // sigIn whit Google:
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
```

# 2. **<i>Zod: trust nothing that comes from outside</i>**

> TypeScript is a lie at runtime. It helps me while I write code, but once the browser sends a JSON body, TypeScript is gone. Zod is the bouncer at the door: it checks the real values at runtime and gives me a typed result only if the data is valid.

## Why do we need it?

- A `<form>` can be edited with DevTools.
- `fetch()` can send anything.
- A Socket.IO client can emit any event with any payload.
- A URL query param is always a string, even when I expect a number.
- A database row can contain `null`.

Zod lets me describe the shape once, validate it everywhere, and derive the TypeScript type from the schema. The schema becomes the single source of truth.

## The basic vocabulary

```ts
import { z } from "zod";

const name = z.string(); // must be a string
const age = z.number().int().min(0); // integer >= 0
const role = z.enum(["user", "admin"]); // one of these exact strings
const tags = z.array(z.string()); // an array of strings
const profile = z.object({
  name,
  age,
  role,
  tags,
});
```

There are two ways to validate:

```ts
// parse: throws a ZodError if the data is invalid
const data = profile.parse(input);

// safeParse: never throws; returns a discriminated union
const result = profile.safeParse(input);

if (result.success) {
  console.log(result.data); // typed
} else {
  console.log(result.error.issues); // array of problems
}
```

At the edges of the app (HTTP handlers, forms, sockets) I use `safeParse`, because invalid input is expected and I want to return a 400, not crash the process.

## Step 37 — Create the shared schemas

Create `lib/validations.ts`. This file is pure TypeScript + Zod, so it can be imported by the browser, the server, and the Socket.IO process.

```ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "The title needs at least 3 characters")
    .max(80, "The title can have at most 80 characters"),
  content: z
    .string()
    .trim()
    .min(1, "Write something in the post")
    .max(280, "The post can have at most 280 characters"),
  visibility: z.enum(["public", "private"], {
    error: "Choose public or private",
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const chatMessageSchema = z
  .string()
  .trim()
  .min(1, "The message cannot be empty")
  .max(500, "The message can have at most 500 characters");
```

Line by line:

- `z.object({ ... })` — the input must be an object with these keys.
- `z.string()` — must be a string, not a number, not `null`.
- `.trim()` — removes spaces at both ends. It is a transform: the output is the trimmed string.
- `.min(3, "...")` — after trimming, at least 3 characters. The second argument is the message shown when it fails.
- `.max(80, "...")` — upper bound. Always put a max on user text; it protects the database and the UI.
- `z.enum([...])` — only these exact strings are accepted. Anything else is an error. In Zod 4 the customization option is `error`, not `message` (though `message` still works).
- `z.infer<typeof schema>` — extracts the TypeScript type from the schema. I do not write the type twice.
- `chatMessageSchema` — a schema for a single string; I will reuse it in the Socket.IO server.

Note: in Zod 4 the email validator is `z.email()` (top-level). `z.string().email()` still works but is deprecated.

Note: `.trim().min(3)` validates the trimmed value. If I wrote `.min(3).trim()`, it would check the raw value first. Order matters.

Note: `z.object` ignores unknown keys by default (it strips them). If I want to reject extra keys, I use `.strict()`. For an API, strict is often a good idea; for a form, stripping is convenient.

## Step 38 — Validate on the server

Create `app/api/zod-test/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: { form: ["The body must be valid JSON"] } },
      { status: 400 },
    );
  }

  const result = createPostSchema.safeParse(body);

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  return NextResponse.json({
    message: "The server accepted the post",
    post: result.data,
  });
}
```

Line by line:

- `export async function POST` — a Route Handler for `POST /api/zod-test`. The file path defines the URL.
- `await request.json()` — parses the body. It throws if the body is not valid JSON, so I wrap it in `try/catch`.
- `body: unknown` — this is important. I do not type it as `CreatePostInput`; that would be a lie. It is unknown until Zod proves otherwise.
- `safeParse` — validates without throwing.
- `z.flattenError(result.error)` — turns the issues into `{ formErrors: string[], fieldErrors: { title: string[], ... } }`. This shape is easy to send to the UI.
- `result.data` — after the `if`, TypeScript knows the data is valid and typed. No cast needed.
- `status: 400` — the request was understood but the data is invalid. 422 is also acceptable; 400 is the common choice.
- In a real app, this is where I would call Prisma. I keep the test endpoint pure so I can focus on validation.

Why validate again if the browser already validated? Because the browser is not trustworthy. Anyone can call the endpoint with `curl`. The client check is for UX; the server check is for security.

## Step 39 — A small form in the frontend

Create `app/zod-test/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { z } from "zod";
import { createPostSchema } from "@/lib/validations";

type FieldErrors = {
  title?: string[];
  content?: string[];
  visibility?: string[];
  form?: string[];
};

export default function ZodTestPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSuccess(null);

    const localCheck = createPostSchema.safeParse({
      title,
      content,
      visibility,
    });

    if (!localCheck.success) {
      setErrors(z.flattenError(localCheck.error).fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/zod-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localCheck.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? { form: ["The server rejected the post"] });
        return;
      }

      setSuccess(`The server accepted "${data.post.title}"`);
      setTitle("");
      setContent("");
      setVisibility("public");
    } catch {
      setErrors({ form: ["Could not reach the server"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-white">
      <h1 className="text-2xl font-bold">Zod test</h1>
      <p className="text-sm text-neutral-400">
        The same schema runs in the browser and on the server.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title[0]}</p>
          )}
        </div>

        <div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What are you thinking?"
            rows={4}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>{errors.content?.[0]}</span>
            <span>{content.length}/280</span>
          </div>
        </div>

        <div>
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as "public" | "private")
            }
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          {errors.visibility && (
            <p className="mt-1 text-sm text-red-500">{errors.visibility[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Validating..." : "Create post"}
        </button>
      </form>

      {errors.form && <p className="text-sm text-red-500">{errors.form[0]}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </main>
  );
}
```

Line by line:

- `"use client"` — the page uses hooks and browser events.
- The form is controlled: each input's `value` comes from React state, and `onChange` updates it. This makes validation and character counting easy.
- `localCheck` — the browser runs the exact same schema. If it fails, I show errors immediately and never call the API.
- `z.flattenError(...).fieldErrors` — maps each error to its field. The keys match the schema keys.
- `localCheck.data` — send the parsed/transformed data (trimmed), not the raw state. This is a subtle but useful habit.
- `fetch` — the standard way to call a Route Handler. `method: "POST"`, `Content-Type: application/json`, `body: JSON.stringify(...)`.
- `response.ok` — true for 2xx. A 400 does not throw in `fetch`; I must check it myself. This is a common beginner trap.
- `finally` — always turn off the loading state, even if the request fails.
- The textarea counter uses `content.length` (raw), so it can go over 280; the schema is what actually rejects it. If I wanted to prevent typing beyond 280, I would add `maxLength={280}`. I keep it visible so the error can be demonstrated.

## Step 40 — Try it

```bash
pnpm dev
```

Open http://localhost:3000/zod-test and try:

1. Empty title → "The title needs at least 3 characters".
2. Title with only spaces → the same error, because `.trim()` runs first.
3. 281 characters → the max error.
4. A valid post → success message.
5. Open a terminal and send the same request with `curl`:

```bash
curl -X POST http://localhost:3000/api/zod-test \
  -H "Content-Type: application/json" \
  -d '{"title":"x","content":"","visibility":"friends"}'
```

You get a 400 with three errors. The browser form would never send that, but `curl` can. That is the whole point.

## Step 41 — Rules of thumb

- Validate at every boundary: HTTP body, query params, form data, Socket.IO payloads, webhook payloads, environment variables.
- Use `safeParse` at boundaries; use `parse` only when invalid data is a programmer error (for example, parsing a constant config file at startup).
- Share the schema between client and server, but never skip the server check.
- Put a `.max()` on every user-controlled string.
- Use `z.infer` instead of writing the type by hand.
- For query params, remember they are strings: `z.coerce.number()` converts `"42"` to `42`.
- Zod 4 has `z.email()`, `z.url()`, `z.uuid()`, etc. Use the top-level validators.
- `z.object` strips unknown keys; `.strict()` rejects them.
- `z.input<typeof schema>` is the type before transforms/defaults; `z.infer` (same as `z.output`) is the type after. This matters when I use `.default()` or `.transform()`.

# 3. **<i>Redis: the fast notebook next to the database</i>**

> Postgres is the source of truth. Redis is the sticky note on the monitor: fast, temporary, and perfect for things that do not need to survive forever.

## What Redis is (and is not)

Redis is an in-memory key-value store. It keeps data in RAM, so reads and writes are extremely fast. It is not a replacement for Postgres:

- Postgres is the source of truth: users, posts, messages.
- Redis is for derived or temporary data: counters, sessions, rate limits, cached queries, presence, pub/sub.

A key is a string. A value can be a string, a list, a set, a hash, a sorted set, etc. In this tutorial I only use strings and counters.

Redis can persist to disk (RDB snapshots / AOF), but I still treat it as disposable. If Redis restarts and I lose the cache, the app should still work by falling back to Postgres.

## Step 42 — Start Redis

I already did this in step 28. The command was:

```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

For a safer local setup, bind it to localhost only and give it a volume:

```bash
docker run -d \
  --name redis \
  -p 127.0.0.1:6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

- `-p 127.0.0.1:6379:6379` — only my machine can reach it. `-p 6379:6379` exposes it to the local network.
- `-v redis-data:/data` — a named volume, so the data survives `docker rm`.
- `redis-server --appendonly yes` — append-only file persistence. Good for a cache that I do not want to lose on restart; not a backup strategy.
- `redis:7-alpine` — a small, stable image. Pin a major version instead of `latest` so a surprise upgrade does not break me.

If a container named `redis` already exists from step 28, remove it first (`docker rm -f redis`) or use another name. Otherwise Docker complains about the name conflict.

Check it:

```bash
docker exec -it redis redis-cli ping
# PONG
```

## Step 43 — Turn the one-shot script into an app client

In step 30, `lib/redis.ts` was a script: it connected at import time, wrote `bike:1`, printed it, and exited. That is perfect for a smoke test and wrong for an app:

- Importing the module would connect immediately, even during `next build`.
- Every hot reload in development would create another connection.
- There is no retry or error handling for the app.

Replace it with a lazy singleton:

```ts
import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as unknown as {
  redis?: RedisClientType;
  redisConnect?: Promise<unknown> | null;
};

function createRedisClient(): RedisClientType {
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  });

  client.on("error", (error) => {
    console.error("[redis] client error:", error);
  });

  return client;
}

export const redis: RedisClientType =
  globalForRedis.redis ?? createRedisClient();

globalForRedis.redis = redis;

export async function connectRedis(): Promise<RedisClientType> {
  if (redis.isOpen) {
    return redis;
  }

  if (!globalForRedis.redisConnect) {
    globalForRedis.redisConnect = redis
      .connect()
      .then(() => undefined)
      .catch((error) => {
        globalForRedis.redisConnect = null;
        throw error;
      });
  }

  await globalForRedis.redisConnect;
  return redis;
}
```

Line by line:

- `createClient` — creates a client object. It does not connect yet. That is the key difference from the old script.
- `url` — the connection string. `REDIS_URL` is server-only; never prefix it with `NEXT_PUBLIC_`.
- `client.on("error", ...)` — node-redis emits errors on the client. If nobody listens, Node may crash the process with an unhandled `error` event. Always attach a listener.
- `globalThis` — in development, Next.js re-evaluates modules on every edit. Without a global cache, each edit creates a new client and the old ones stay open. `globalThis` survives module reloads. This is the same trick Prisma uses.
- `globalForRedis.redis ?? createRedisClient()` — reuse the client if it exists; otherwise create one.
- `redis.isOpen` — true while the client is connected, connecting, or reconnecting. If it is open, commands are queued until the connection is ready, so I can return it.
- `redis.connect()` — opens the TCP connection. It throws if called twice on an already-open client, which is why the promise is cached.
- `globalForRedis.redisConnect` — stores the in-flight connection promise. Two simultaneous requests share one connection attempt instead of racing.
- `.catch(...)` — if the connection fails, reset the promise so the next request can retry.
- `await` — the caller waits until the connection is ready, then gets the client.

Important: I do not call `await connectRedis()` at module top level. I call it inside the route handler, at request time. That keeps `next build` from trying to reach Redis.

## Step 44 — Environment variables

Add to `.env`:

```.env
REDIS_URL=redis://localhost:6379
```

And to `.env.example`, with a placeholder:

```.env
REDIS_URL=redis://localhost:6379
```

For production (Render, Upstash, Redis Cloud), the URL will look like `rediss://default:password@host:port` — note the extra `s` in `rediss`, which means TLS. Never commit the real URL.

## Step 45 — A Route Handler that talks to Redis

Create `app/api/redis-test/route.ts`:

```ts
import { connection, NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";

export async function GET() {
  await connection();

  try {
    const redis = await connectRedis();

    const visits = await redis.incr("demo:visits");

    await redis.set("demo:greeting", "Hello from Redis", {
      expiration: { type: "EX", value: 60 },
    });

    const greeting = await redis.get("demo:greeting");
    const ttl = await redis.ttl("demo:greeting");

    return NextResponse.json({ visits, greeting, ttl });
  } catch (error) {
    console.error("[redis-test] error:", error);
    return NextResponse.json(
      { error: "Could not reach Redis. Is the container running?" },
      { status: 500 },
    );
  }
}
```

Line by line:

- `await connection()` — tells Next.js "do not prerender past this point; wait for a real request". This project has `cacheComponents: true` in `next.config.ts`. With Cache Components, `export const dynamic = "force-dynamic"` is no longer allowed and throws an error. `connection()` is the supported replacement. Without it, the build could try to execute the handler and connect to Redis before the server is even running.
- `connectRedis()` — gets the singleton and makes sure it is connected. The first request pays the connection cost; the rest reuse it.
- `INCR demo:visits` — atomically increments the integer stored at that key and returns the new value. If the key does not exist, Redis treats it as 0 and returns 1. Atomic means two simultaneous requests get 2 and 3, never both 2.
- `SET demo:greeting "Hello from Redis"` with `expiration: { type: "EX", value: 60 }` — stores the value and deletes it after 60 seconds. `EX` means seconds; `PX` would be milliseconds. In node-redis v6 this is the current API; the old `{ EX: 60 }` still works but is deprecated.
- `GET` — returns the string or `null` if the key does not exist.
- `TTL` — returns the remaining time to live in seconds, `-1` if the key exists without an expiration, and `-2` if the key does not exist.
- `NextResponse.json(...)` — serializes the object and sets `Content-Type: application/json`.
- The `catch` returns a 500 with a helpful message. In production, do not leak internal error details to the client; log them and return a generic message.

Key naming: `demo:visits`, not `visits`. The colon is a convention, not a feature; it groups keys by namespace (`user:123:profile`, `rate:ip:1.2.3.4`). Use it consistently.

## Step 46 — The frontend test

Create `app/redis-test/page.tsx`:

```tsx
"use client";

import { useState } from "react";

type RedisTestResult = {
  visits: number;
  greeting: string | null;
  ttl: number;
};

export default function RedisTestPage() {
  const [result, setResult] = useState<RedisTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/redis-test", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }

      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-white">
      <h1 className="text-2xl font-bold">Redis test</h1>
      <p className="text-sm text-neutral-400">
        Each click runs INCR on <code>demo:visits</code>, writes{" "}
        <code>demo:greeting</code> with a 60-second TTL, and reads both back.
      </p>

      <button
        onClick={handleTest}
        disabled={loading}
        className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? "Talking to Redis..." : "Run the test"}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <dl className="space-y-2 rounded-md border border-neutral-700 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Visits</dt>
            <dd>{result.visits}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Greeting</dt>
            <dd>{result.greeting}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">TTL</dt>
            <dd>{result.ttl} seconds</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
```

Line by line:

- `"use client"` — the page has state and a click handler.
- `useState` — three pieces of state: the result, a loading flag, and an error message.
- `fetch("/api/redis-test", { cache: "no-store" })` — a relative URL is fine because the browser calls the same Next.js origin. `no-store` asks the browser not to cache the response; the counter must change on every click.
- `response.ok` — again, `fetch` does not throw on 4xx/5xx. Check it.
- `throw new Error(...)` — inside `try`, so the `catch` handles both network errors and my own error.
- `finally` — turns off the spinner no matter what.
- The `<dl>` — a description list is the semantic way to show label/value pairs. Tailwind handles the layout.

## Step 47 — Try it and inspect Redis

```bash
pnpm dev
```

Open http://localhost:3000/redis-test and click the button a few times. `visits` should increase by 1 each time, and `ttl` should go down from 60.

Now open the Redis CLI in another terminal:

```bash
docker exec -it redis redis-cli
```

Useful commands:

```text
KEYS demo:*
GET demo:visits
GET demo:greeting
TTL demo:greeting
DEL demo:visits
```

- `KEYS demo:*` is fine for learning, but never use `KEYS` in production: it scans the whole keyspace and blocks the server. Use `SCAN` instead.
- `DEL` removes a key. After deleting `demo:visits`, the next click returns 1 again.
- Wait 60 seconds and run `GET demo:greeting`: it returns `(nil)` because the TTL expired.

If I want to watch commands live, I run `MONITOR` in the CLI and click the button. It prints every command the server receives. Press `Ctrl+C` to stop. Do not leave `MONITOR` on in production; it is expensive.

## Step 48 — Where Redis fits in this app

- **Cache**: store the result of an expensive Prisma query for 30-60 seconds. Check Redis first; on a miss, query Postgres and write the result back. This is the "cache-aside" pattern.
- **Rate limiting**: `INCR rate:ip:1.2.3.4` and `EXPIRE` to allow N requests per window. Atomic increments make this safe across multiple app instances.
- **Sessions / presence**: who is online, typing indicators, temporary state.
- **Pub/Sub**: the bridge between multiple Socket.IO servers (next section).
- **Queues**: Redis lists/streams can back a job queue (BullMQ, etc.).

The rule: if losing the data is acceptable (or it can be rebuilt from Postgres), it can live in Redis. If losing it is not acceptable, it belongs in Postgres.

## Step 49 — Production notes

- Never expose Redis to the internet. In Docker, bind it to `127.0.0.1`; in production, use a private network or a managed service.
- Use `rediss://` (TLS) and a strong password. Most managed providers require it.
- Set a memory limit and an eviction policy. For a cache, `allkeys-lru` is a common choice; for a queue/session store, `noeviction` is safer because silent eviction loses data.
- Use separate Redis logical databases or key prefixes for different concerns (`cache:`, `rate:`, `socket:`).
- Monitor `used_memory`, `evicted_keys`, `connected_clients`, and latency.
- Redis is single-threaded for command execution. One slow command (like `KEYS *`) blocks everyone. Keep commands O(1) or O(log N), and use `SCAN` for iteration.
- Backups: if Redis holds data I care about, enable persistence and test restores. If it is only a cache, I can skip backups.

# 4. **<i>Socket.IO: a phone line that stays open</i>**

> HTTP is a conversation that ends with every request. Socket.IO is a phone call: both sides keep the line open and can talk whenever they want.

## What Socket.IO is

Socket.IO is a library for real-time, bidirectional communication. Under the hood it uses WebSockets when possible and falls back to HTTP long-polling when a proxy or network blocks WebSockets. On top of the transport it gives me:

- named events (`"chat message"`, `"typing"`, `"notification"`);
- rooms (`socket.join("room:42")`) to broadcast to a subset of clients;
- acknowledgements (a callback that lets the sender know the server processed the event);
- automatic reconnection with exponential backoff;
- connection state recovery (optional);
- adapters for scaling across processes/machines.

It is not the same as raw WebSockets. A raw `WebSocket` gives me a byte stream; Socket.IO gives me an event system with reconnection and fallbacks. For this app, that is exactly what I want.

## Why a separate server?

In this project, Socket.IO runs in its own Node process (`lib/socket.ts`), not inside a Next.js Route Handler. Reasons:

- A Route Handler is a function that receives a `Request` and returns a `Response`. It is not designed to keep a connection open for hours.
- Next.js may run multiple instances or serverless functions; a WebSocket connection is tied to one process.
- I need a long-lived HTTP server object to attach Socket.IO to. Next.js does not expose it to Route Handlers.
- A separate process can be deployed, scaled, and restarted independently. It can also use Redis to talk to other instances.

So the architecture is:

- Next.js on port 3000: pages, API routes, auth.
- Socket.IO on port 3001: the real-time line.
- Redis on port 6379: shared memory between them (cache + pub/sub).

In development I run them in two terminals. In production, they are two services (or one service with two processes) behind the same domain, with a reverse proxy routing `/socket.io` to the Socket.IO server. I keep the basic test on two ports to make the separation obvious.

## Step 50 — Install the client

The server package is already installed (`socket.io`), but the browser needs the client package:

```bash
pnpm add socket.io-client
```

The server package includes a browser bundle served at `/socket.io/socket.io.js`, which is what `lib/index.html` uses. In a Next.js app, I import the npm package instead, so the bundler can tree-shake and version it with the rest of the app.

## Step 51 — Environment variables

Add to `.env`:

```.env
SOCKET_PORT=3001
CLIENT_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

- `SOCKET_PORT` — where the Socket.IO server listens locally. I do not use `PORT` because Next.js also reads `PORT`; a shared `.env` would make both processes fight for the same port. In production, the platform sets `PORT`, so the server falls back to it.
- `CLIENT_ORIGIN` — the exact origin the browser uses. CORS compares scheme + host + port. `http://localhost:3000` and `http://127.0.0.1:3000` are different origins.
- `NEXT_PUBLIC_SOCKET_URL` — the URL the browser connects to. The `NEXT_PUBLIC_` prefix means Next.js inlines it into the client bundle at build time. It is public by definition; never put a secret in it.

Add the same keys to `.env.example` with placeholders.

## Step 52 — The minimal server

Create `lib/socket-basic.ts`:

```ts
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { chatMessageSchema } from "./validations";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const PORT = Number(process.env.SOCKET_PORT ?? process.env.PORT ?? 3001);

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

type ChatMessage = {
  id: string;
  text: string;
  socketId: string;
  sentAt: string;
};

type Ack = (response: { ok: boolean; error?: string }) => void;

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.emit("welcome", {
    id: socket.id,
    message: "Connected to the Socket.IO server",
  });

  socket.on("app:ping", (callback?: (reply: string) => void) => {
    callback?.("pong");
  });

  socket.on("chat message", (rawMessage: unknown, callback?: Ack) => {
    const result = chatMessageSchema.safeParse(rawMessage);

    if (!result.success) {
      callback?.({
        ok: false,
        error: result.error.issues[0]?.message ?? "Invalid message",
      });
      return;
    }

    const message: ChatMessage = {
      id: randomUUID(),
      text: result.data,
      socketId: socket.id,
      sentAt: new Date().toISOString(),
    };

    io.emit("chat message", message);
    callback?.({ ok: true });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on http://localhost:${PORT}`);
});
```

Line by line:

- `createServer()` from `node:http` — a bare HTTP server. It has no routes; Socket.IO will attach to it and handle the `/socket.io/` path and the WebSocket upgrade.
- `new Server(httpServer, { cors: ... })` — creates the Socket.IO server on top of the HTTP server.
- `cors.origin` — allows the browser at `http://localhost:3000` to connect. Without this, the browser blocks the handshake with a CORS error. The server itself does not enforce CORS; the browser does. But the server must send the right headers, which Socket.IO does when I configure `cors`.
- `io.on("connection", (socket) => ...)` — runs once per connected client. `socket` represents that one client.
- `socket.emit("welcome", ...)` — sends an event only to this client. The client listens with `socket.on("welcome", ...)`.
- `socket.on("app:ping", ...)` — a custom event from the client. I use `app:ping` instead of `ping` so it is clear this is my event and not the built-in heartbeat. The last argument is the acknowledgement callback; `callback?.("pong")` calls it only if the client asked for one. The optional chaining `?.` prevents the "callback is not a function" crash.
- `socket.on("chat message", ...)` — the payload is typed as `unknown` on purpose: it comes from the network. `chatMessageSchema.safeParse` validates it before I use it.
- `result.data` — the trimmed, validated string.
- `io.emit("chat message", message)` — broadcasts to every connected client, including the sender. `socket.emit` would send only to the sender; `socket.broadcast.emit` would send to everyone except the sender.
- `callback?.({ ok: true })` — acknowledges success. The client's callback receives this object.
- `socket.on("disconnect", ...)` — runs when the client disconnects, with a reason (`"transport close"`, `"client namespace disconnect"`, etc.). Useful for logs and presence.
- `httpServer.listen(PORT, ...)` — starts listening. Socket.IO does not call `listen` for me because it does not own the HTTP server.

Add a script to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "socket:basic": "tsx --env-file=.env lib/socket-basic.ts",
  "postinstall": "prisma generate",
  "lint": "eslint"
}
```

`tsx` runs TypeScript directly and `--env-file=.env` loads the environment variables. The existing `socket` script runs the advanced example; I keep both so I can compare them.

## Step 53 — Run it

In one terminal:

```bash
pnpm socket:basic
```

Expected output:

```text
[socket] listening on http://localhost:3001
```

In another terminal:

```bash
pnpm dev
```

If port 3001 is busy, change `SOCKET_PORT` in `.env` and `NEXT_PUBLIC_SOCKET_URL` to match. They must always agree.

## Step 54 — The frontend test

Create `app/socket-test/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ChatMessage = {
  id: string;
  text: string;
  socketId: string;
  sentAt: string;
};

type AckResponse = {
  ok: boolean;
  error?: string;
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export default function SocketTestPage() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pong, setPong] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (connectionError) => {
      setConnected(false);
      setError(`Connection error: ${connectionError.message}`);
    });

    socket.on("welcome", (payload: { id: string; message: string }) => {
      console.log("[socket] welcome:", payload);
    });

    socket.on("chat message", (message: ChatMessage) => {
      setMessages((previous) => [...previous, message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();
    const socket = socketRef.current;

    if (!text || !socket) {
      return;
    }

    socket.emit("chat message", text, (response: AckResponse) => {
      if (!response.ok) {
        setError(response.error ?? "The server rejected the message");
      }
    });

    setInput("");
  }

  function sendPing() {
    socketRef.current?.emit("app:ping", (reply: string) => {
      setPong(reply);
    });
  }

  function toggleConnection() {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    if (socket.connected) {
      socket.disconnect();
    } else {
      socket.connect();
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-md flex-col gap-4 p-6 text-white">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Socket.IO test</h1>
        <span
          className={`flex items-center gap-2 text-sm ${
            connected ? "text-green-400" : "text-red-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          {connected ? "connected" : "disconnected"}
        </span>
      </header>

      <p className="text-sm text-neutral-400">
        Open this page in two tabs. Messages are broadcast to every connected
        client.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="flex-1 space-y-2 overflow-y-auto rounded-md border border-neutral-700 p-3 text-sm">
        {messages.length === 0 && (
          <li className="text-neutral-500">No messages yet.</li>
        )}
        {messages.map((message) => (
          <li key={message.id} className="rounded-md bg-neutral-900 p-2">
            <p>{message.text}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {message.socketId.slice(0, 6)} ·{" "}
              {new Date(message.sentAt).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <button
          type="submit"
          disabled={!connected}
          className="rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <div className="flex gap-2">
        <button
          onClick={sendPing}
          disabled={!connected}
          className="flex-1 rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
        >
          Ping {pong ? `→ ${pong}` : ""}
        </button>
        <button
          onClick={toggleConnection}
          className="flex-1 rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </div>
    </main>
  );
}
```

Line by line:

- `useRef<Socket | null>(null)` — stores the socket instance. A ref does not trigger a re-render when it changes, which is exactly what I want for a connection object. If I stored it in state, every render would risk creating a new connection.
- `useEffect(..., [])` — runs once after the component mounts. The empty dependency array means "do this on mount, undo it on unmount".
- `io(SOCKET_URL)` — opens the connection. By default it tries HTTP long-polling first and upgrades to WebSocket. I can force WebSockets with `{ transports: ["websocket"] }`, but the default is more resilient.
- `socket.on("connect", ...)` — fires on the initial connection and on every successful reconnection. Set `connected` to true here, not right after `io()`; `io()` returns immediately, before the handshake finishes.
- `socket.on("disconnect", ...)` — fires when the connection is lost or closed. Set `connected` to false.
- `socket.on("connect_error", ...)` — fires when the handshake fails (server down, CORS, wrong URL). This is where I show the error to the user.
- `socket.on("welcome", ...)` — a server-to-client event. I log it to show that the private event arrived.
- `socket.on("chat message", ...)` — another server-to-client event. I append to the list with a functional update (`previous => [...previous, message]`), so I never read stale state.
- The cleanup function — `socket.disconnect()` closes the connection and removes the listeners. React runs it when the component unmounts. In development, Strict Mode mounts, unmounts, and remounts the component, so I will see two connections in the server log. That is expected; the cleanup closes the first one.
- `sendMessage` — prevents the form from reloading the page, trims the input, and emits. The last argument is the ack callback; the server calls it with `{ ok: true }` or `{ ok: false, error }`.
- `setInput("")` — clears the input immediately. The message appears when the server broadcasts it back, not optimistically. That makes it easy to see the round trip.
- `sendPing` — demonstrates a request/response over the socket. The server replies `"pong"` through the ack.
- `toggleConnection` — `socket.disconnect()` is a manual close; Socket.IO will not auto-reconnect. `socket.connect()` opens it again. This is useful for testing the connection states.
- `disabled={!connected}` — prevents sending while disconnected. The server would not receive it anyway, and Socket.IO would buffer it; disabling makes the state obvious.
- `key={message.id}` — React needs a stable key for list items. The server generates a UUID for each message.

## Step 55 — Try it with two tabs

1. Keep `pnpm socket:basic` running.
2. Keep `pnpm dev` running.
3. Open http://localhost:3000/socket-test in two browser tabs.
4. Both tabs should show "connected".
5. Send a message from tab A. It appears in both tabs.
6. Click "Ping" in tab B. It shows "Ping → pong".
7. Click "Disconnect" in tab A. The status turns red. Send from tab B; only tab B receives it.
8. Click "Connect" in tab A. It reconnects; the server log shows a new connection.
9. Stop the Socket.IO server. Both tabs show a connection error and try to reconnect. Start it again; they reconnect automatically.

The server log should look like:

```text
[socket] connected: 8f3...
[socket] disconnected: 8f3... (client namespace disconnect)
[socket] connected: 8f3...
```

The same `socket.id` may change after a reconnect; that is normal. A new connection is a new session.

## Step 56 — The event cheat sheet

| What I want                        | Server                                                     | Client                                        |
| ---------------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| Send to one client                 | `socket.emit("event", data)`                               | `socket.on("event", handler)`                 |
| Send to everyone                   | `io.emit("event", data)`                                   | `socket.on("event", handler)`                 |
| Send to everyone except the sender | `socket.broadcast.emit("event", data)`                     | `socket.on("event", handler)`                 |
| Send to a room                     | `io.to("room:42").emit("event", data)`                     | `socket.on("event", handler)`                 |
| Join a room                        | `socket.join("room:42")`                                   | —                                             |
| Leave a room                       | `socket.leave("room:42")`                                  | —                                             |
| Request/response                   | `socket.on("event", (data, callback) => callback(result))` | `socket.emit("event", data, (result) => ...)` |
| Disconnect                         | `socket.disconnect()`                                      | `socket.disconnect()`                         |

Rooms are the feature I will use for a social app: each post can have a room (`post:123`), and only clients viewing that post join it. A new comment is broadcast to `post:123` instead of every connected user.

## Step 57 — Reading your original example

`lib/socket.ts` is the official Socket.IO chat tutorial with persistence and clustering. It is a great advanced example, but it hides a lot of concepts. Let me walk through it.

### The cluster part

```ts
if (cluster.isPrimary) {
  const numCPUs = availableParallelism();

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }
  setupPrimary();
} else {
  // ...the server
}
```

- Node's `cluster` module lets one program use multiple CPU cores. The primary process does not handle connections; it forks workers.
- `availableParallelism()` returns how many cores are available. On a laptop with 8 cores, this starts 8 workers.
- `cluster.fork({ PORT: 3000 + i })` starts a copy of the same file with a different `PORT` environment variable. Each worker takes the `else` branch and listens on its own port (3000, 3001, ...).
- `setupPrimary()` installs the IPC relay in the primary so the cluster adapter can pass messages between workers.
- `createAdapter()` in each worker creates the adapter that knows how to publish to the other workers.
- This only helps if clients are distributed across the workers. In production I need a load balancer (nginx, HAProxy, a cloud load balancer) in front, sending connections to all the ports. Without it, every client hits the first worker and the other workers sit idle.
- On a platform like Render, I usually get one public port per service. Binding 8 ports does not give me 8 public endpoints. For a beginner deployment, run one worker. Use the Redis adapter when I need multiple instances.

So for local learning, the cluster part is noise. That is why the basic server is a single process.

### The server part

```ts
const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  adapter: createAdapter(),
});
```

- `express()` creates an Express app. It is a request handler with routes.
- `createServer(app)` wraps it in a Node HTTP server. Express alone is not a server; it is a function that handles requests.
- `new Server(server, ...)` attaches Socket.IO to that HTTP server. Socket.IO listens for requests to `/socket.io/` and for the WebSocket upgrade on the same port. That is why the HTML can load `/socket.io/socket.io.js` from the same origin.
- `connectionStateRecovery: {}` — enables the recovery feature. If a client disconnects briefly (default: 2 minutes) and reconnects, the server can restore its rooms and send the packets it missed. `socket.recovered` is `true` when that happened.
- `adapter: createAdapter()` — uses the cluster adapter so `io.emit` reaches clients connected to other workers.

```ts
const _direname = path.dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(_direname, "index.html"));
});
```

- `import.meta.url` is the file URL of the current module (`file:///.../lib/socket.ts`).
- `fileURLToPath` converts it to a normal path. `path.dirname` gives the folder. `join(folder, "index.html")` builds the absolute path.
- `_direname` is a typo for `__dirname`, but it works because it is just a variable name. In modern Node, `import.meta.dirname` does the same thing with less code.
- `app.get("/")` serves the chat HTML. This is only for the demo; in the real app, Next.js serves the UI and the socket server only speaks Socket.IO.

```ts
io.on("connection", async (socket) => {
  socket.on("chat message", async (msg, clientOffset, callback) => {
    let result;
    try {
      result = await prisma.message.create({
        data: {
          client_offset: clientOffset,
          content: msg,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        callback();
      }
      return;
    }

    io.emit("chat message", msg, result?.id);
    callback();
  });
  // ...
});
```

- `io.on("connection", ...)` runs for each client. The handler is `async` because it uses Prisma.
- `socket.on("chat message", ...)` listens for the custom event. The arguments are exactly what the client sent: `msg`, `clientOffset`, and the ack callback.
- `prisma.message.create(...)` inserts a row. `client_offset` is unique in the schema, so the same message cannot be inserted twice.
- Why an offset? The client generates `clientOffset` once per message (`${socket.id}-${counter++}`). If the network drops before the ack arrives, Socket.IO retries the same packet with the same offset. The second insert fails with `P2002` (unique constraint), and the server acknowledges it instead of creating a duplicate. This is idempotency: the same request can be retried safely.
- `e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"` — Prisma's typed error for a known database error. `P2002` means unique constraint violation.
- `callback()` — tells the client "I processed your message". If the client did not pass a callback, this throws `TypeError: callback is not a function`. The `index.html` client does not pass one, so this is a real bug. Fix it on the client (pass an ack) or guard it on the server (`callback?.()`).
- `io.emit("chat message", msg, result?.id)` — broadcasts the message and the database id to everyone. The id is the "server offset": the client stores it to know what it has seen.
- `return` in the catch — for errors other than P2002, the function returns without acking. The client will retry until `ackTimeout`/`retries` give up. In a real app, log the error and ack with a failure so the client can show it.

```ts
if (!socket.recovered) {
  try {
    const rows = await prisma.message.findMany({
      where: {
        id: { gt: Number(socket.handshake.auth.serverOffset) || 0 },
      },
      select: { id: true, content: true },
      orderBy: { id: "asc" },
    });

    for (const row of rows) {
      socket.emit("chat message", row.content, row.id);
    }
  } catch (error) {}
}
```

- `socket.recovered` — true if the connection state was restored. In that case, Socket.IO already delivered the missed packets, so replaying from the database would duplicate them.
- `socket.handshake.auth.serverOffset` — the `auth` object sent by the client in `io({ auth: { serverOffset: 0 } })`. It is available on the server at connection time.
- `Number(...) || 0` — if the value is missing or not a number, use 0.
- `id: { gt: offset }` — fetch rows with an id strictly greater than the last one the client saw. `gt` is "greater than"; `gte` would include the last one again.
- `orderBy: { id: "asc" }` — oldest first, so the UI appends them in the right order.
- `socket.emit(...)` — send each missed message only to this client. `io.emit` would send them to everyone and duplicate the history.
- The empty `catch` swallows the error. At minimum, log it; otherwise a database outage looks like "no messages" instead of a failure.

### The HTML client

```html
<script src="/socket.io/socket.io.js"></script>
```

- Socket.IO serves its browser bundle at this path automatically (`serveClient` defaults to `true`). No CDN, no build step. In Next.js I import `socket.io-client` instead.

```js
const socket = io({
  auth: { serverOffset: 0 },
  ackTimeout: 10000,
  retries: 3,
});
```

- `io()` with no URL connects to the same origin that served the page. Since the page is served by the Express server on port 3000, the socket connects to port 3000. That is why the standalone demo needs its own port and conflicts with Next.js.
- `auth` — data sent with the handshake. The server reads it as `socket.handshake.auth`.
- `ackTimeout: 10000` — when an emit has an ack callback, wait up to 10 seconds for the ack.
- `retries: 3` — resend the packet up to 3 times if no ack arrives. The same `clientOffset` is reused, which is what makes the server's unique constraint work.

```js
const clientOffset = `${socket.id}-${counter++}`;
socket.emit("chat message", input.value, clientOffset);
```

- `clientOffset` is generated once, before the emit. If it were generated inside a retry, each retry would look like a new message and the idempotency would break.
- There is no ack callback here. The server calls `callback()` unconditionally, so it throws. Add one:

```js
socket.emit("chat message", input.value, clientOffset, (response) => {
  if (!response?.ok) {
    console.error("The server did not accept the message");
  }
});
```

And on the server, guard it:

```ts
callback?.({ ok: true });
```

```js
socket.on("chat message", (msg, serverOffset) => {
  const item = document.createElement("li");
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
  socket.auth.serverOffset = serverOffset;
});
```

- `messages` is an implicit global created by the `id="messages"` element. It works, but it is fragile. Prefer `const messages = document.getElementById("messages")`.
- `socket.auth.serverOffset = serverOffset` — updates the offset for the next reconnect. Without this, a reconnect would ask for the full history again.
- The `const message = document.getElementById("message")` line is unused and the element does not exist (`#message` vs `#messages`). Delete it.
- The "Disconnect" button is inside the form and has no `type="button"`. The click handler calls `e.preventDefault()`, so it does not submit, but adding `type="button"` is clearer.

### Running the advanced example

- `pnpm socket` runs `tsx --env-file=.env lib/socket.ts`.
- It forks one worker per CPU and listens on 3000, 3001, ... . Next.js also wants 3000, so stop `pnpm dev` or change the ports.
- Open http://localhost:3000 in the browser. I should see the chat.
- Without a load balancer, only the worker on port 3000 receives browser traffic. The other workers are idle. The cluster adapter only matters once traffic is spread across them.
- For local testing, add a flag to run a single process:

```ts
const useCluster = process.env.SOCKET_CLUSTER === "true";

if (useCluster && cluster.isPrimary) {
  // fork...
} else {
  // server...
  const port = Number(process.env.SOCKET_PORT ?? process.env.PORT ?? 3001);

  server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
  });
}
```

Then `pnpm socket` with `SOCKET_CLUSTER` unset runs one process on `SOCKET_PORT` (or `PORT`). Set `SOCKET_PORT=3001` in `.env` to avoid the Next.js port. This is the same pattern as the basic server, with the database and recovery added.

### What I would keep from the advanced example

- The unique `client_offset` and the idempotent insert.
- The server offset (`id`) and the "fetch messages newer than X" query.
- The `connectionStateRecovery` option.
- The ack callback, once fixed.
- The cluster/Redis adapter, but only when I actually run multiple instances.

### What I would simplify for now

- Remove the cluster for local development.
- Serve the UI from Next.js, not from Express. The socket server only needs `createServer()` and `Server`.
- Use `socket.io-client` in a React component, not a hand-written HTML file.
- Add CORS, because the UI and the socket server are on different ports.
- Validate the payload with Zod before writing to Prisma.

## Step 58 — Scaling with Redis (optional, but this is why Redis is in the diagram)

`io.emit` only reaches clients connected to the same Node process. If I run two Socket.IO servers (two Docker replicas, two Render instances), a message sent to server A will not reach a client connected to server B. The Redis adapter fixes that:

```bash
pnpm add @socket.io/redis-adapter
```

```ts
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

pubClient.on("error", (error) => console.error("[redis:pub]", error));
subClient.on("error", (error) => console.error("[redis:sub]", error));

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

Line by line:

- `pubClient` — publishes messages to Redis.
- `subClient = pubClient.duplicate()` — creates a second client with the same options. It does not copy the connection or the event listeners; I must connect it and attach its own `error` listener. Without a listener, a connection error on the subscriber can crash the process with an unhandled `error` event.
- Why two clients? A Redis client in subscriber mode cannot run normal commands. Socket.IO needs one connection to publish and one to subscribe.
- `Promise.all([...])` — connect both in parallel.
- `io.adapter(...)` — replaces the default in-memory adapter with the Redis adapter. From now on, `io.emit` publishes to a Redis channel; every Socket.IO server subscribed to that channel receives the message and forwards it to its own clients.
- The adapter uses its own keys/channels (prefixed `socket.io` by default), so it does not collide with `demo:visits`.
- This is at-most-once delivery: Redis Pub/Sub does not store messages. If a server is down, it misses the message. For guaranteed delivery, use a queue/stream (BullMQ, Redis Streams) and persist the message in Postgres first.
- With the Redis adapter, I do not need the cluster adapter. Use the cluster adapter for multiple processes on one machine, and the Redis adapter for multiple machines/containers. If I use both, I am solving the same problem twice.

In this project, I would add the Redis adapter when I deploy more than one socket instance. For the basic test, the in-memory adapter is enough.

## Step 59 — Troubleshooting

| Symptom                                          | Likely cause                                                                        | Fix                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `connect_error: xhr poll error`                  | Socket.IO server is not running, or the URL/port is wrong                           | Start `pnpm socket:basic`; check `NEXT_PUBLIC_SOCKET_URL`       |
| CORS error in the browser console                | `CLIENT_ORIGIN` does not match the page origin exactly                              | Use the same scheme/host/port; `localhost` ≠ `127.0.0.1`        |
| `404` on `/socket.io/`                           | The client is pointing at Next.js (port 3000) instead of the socket server (3001)   | Fix `NEXT_PUBLIC_SOCKET_URL`                                    |
| Works in one tab, not the other                  | The message handler appends to stale state                                          | Use the functional update `setMessages(prev => [...prev, msg])` |
| Two connections in the server log in development | React Strict Mode mounts, unmounts, and remounts effects                            | Expected; the cleanup closes the first connection               |
| `callback is not a function`                     | The client emitted without an ack callback, but the server calls it                 | Use `callback?.()` or always pass a callback                    |
| `ECONNREFUSED 127.0.0.1:6379`                    | Redis is not running                                                                | `docker start redis` or `docker run ...`                        |
| `NEXT_PUBLIC_SOCKET_URL` is `undefined`          | The env var was added after the build, or the prefix is wrong                       | Restart `pnpm dev`; rebuild; use the `NEXT_PUBLIC_` prefix      |
| Messages arrive twice                            | The client is in two rooms, or the server broadcasts and also acks with the message | Broadcast once; use the ack only for status                     |
| Redis data disappears                            | No volume, or the container was removed                                             | Add `-v redis-data:/data`; do not use `docker rm` casually      |

## Step 60 — The mental model

- **HTTP** is for "do this and give me a result": load a page, create a post, sign in.
- **Socket.IO** is for "tell me when this changes": new message, typing indicator, notification, presence.
- **Zod** is for "prove that this data has the shape I expect": at every boundary.
- **Redis** is for "keep this hot data fast and shared": cache, counters, rate limits, pub/sub.
- **Postgres** is for "this must not be lost": users, posts, messages.

A message in the final app will travel like this:

1. The browser validates the draft with Zod (instant feedback).
2. The browser sends it over Socket.IO.
3. The socket server validates it again with Zod (trust nothing).
4. The socket server writes it to Postgres through Prisma (source of truth).
5. The socket server broadcasts it to the room.
6. If there are multiple socket servers, Redis Pub/Sub carries the broadcast to the others.
7. Redis may also cache the latest messages or a rate-limit counter.
8. The browser receives the event and updates the UI.

That is the whole diagram at the end of this journal, now with code behind each box.

## How all the pieces fit together

A note before the diagram: in this project, Socket.IO is a separate Node process, not a Route Handler inside Next.js. The diagram below is conceptual; think of the "Socket.io WebSocket Node" box as its own service on port 3001. The two Redis boxes can be the same Redis instance; they are separated in the drawing to show the two roles (cache/store and pub/sub).

```text
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
