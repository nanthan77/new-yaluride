# YALURIDE Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the YALURIDE backend services to Google Kubernetes Engine (GKE).

## Architecture

The deployment follows a hybrid GCP + Supabase architecture:
- **Supabase**: Database, authentication, storage
- **GCP GKE**: Custom NestJS microservices

## Services Deployed

1. **api-gateway** (Port 3001) - Central request router with JWT authentication
2. **user-service** (Port 3012) - User management and profiles
3. **gamification-service** (Port 3005) - Points, badges, and leaderboards
4. **payment-service** (Port 3007) - Payment processing and transactions
5. **matching-service** (Port 3006) - Driver-passenger matching algorithm
6. **promotions-service** (Port 3008) - Vouchers and promotional campaigns

## Deployment Steps

### Prerequisites

1. **GKE Cluster**: Create a GKE cluster following the GCP_SUPABASE_DEPLOYMENT_GUIDE.md
2. **Docker Images**: Build and push images to Google Artifact Registry
3. **Secrets**: Update the secrets.yaml with actual production values

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (update with production values first)
kubectl apply -f k8s/secrets.yaml

# Deploy all services
kubectl apply -f k8s/deployments/

# Create ingress (configure domain first)
kubectl apply -f k8s/ingress.yaml
```

### Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n yaluride-production

# Check services
kubectl get services -n yaluride-production

# Check ingress
kubectl get ingress -n yaluride-production

# View logs for a specific service
kubectl logs -f deployment/api-gateway-deployment -n yaluride-production
```

## Configuration

### Environment Variables

All services are configured with:
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend operations
- `JWT_SECRET`: Secret for JWT token signing
- `NODE_ENV`: Set to "production"
- `GCP_PROJECT_ID`: Google Cloud project ID

### Secrets Management

Sensitive values are stored in Kubernetes secrets:
- `supabase-secrets`: Contains Supabase service role key
- `app-secrets`: Contains JWT secret and other application secrets

### Health Checks

All services include:
- **Liveness Probe**: Checks if the service is running
- **Readiness Probe**: Checks if the service is ready to receive traffic
- **Resource Limits**: Memory and CPU limits for efficient resource usage

## Scaling

Services are configured with:
- **Replicas**: 2 replicas per service for high availability
- **Resource Requests**: 256Mi memory, 250m CPU
- **Resource Limits**: 512Mi memory, 500m CPU

To scale a service:
```bash
kubectl scale deployment api-gateway-deployment --replicas=3 -n yaluride-production
```

## Monitoring

Monitor service health:
```bash
# Check service status
kubectl get pods -n yaluride-production -w

# View service logs
kubectl logs -f deployment/api-gateway-deployment -n yaluride-production

# Describe a pod for detailed information
kubectl describe pod <pod-name> -n yaluride-production
```

## Troubleshooting

Common issues:
1. **ImagePullBackOff**: Ensure Docker images are pushed to the correct registry
2. **CrashLoopBackOff**: Check service logs for startup errors
3. **Service Unavailable**: Verify health check endpoints are responding
4. **Database Connection**: Ensure Supabase credentials are correct in secrets
