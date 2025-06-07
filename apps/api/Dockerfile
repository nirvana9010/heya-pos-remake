FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]