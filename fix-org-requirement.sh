#!/bin/bash

# Script to fix the organization requirement issue in Auth0
# This updates the dashboard client to allow login without requiring organization membership upfront

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 Fixing Auth0 client organization requirement...${NC}\n"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found. Please run the bootstrap script first.${NC}"
    exit 1
fi

# Source environment variables
source .env.local

# Check if Auth0 CLI is installed
if ! command -v auth0 &> /dev/null; then
    echo -e "${RED}❌ Auth0 CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is logged in
if ! auth0 tenants list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Auth0 CLI. Please run: auth0 login${NC}"
    exit 1
fi

echo -e "${GREEN}📝 Updating dashboard client configuration...${NC}"

# Update the client to allow optional organization membership
# Change organization_usage from "require" to "no_prompt"
# This allows users to log in without requiring organization membership
# The app will handle routing: users without orgs go to onboarding, users with orgs go to dashboard
auth0 api patch "clients/${AUTH0_CLIENT_ID}" \
  --data '{
    "organization_usage": "no_prompt",
    "organization_require_behavior": "no_prompt"
  }'

echo -e "\n${GREEN}✅ Successfully updated client configuration!${NC}"
echo -e "${GREEN}The dashboard client now allows login without requiring organization membership.${NC}"
echo -e "${YELLOW}Users without organizations can now log in and will be redirected to onboarding.${NC}"
echo -e "${YELLOW}Users with organizations will have one automatically selected for their session.${NC}"

