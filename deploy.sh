#!/bin/bash

# Deployment script for CalDAV/CardDAV Client

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
BUILD_ONLY=false
SKIP_TESTS=false
DOCKER_TAG="latest"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production) [default: production]"
    echo "  -t, --tag TAG           Docker tag [default: latest]"
    echo "  -b, --build-only        Only build, don't deploy"
    echo "  -s, --skip-tests        Skip running tests"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging -t v1.0.0"
    echo "  $0 --build-only --skip-tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            DOCKER_TAG="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Must be one of: development, staging, production"
    exit 1
fi

print_status "Starting deployment for environment: $ENVIRONMENT"

# Check if required files exist
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

if [[ ! -f "Dockerfile" ]]; then
    print_error "Dockerfile not found. Are you in the correct directory?"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run tests (unless skipped)
if [[ "$SKIP_TESTS" == false ]]; then
    print_status "Running tests..."
    npm run test:coverage
else
    print_warning "Skipping tests as requested"
fi

# Build the application
print_status "Building application for $ENVIRONMENT..."
case $ENVIRONMENT in
    development)
        npm run build
        ;;
    staging)
        npm run build:staging
        ;;
    production)
        npm run build:production
        ;;
esac

# Build Docker image
print_status "Building Docker image..."
docker build \
    --build-arg REACT_APP_ENVIRONMENT=$ENVIRONMENT \
    -t clowd-dav:$DOCKER_TAG \
    -t clowd-dav:$ENVIRONMENT-$DOCKER_TAG \
    .

print_status "Docker image built successfully"

# If build-only mode, exit here
if [[ "$BUILD_ONLY" == true ]]; then
    print_status "Build completed. Skipping deployment as requested."
    exit 0
fi

# Deploy using Docker Compose
print_status "Deploying with Docker Compose..."
case $ENVIRONMENT in
    development)
        docker-compose --profile dev up -d caldav-client-dev
        print_status "Development environment deployed on http://localhost:3000"
        ;;
    staging)
        docker-compose --profile staging up -d caldav-client-staging
        print_status "Staging environment deployed on http://localhost:8080"
        ;;
    production)
        docker-compose --profile prod up -d caldav-client-prod
        print_status "Production environment deployed on http://localhost"
        ;;
esac

# Health check
print_status "Performing health check..."
sleep 5

case $ENVIRONMENT in
    development)
        PORT=3000
        ;;
    staging)
        PORT=8080
        ;;
    production)
        PORT=80
        ;;
esac

if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    print_status "Health check passed ✓"
else
    print_warning "Health check failed. The application might still be starting up."
fi

print_status "Deployment completed successfully!"
print_status "Application is available at: http://localhost:$PORT"

# Show logs
echo ""
echo "To view logs, run:"
echo "  docker-compose --profile ${ENVIRONMENT} logs -f caldav-client-${ENVIRONMENT}"
echo ""
echo "To stop the application, run:"
echo "  docker-compose --profile ${ENVIRONMENT} down"