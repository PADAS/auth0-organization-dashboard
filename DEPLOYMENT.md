# Google Cloud Platform Deployment Guide

This guide walks you through deploying the Auth0 B2B SaaS Starter to Google Cloud Platform.

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud SDK**: Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Auth0 Tenant**: Already configured (via bootstrap script)
4. **Environment Variables**: From your `.env.local` file

## Quick Start

### Option 1: Using the Deployment Script (Recommended)

1. **Set your GCP project ID:**
   ```bash
   export GCP_PROJECT_ID="your-project-id"
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy-gcp.sh
   ```

3. **Follow the prompts** to enter your Auth0 configuration values.

### Option 2: Manual Deployment

#### Step 1: Set Up Secrets in Secret Manager

Create secrets for sensitive values:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project ${PROJECT_ID}

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets (you'll be prompted to enter the secret value)
echo -n "your-client-id" | gcloud secrets create auth0-client-id --data-file=-
echo -n "your-client-secret" | gcloud secrets create auth0-client-secret --data-file=-
echo -n "your-mgmt-client-id" | gcloud secrets create auth0-management-client-id --data-file=-
echo -n "your-mgmt-client-secret" | gcloud secrets create auth0-management-client-secret --data-file=-
echo -n "your-session-secret" | gcloud secrets create session-encryption-secret --data-file=-
echo -n "https://your-app.run.app" | gcloud secrets create app-base-url --data-file=-
```

#### Step 2: Build and Deploy

```bash
# Build the container
gcloud builds submit --tag gcr.io/${PROJECT_ID}/auth0-b2b-saas

# Deploy to Cloud Run
gcloud run deploy auth0-b2b-saas \
  --image gcr.io/${PROJECT_ID}/auth0-b2b-saas \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com,AUTH0_MANAGEMENT_API_DOMAIN=your-tenant.us.auth0.com" \
  --set-secrets="AUTH0_CLIENT_ID=auth0-client-id:latest,AUTH0_CLIENT_SECRET=auth0-client-secret:latest,AUTH0_MANAGEMENT_CLIENT_ID=auth0-management-client-id:latest,AUTH0_MANAGEMENT_CLIENT_SECRET=auth0-management-client-secret:latest,SESSION_ENCRYPTION_SECRET=session-encryption-secret:latest,APP_BASE_URL=app-base-url:latest" \
  --set-env-vars="AUTH0_ADMIN_ROLE_ID=rol_xxxxx,AUTH0_MEMBER_ROLE_ID=rol_xxxxx,DEFAULT_CONNECTION_ID=con_xxxxx,CUSTOM_CLAIMS_NAMESPACE=https://example.com" \
  --memory=1Gi \
  --cpu=1
```

#### Step 3: Update Auth0 Configuration

After deployment, update your Auth0 application settings:

1. Go to [Auth0 Dashboard](https://manage.auth0.com) → Applications → Your App
2. Update the following URLs (replace with your Cloud Run URL):
   - **Allowed Callback URLs**: 
     - `https://your-app-xxxxx.run.app/api/auth/callback`
     - `https://your-app-xxxxx.run.app/onboarding/callback`
   - **Allowed Logout URLs**: `https://your-app-xxxxx.run.app`
   - **Allowed Web Origins**: `https://your-app-xxxxx.run.app`

## Continuous Deployment with Cloud Build

### Set Up Cloud Build Trigger

1. **Connect your repository** to Cloud Build (GitHub, GitLab, or Cloud Source Repositories)

2. **Create a trigger:**
   ```bash
   gcloud builds triggers create github \
     --repo-name=auth0-b2b-saas-starter \
     --repo-owner=your-username \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml \
     --substitutions=_AUTH0_DOMAIN="your-tenant.us.auth0.com",_AUTH0_ADMIN_ROLE_ID="rol_xxxxx",_AUTH0_MEMBER_ROLE_ID="rol_xxxxx",_DEFAULT_CONNECTION_ID="con_xxxxx",_CUSTOM_CLAIMS_NAMESPACE="https://example.com"
   ```

## Environment Variables Reference

Required environment variables (from your `.env.local`):

| Variable | Description | Source |
|----------|-------------|--------|
| `APP_BASE_URL` | Your application URL | Secret Manager |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain | Environment variable |
| `AUTH0_MANAGEMENT_API_DOMAIN` | Auth0 management API domain | Environment variable |
| `SESSION_ENCRYPTION_SECRET` | Session encryption key | Secret Manager |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | Secret Manager |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | Secret Manager |
| `AUTH0_MANAGEMENT_CLIENT_ID` | Auth0 management client ID | Secret Manager |
| `AUTH0_MANAGEMENT_CLIENT_SECRET` | Auth0 management client secret | Secret Manager |
| `AUTH0_ADMIN_ROLE_ID` | Admin role ID | Environment variable |
| `AUTH0_MEMBER_ROLE_ID` | Member role ID | Environment variable |
| `DEFAULT_CONNECTION_ID` | Default connection ID | Environment variable |
| `CUSTOM_CLAIMS_NAMESPACE` | Custom claims namespace | Environment variable |

## Custom Domain Setup

1. **Map a custom domain** in Cloud Run:
   ```bash
   gcloud run domain-mappings create \
     --service auth0-b2b-saas \
     --domain your-domain.com \
     --region us-central1
   ```

2. **Update DNS records** as instructed by the command output

3. **Update Auth0 URLs** to use your custom domain

## Monitoring and Logs

- **View logs**: `gcloud run services logs read auth0-b2b-saas --region us-central1`
- **Cloud Console**: Navigate to Cloud Run → auth0-b2b-saas → Logs
- **Set up alerts**: Cloud Monitoring → Alerting Policies

## Troubleshooting

### Build fails with "standalone" output error
- Ensure `next.config.mjs` has `output: 'standalone'` configured

### Authentication errors
- Verify all Auth0 callback URLs are correctly configured
- Check that `APP_BASE_URL` matches your actual deployment URL

### Container won't start
- Check logs: `gcloud run services logs read auth0-b2b-saas --region us-central1`
- Verify all secrets exist in Secret Manager
- Ensure environment variables are correctly set

## Cost Optimization

- **Min instances**: Set to 0 for development (cold starts are acceptable)
- **Max instances**: Adjust based on expected traffic
- **Memory**: 1Gi is sufficient for most use cases
- **CPU**: 1 vCPU is sufficient for most workloads

## Security Best Practices

1. ✅ Use Secret Manager for sensitive values
2. ✅ Enable Cloud Armor for DDoS protection (if needed)
3. ✅ Use IAM to restrict access to Cloud Run services
4. ✅ Enable audit logging
5. ✅ Regularly rotate secrets

## Support

For issues or questions:
- Check the [main README](./README.md)
- Review [Auth0 documentation](https://auth0.com/docs)
- Check [Google Cloud Run documentation](https://cloud.google.com/run/docs)
