#!/bin/bash

# Simple deployment script for Clowd DAV

set -e

echo "Building production application..."
npm run build:production

echo "Building Docker image..."
docker build -t clowd-dav .

echo "Deploying with Docker Compose..."
docker-compose up -d

echo "Deployment completed!"
echo "Application is available at: http://localhost"

echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"