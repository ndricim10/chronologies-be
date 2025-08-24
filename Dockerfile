# Use official Node.js LTS image
FROM node:20

# Set working directory inside the container
WORKDIR /app

# Install specific pnpm version globally
RUN npm install -g pnpm@8.15.1

# Copy package files first (for caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of your source code
COPY . .

# Build TypeScript
RUN pnpm tsc

# Expose the port your app runs on
EXPOSE 3000

# Start the backend
CMD ["node", "dist/index.js"]
