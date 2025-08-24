# Stage 1: build
FROM node:20-bullseye AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy package.json and pnpm-lock.yaml first
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including dev)
RUN pnpm install --frozen-lockfile --prod=false

# Copy rest of the files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN pnpm run build

# Stage 2: production image
FROM node:20-bullseye-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables if needed
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "dist/index.js"]
