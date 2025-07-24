# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files from the monorepo root
COPY ../../package.json ../../package-lock.json ./
COPY package.json ./apps/api/
COPY ../../packages/types/package.json ./packages/types/

# Install dependencies
RUN npm ci --workspace=api --include-workspace-root

# Copy source code
COPY ../../packages/types ./packages/types
COPY . ./apps/api

# Build the types package first
WORKDIR /app/packages/types
RUN npm run build

# Build the API
WORKDIR /app/apps/api
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

# Install production dependencies only
RUN npm ci --workspace=api --include-workspace-root --production

# Copy built application and Prisma files
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

# Set user
USER nodejs

# Expose port
EXPOSE 3000

# Set working directory to API
WORKDIR /app/apps/api

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]