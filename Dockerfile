# Nexora CheckSheet — Docker for Render/Railway/Fly with persistent SQLite
FROM node:20-slim AS base
WORKDIR /app

# Needed for better-sqlite3 native build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# Ensure data dir exists (Render will mount /data over this)
RUN mkdir -p /data && mkdir -p db

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/checksheet.db

EXPOSE 3000

CMD ["node", "server.js"]
