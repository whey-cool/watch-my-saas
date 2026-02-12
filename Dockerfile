FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

# Build API
FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src/
RUN npx tsc

# Build dashboard (if present)
COPY dashboard ./dashboard/
RUN if [ -f dashboard/package.json ]; then \
      cd dashboard && npm ci && npm run build; \
    fi

# Production image
FROM base AS production
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules/
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=build /app/dist ./dist/
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/package.json ./

# Copy dashboard build if it exists
COPY --from=build /app/dashboard/dist ./dashboard/dist/

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
