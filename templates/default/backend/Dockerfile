# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
# Install all deps (including devDeps needed for build + prisma generate)
RUN npm ci

# Generate Prisma client for the target platform
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Stage 2: Runtime (lean image, no devDeps, non-root user)
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only what's needed to run
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs
EXPOSE 4000

# Runs migrations then starts the server.
# For production, prefer running migrations as a separate deploy step.
CMD ["node", "dist/index.js"]
