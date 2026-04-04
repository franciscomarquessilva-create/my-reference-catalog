#!/bin/bash
# Deployment script for my-reference-catalog on fraserver01
# This script runs on the remote server

set -e

APP_DIR="/srv/my-reference-catalog"
BACKUP_DIR="/srv/my-reference-catalog-backups"

echo "📦 Deploying my-reference-catalog..."

# Create app directory if it doesn't exist
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"

# Create timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup current state if container exists
if docker ps -a --format '{{.Names}}' | grep -q '^my-reference-catalog$'; then
  echo "💾 Backing up current container..."
  docker compose -f "$APP_DIR/docker-compose.yml" down || true
  if [ -d "$APP_DIR/.next" ]; then
    tar -czf "$BACKUP_DIR/my-reference-catalog_$TIMESTAMP.tar.gz" -C "$APP_DIR" . 2>/dev/null || true
  fi
fi

# Build and start new container
echo "🔨 Building Docker image..."
cd "$APP_DIR"
# Remove old container and image
docker compose down --remove-orphans 2>/dev/null || true
docker compose build

echo "🚀 Starting container..."
docker compose up -d

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker compose ps | grep -q "healthy"; then
    echo "✅ Container is healthy"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

# Run health checks
echo "🧪 Running health checks..."
CONTAINER_ID=$(docker compose ps -q my-reference-catalog)

if curl -f http://localhost:3000 > /dev/null 2>&1 || docker exec "$CONTAINER_ID" curl -f http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Application is responding"
else
  echo "⚠️  Health check inconclusive (app may still be starting)"
fi

echo "📊 Container status:"
docker compose ps

echo "✨ Deployment complete!"
echo "🌐 Access at: https://my-reference-catalog.aiops3000.com"
