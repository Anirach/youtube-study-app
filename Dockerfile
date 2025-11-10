# Multi-stage build for YouTube Study App

# Stage 1: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build Next.js app
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine

# Install Python for LightRAG, youtube-transcript-api and other tools
RUN apk add --no-cache python3 py3-pip curl bash gcc musl-dev python3-dev

# Copy Python requirements and install
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages -r /tmp/requirements.txt

WORKDIR /app

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/next.config.js ./frontend/
COPY --from=frontend-builder /app/frontend/tsconfig.json ./frontend/

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 777 /app/data

# Expose ports
EXPOSE 3000 8000

# Start script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
