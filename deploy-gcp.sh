#!/bin/bash

# Google Cloud Deployment Script for Auth0 B2B SaaS Starter
# This script helps you deploy to Google Cloud Run

set -e

# Configuration - Update these values
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
ARTIFACT_REGISTRY="auth0-b2b-saas"
SERVICE_NAME="organization-management"
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/${SERVICE_NAME}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Auth0 B2B SaaS Starter to Google Cloud Run${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Please run: gcloud auth login${NC}"
    exit 1
fi

# Set the project
echo -e "${GREEN}📋 Setting GCP project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${GREEN}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Build the container image
echo -e "${GREEN}🏗️  Building container image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME}

# Check if secrets exist, if not prompt to create them
echo -e "${GREEN}🔐 Checking for required secrets...${NC}"

SECRETS=(
    "auth0-client-id"
    "auth0-client-secret"
    "auth0-management-client-id"
    "auth0-management-client-secret"
    "session-encryption-secret"
)

# app-base-url is optional - we'll create it after deployment with the actual URL
OPTIONAL_SECRETS=(
    "app-base-url"
)

MISSING_SECRETS=()
for secret in "${SECRETS[@]}"; do
    if ! gcloud secrets describe ${secret} &> /dev/null; then
        MISSING_SECRETS+=("${secret}")
        echo -e "${YELLOW}⚠️  Secret ${secret} does not exist.${NC}"
    else
        echo -e "${GREEN}✓ Secret ${secret} exists${NC}"
    fi
done

# If secrets are missing, try to create them from .env.dev
if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  Missing ${#MISSING_SECRETS[@]} required secret(s).${NC}"
    
    if [ -f ".env.dev" ]; then
        echo -e "${GREEN}📄 Found .env.dev file. Attempting to create missing secrets...${NC}"
        source .env.dev
        
        for secret in "${MISSING_SECRETS[@]}"; do
            case ${secret} in
                "auth0-client-id")
                    if [ -n "${AUTH0_CLIENT_ID}" ]; then
                        echo -n "${AUTH0_CLIENT_ID}" | gcloud secrets create ${secret} --data-file=- 2>/dev/null || \
                        echo -n "${AUTH0_CLIENT_ID}" | gcloud secrets versions add ${secret} --data-file=- 2>/dev/null
                        echo -e "${GREEN}✓ Created/updated secret: ${secret}${NC}"
                    fi
                    ;;
                "auth0-client-secret")
                    if [ -n "${AUTH0_CLIENT_SECRET}" ]; then
                        echo -n "${AUTH0_CLIENT_SECRET}" | gcloud secrets create ${secret} --data-file=- 2>/dev/null || \
                        echo -n "${AUTH0_CLIENT_SECRET}" | gcloud secrets versions add ${secret} --data-file=- 2>/dev/null
                        echo -e "${GREEN}✓ Created/updated secret: ${secret}${NC}"
                    fi
                    ;;
                "auth0-management-client-id")
                    if [ -n "${AUTH0_MANAGEMENT_CLIENT_ID}" ]; then
                        echo -n "${AUTH0_MANAGEMENT_CLIENT_ID}" | gcloud secrets create ${secret} --data-file=- 2>/dev/null || \
                        echo -n "${AUTH0_MANAGEMENT_CLIENT_ID}" | gcloud secrets versions add ${secret} --data-file=- 2>/dev/null
                        echo -e "${GREEN}✓ Created/updated secret: ${secret}${NC}"
                    fi
                    ;;
                "auth0-management-client-secret")
                    if [ -n "${AUTH0_MANAGEMENT_CLIENT_SECRET}" ]; then
                        echo -n "${AUTH0_MANAGEMENT_CLIENT_SECRET}" | gcloud secrets create ${secret} --data-file=- 2>/dev/null || \
                        echo -n "${AUTH0_MANAGEMENT_CLIENT_SECRET}" | gcloud secrets versions add ${secret} --data-file=- 2>/dev/null
                        echo -e "${GREEN}✓ Created/updated secret: ${secret}${NC}"
                    fi
                    ;;
                "session-encryption-secret")
                    if [ -n "${SESSION_ENCRYPTION_SECRET}" ]; then
                        echo -n "${SESSION_ENCRYPTION_SECRET}" | gcloud secrets create ${secret} --data-file=- 2>/dev/null || \
                        echo -n "${SESSION_ENCRYPTION_SECRET}" | gcloud secrets versions add ${secret} --data-file=- 2>/dev/null
                        echo -e "${GREEN}✓ Created/updated secret: ${secret}${NC}"
                    fi
                    ;;
            esac
        done
        
        # Re-check if any secrets are still missing
        MISSING_SECRETS=()
        for secret in "${SECRETS[@]}"; do
            if ! gcloud secrets describe ${secret} &> /dev/null; then
                MISSING_SECRETS+=("${secret}")
            fi
        done
    fi
    
    # If secrets are still missing, provide instructions and exit
    if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
        echo -e "\n${RED}❌ The following secrets are still missing and must be created before deployment:${NC}"
        for secret in "${MISSING_SECRETS[@]}"; do
            echo -e "${RED}   - ${secret}${NC}"
        done
        echo -e "\n${YELLOW}To create these secrets, run:${NC}"
        echo -e "${YELLOW}  echo -n \"your-value\" | gcloud secrets create <secret-name> --data-file=-${NC}"
        echo -e "\n${YELLOW}Or create them from your .env.dev file:${NC}"
        echo -e "${YELLOW}  source .env.dev${NC}"
        echo -e "${YELLOW}  echo -n \"\${AUTH0_CLIENT_ID}\" | gcloud secrets create auth0-client-id --data-file=-${NC}"
        echo -e "${YELLOW}  # ... repeat for other secrets${NC}"
        exit 1
    fi
fi

# Prompt for environment variables if not set
if [ -z "$AUTH0_DOMAIN" ]; then
    read -p "Enter your Auth0 domain (e.g., your-tenant.us.auth0.com): " AUTH0_DOMAIN
fi

if [ -z "$AUTH0_ADMIN_ROLE_ID" ]; then
    read -p "Enter AUTH0_ADMIN_ROLE_ID: " AUTH0_ADMIN_ROLE_ID
fi

if [ -z "$AUTH0_MEMBER_ROLE_ID" ]; then
    read -p "Enter AUTH0_MEMBER_ROLE_ID: " AUTH0_MEMBER_ROLE_ID
fi

if [ -z "$DEFAULT_CONNECTION_ID" ]; then
    read -p "Enter DEFAULT_CONNECTION_ID: " DEFAULT_CONNECTION_ID
fi

if [ -z "$CUSTOM_CLAIMS_NAMESPACE" ]; then
    CUSTOM_CLAIMS_NAMESPACE="https://example.com"
    echo -e "${YELLOW}Using default CUSTOM_CLAIMS_NAMESPACE: ${CUSTOM_CLAIMS_NAMESPACE}${NC}"
fi

# Check if app-base-url secret exists, if not create a placeholder
APP_BASE_URL_SECRET=""
if gcloud secrets describe app-base-url &> /dev/null; then
    APP_BASE_URL_SECRET="APP_BASE_URL=app-base-url:latest"
    echo -e "${GREEN}✓ Using existing app-base-url secret${NC}"
else
    echo -e "${YELLOW}⚠️  app-base-url secret not found. Will create it after deployment with the actual service URL.${NC}"
    echo -e "${YELLOW}   Using placeholder URL for now...${NC}"
    # Create placeholder - we'll update it after deployment
    echo -n "https://placeholder.run.app" | gcloud secrets create app-base-url --data-file=- 2>/dev/null || true
    APP_BASE_URL_SECRET="APP_BASE_URL=app-base-url:latest"
fi

# Deploy to Cloud Run
echo -e "${GREEN}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_MANAGEMENT_API_DOMAIN=${AUTH0_DOMAIN},NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --set-secrets="AUTH0_CLIENT_ID=auth0-client-id:latest,AUTH0_CLIENT_SECRET=auth0-client-secret:latest,AUTH0_MANAGEMENT_CLIENT_ID=auth0-management-client-id:latest,AUTH0_MANAGEMENT_CLIENT_SECRET=auth0-management-client-secret:latest,SESSION_ENCRYPTION_SECRET=session-encryption-secret:latest,${APP_BASE_URL_SECRET}" \
  --set-env-vars="AUTH0_ADMIN_ROLE_ID=${AUTH0_ADMIN_ROLE_ID},AUTH0_MEMBER_ROLE_ID=${AUTH0_MEMBER_ROLE_ID},DEFAULT_CONNECTION_ID=${DEFAULT_CONNECTION_ID},CUSTOM_CLAIMS_NAMESPACE=${CUSTOM_CLAIMS_NAMESPACE}" \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=3000

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

# Update app-base-url secret with the actual service URL
echo -e "${GREEN}📝 Updating app-base-url secret with service URL...${NC}"
echo -n "${SERVICE_URL}" | gcloud secrets versions add app-base-url --data-file=- 2>/dev/null || \
echo -n "${SERVICE_URL}" | gcloud secrets create app-base-url --data-file=- 2>/dev/null

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo -e "\n${YELLOW}⚠️  IMPORTANT: Update your Auth0 application settings:${NC}"
echo -e "   Callback URLs: ${SERVICE_URL}/api/auth/callback, ${SERVICE_URL}/onboarding/callback"
echo -e "   Allowed Logout URLs: ${SERVICE_URL}"
echo -e "   Allowed Web Origins: ${SERVICE_URL}"
