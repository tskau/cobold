FROM gplane/pnpm:node20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm fetch


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm install --offline
RUN pnpm build


# Production image, copy all the files and run bot
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app .

CMD ["node", "."]