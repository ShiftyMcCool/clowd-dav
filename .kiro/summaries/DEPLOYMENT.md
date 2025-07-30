# Deployment Guide

This guide covers deploying Clowd DAV in different environments with production optimizations.

## Features

### Production Optimizations
- **Code Splitting**: Lazy loading of components for better performance
- **Service Worker**: Offline functionality and caching
- **Environment Configuration**: Different settings for dev/staging/production
- **Docker Support**: Containerized deployment with nginx
- **Bundle Analysis**: Performance monitoring and optimization tools

## Quick Start

### Using Docker (Recommended)

1. **Build and deploy production:**
   ```bash
   ./deploy.sh -e production
   ```

2. **Build and deploy staging:**
   ```bash
   ./deploy.sh -e staging -t v1.0.0
   ```

3. **Build only (no deployment):**
   ```bash
   ./deploy.sh --build-only --skip-tests
   ```

### Manual Deployment

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Run tests:**
   ```bash
   npm run test:coverage
   ```

3. **Build for production:**
   ```bash
   npm run build:production
   ```

4. **Serve with nginx or any static file server**

## Environment Configuration

### Environment Variables

| Variable | Development | Staging | Production | Description |
|----------|-------------|---------|------------|-------------|
| `REACT_APP_ENVIRONMENT` | development | staging | production | Environment name |
| `REACT_APP_DEBUG` | true | true | false | Enable debug logging |
| `REACT_APP_LOG_LEVEL` | debug | info | error | Logging level |
| `REACT_APP_SW_ENABLED` | true | true | true | Enable service worker |
| `REACT_APP_CACHE_DURATION` | 3600000 | 7200000 | 86400000 | Cache duration (ms) |
| `GENERATE_SOURCEMAP` | true | true | false | Generate source maps |

### Environment Files

- `.env` - Default/development settings
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings

## Docker Deployment

### Single Environment

```bash
# Development
docker-compose --profile dev up -d

# Staging
docker-compose --profile staging up -d

# Production
docker-compose --profile prod up -d
```

### Custom Configuration

```bash
# Build with custom environment variables
docker build \
  --build-arg REACT_APP_ENVIRONMENT=production \
  --build-arg REACT_APP_DEBUG=false \
  -t clowd-dav:custom .

# Run with custom port
docker run -p 8080:80 -e REACT_APP_ENVIRONMENT=production clowd-dav:custom
```

## Performance Optimization

### Code Splitting

The application uses React.lazy() for code splitting:
- Setup form loads only when needed
- Calendar components load separately from contacts
- Event and contact forms are lazy-loaded

### Service Worker Features

- **Offline Support**: App works without internet connection
- **Caching Strategy**: Network-first for API calls, cache-first for static assets
- **Background Sync**: Queues operations when offline
- **Update Management**: Automatic updates with user notification

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# View performance metrics (development only)
# Check browser console for component load times and memory usage
```

## Nginx Configuration

The included `nginx.conf` provides:
- **Gzip Compression**: Reduces transfer size
- **Security Headers**: XSS protection, content type sniffing prevention
- **Caching**: Optimized cache headers for static assets
- **SPA Support**: Client-side routing support
- **Health Check**: `/health` endpoint for monitoring

## Monitoring and Logging

### Application Logs

- **Development**: All logs to console
- **Staging**: Info level and above
- **Production**: Error level only

### Performance Monitoring

- Component load time tracking
- Memory usage monitoring
- Long task detection (>50ms)
- Bundle size analysis

### Health Checks

- HTTP endpoint: `GET /health`
- Docker health check included
- Returns 200 OK when healthy

## Security Considerations

### Headers

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` with restricted sources

### HTTPS

For production deployment, configure HTTPS:

1. **Using reverse proxy (recommended):**
   ```bash
   # Use nginx-proxy or traefik
   docker-compose --profile proxy up -d
   ```

2. **Direct HTTPS:**
   - Mount SSL certificates in nginx container
   - Update nginx.conf with SSL configuration

## Troubleshooting

### Common Issues

1. **Service Worker not updating:**
   ```bash
   # Clear browser cache and hard refresh
   # Or disable service worker in development
   ```

2. **Environment variables not applied:**
   ```bash
   # Check .env files are in correct location
   # Verify REACT_APP_ prefix for custom variables
   ```

3. **Docker build fails:**
   ```bash
   # Check Node.js version compatibility
   # Ensure all files have correct permissions
   ```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set environment variable
export REACT_APP_DEBUG=true
export REACT_APP_LOG_LEVEL=debug

# Or create .env.local file
echo "REACT_APP_DEBUG=true" > .env.local
echo "REACT_APP_LOG_LEVEL=debug" >> .env.local
```

## Deployment Checklist

- [ ] Tests pass (`npm run test:coverage`)
- [ ] Build succeeds for target environment
- [ ] Environment variables configured
- [ ] Docker image builds successfully
- [ ] Health check endpoint responds
- [ ] Service worker registers (if enabled)
- [ ] HTTPS configured (production)
- [ ] Monitoring/logging configured
- [ ] Backup/rollback plan ready

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Development server |
| `npm run build` | Production build |
| `npm run build:staging` | Staging build |
| `npm run build:production` | Production build with optimizations |
| `npm run test:coverage` | Run tests with coverage |
| `npm run analyze` | Bundle size analysis |
| `./deploy.sh` | Automated deployment script |

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f [service-name]`
2. Verify configuration: Review environment variables
3. Test health endpoint: `curl http://localhost/health`
4. Check browser console for client-side errors