# One image: the web app (Express + Prisma) with the React app built into dist/.
#   Cloud Run service: runs the default command below (migrations, then node server.js)

# ---- stage 1: build the browser app (React) into /app/dist
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY vite.config.mjs tsconfig.json ./
COPY web ./web
RUN npm run build

# ---- stage 2: the image that runs
FROM node:22-bookworm-slim

# openssl: the Prisma engines need it
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Server libraries only: React, Vite and Tailwind are build tools, already bundled into dist/.
# The Prisma CLI stays (it is a dependency) because the container runs the migrations at start-up.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
# Generates the database client. No database is needed for this.
RUN npx prisma generate

COPY server ./server
COPY scripts ./scripts
COPY server.js ./
COPY --from=web /app/dist ./dist

ENV NODE_ENV=production
# Cloud Run sets PORT; server.js falls back to 8080.
# Database migrations run first so a new deploy updates the tables by itself; a failed migration
# stops the start-up (Cloud Run keeps serving the previous revision).
CMD ["sh", "-c", "node scripts/migrate.js && node server.js"]
