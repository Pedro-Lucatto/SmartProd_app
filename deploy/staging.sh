#!/usr/bin/env bash
# Run from repository root in Cloud Shell. Never targets production service names.
set -euo pipefail
: "${PROJECT_ID:?Set the isolated staging project ID}"
: "${INSTANCE_CONNECTION_NAME:?Set project:region:instance}"
: "${RELEASE:?Set an immutable image tag built by cloudbuild.yaml}"
REGION="${REGION:-southamerica-east1}"
REPOSITORY="${REPOSITORY:-smartprod-repo}"
ACCOUNT="smartprod-staging@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
COMMON=(--project="$PROJECT_ID" --region="$REGION" --quiet)
SECRETS="DB_CONNECTION_STRING=smartprod-staging-db:1,JWT_SECRET=smartprod-staging-jwt:1"
BOOTSTRAP="$SECRETS,ADMIN_INITIAL_EMAIL=smartprod-staging-admin-email:1,ADMIN_INITIAL_PASSWORD=smartprod-staging-admin-password:1"

# One task, no retries; this deployment must be serialized, never run concurrently.
gcloud run jobs deploy smartprod-staging-migrate "${COMMON[@]}" \
  --image="$IMAGE/backend:$RELEASE" --args=--migrate-only \
  --service-account="$ACCOUNT" --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars=ASPNETCORE_ENVIRONMENT=Production,Jwt__Issuer=SmartProd.Staging \
  --set-secrets="$BOOTSTRAP" --tasks=1 --parallelism=1 --max-retries=0 \
  --memory=512Mi --task-timeout=600s
gcloud run jobs execute smartprod-staging-migrate "${COMMON[@]}" --wait

# API uses application JWT authentication; IAM permits browser/mobile HTTP access.
# Single instance for this first staging version (SignalR has no shared backplane).
gcloud run deploy smartprod-staging-api "${COMMON[@]}" \
  --image="$IMAGE/backend:$RELEASE" --port=8080 --allow-unauthenticated \
  --service-account="$ACCOUNT" --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars=ASPNETCORE_ENVIRONMENT=Production,Database__ApplyMigrations=false,Jwt__Issuer=SmartProd.Staging \
  --set-secrets="$SECRETS" --min-instances=0 --max-instances=1 \
  --cpu=1 --memory=512Mi --concurrency=20 \
  --startup-probe=httpGet.path=/health/ready,httpGet.port=8080,periodSeconds=10,failureThreshold=24 \
  --liveness-probe=httpGet.path=/alive,httpGet.port=8080,periodSeconds=30
BACKEND_URL=$(gcloud run services describe smartprod-staging-api "${COMMON[@]}" --format=value\(status.url\))
gcloud run deploy smartprod-staging-web "${COMMON[@]}" \
  --image="$IMAGE/frontend:$RELEASE" --port=8080 --allow-unauthenticated \
  --service-account="$ACCOUNT" --set-env-vars="BACKEND_URL=$BACKEND_URL" \
  --min-instances=0 --max-instances=1 --cpu=1 --memory=256Mi
FRONTEND_URL=$(gcloud run services describe smartprod-staging-web "${COMMON[@]}" --format=value\(status.url\))
export BACKEND_URL FRONTEND_URL
echo "Staging deployed: $FRONTEND_URL"
echo 'Run deploy/smoke.py with SMOKE_EMAIL and SMOKE_PASSWORD to validate login and PDF.'
