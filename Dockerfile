# Use Node 18 Alpine for smaller image
FROM node:18-alpine

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for all workspaces first
# This allows Docker to cache the dependency layer
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/merchant-app/package.json ./apps/merchant-app/
COPY apps/booking-app/package.json ./apps/booking-app/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Build workspace packages first
RUN npm run build --workspace=@heya-pos/types
RUN npm run build --workspace=@heya-pos/utils

# Generate Prisma client and build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 3000

# Run migrations and start the API
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]