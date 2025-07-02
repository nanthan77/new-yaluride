# YALURIDE Backend Services

This is the backend microservices architecture for the YALURIDE ride-sharing platform built with NestJS.

## Architecture

### Microservices
- **API Gateway** (Port 3000) - Main entry point and request routing
- **User Service** (Port 3001) - User management and authentication
- **Ride Service** (Port 3002) - Ride booking and management
- **Payment Service** (Port 3003) - Payment processing and wallet management
- **Communication Service** (Port 3004) - Messaging and notifications
- **Matching Service** (Port 3005) - Driver-passenger matching algorithms
- **Bidding Service** (Port 3006) - Driver bidding system
- **Gamification Service** (Port 3007) - Points, badges, and rewards
- **Promotions Service** (Port 3008) - Promotions and discounts
- **Admin Service** (Port 3009) - Administrative functions
- **Alert Service** (Port 3010) - Safety alerts and emergency response
- **Route Template Service** (Port 3011) - Route templates and planning
- **Tour Package Service** (Port 3012) - Tour packages and bookings
- **Voice Service** (Port 3013) - Voice commands and audio processing

### Shared Libraries
- **@yaluride/common** - Shared utilities, decorators, enums, and types
- **@yaluride/database** - Database entities and configuration
- **@yaluride/auth** - Authentication guards and utilities

## Development Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0
- RabbitMQ
- Redis

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start infrastructure services:
```bash
docker-compose up -d mysql rabbitmq redis
```

3. Copy environment files:
```bash
cp apps/user-service/.env.example apps/user-service/.env
cp apps/api-gateway/.env.example apps/api-gateway/.env
# Repeat for other services as needed
```

4. Update environment variables in `.env` files with your configuration.

### Running Services

Build all services:
```bash
npm run build
```

Start individual services:
```bash
# API Gateway
nest start api-gateway

# User Service
nest start user-service

# All services in development mode
npm run start:dev
```

### Testing

Run tests:
```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Deployment

### Docker Build
Each service has its own Dockerfile for containerized deployment.

### Kubernetes
Deployment configurations are available in the `/infrastructure` directory.

### Staging Deployment
The staging deployment is automatically triggered when changes are pushed to the `develop` branch. The deployment includes:

- Database migrations via Supabase
- Edge Functions deployment  
- Docker image builds for all 14 microservices
- Kubernetes deployment to staging cluster

Deployment status can be monitored via GitHub Actions workflows.

### Environment Variables
See individual service `.env.example` files for required configuration.

## API Documentation

Each service exposes Swagger documentation at `/api/docs` endpoint when running.

## Communication

Services communicate via:
- **HTTP/REST** - Client-facing APIs through API Gateway
- **RabbitMQ** - Asynchronous event-driven communication between services
- **TCP** - Direct service-to-service communication for synchronous operations

## Database

- **MySQL** - Primary database with TypeORM
- **Redis** - Caching and session storage
- **Row Level Security** - Implemented for multi-tenant data isolation

## Monitoring

- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **EFK Stack** - Centralized logging

## Security

- **JWT Authentication** - Stateless authentication
- **Role-based Access Control** - Fine-grained permissions
- **Rate Limiting** - API protection
- **Input Validation** - Request sanitization
- **CORS** - Cross-origin request handling
