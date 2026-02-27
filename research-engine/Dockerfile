FROM node:20-alpine AS builder

# Basic system libraries
RUN apk add --no-cache ca-certificates

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies, including dev (we need TS to build)
RUN npm ci --include=dev

# Copy application code
COPY . .

# Generate Prisma client and build TS
RUN npx prisma generate
RUN npm run build

# --- Runtime Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache ca-certificates

ENV NODE_ENV=production

WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy package config and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built prisma schema and dist directory from the builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY ecosystem.config.js ./

# Expose the API port
EXPOSE 3010

# Start via PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
