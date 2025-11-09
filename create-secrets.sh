source ./.env.local

echo -n $AUTH0_CLIENT_ID | gcloud secrets create auth0-client-id --data-file=-
echo -n $AUTH0_CLIENT_SECRET | gcloud secrets create auth0-client-secret --data-file=-
echo -n $AUTH0_MANAGEMENT_CLIENT_ID | gcloud secrets create auth0-management-client-id --data-file=-
echo -n $AUTH0_MANAGEMENT_CLIENT_SECRET | gcloud secrets create auth0-management-client-secret --data-file=-
echo -n $SESSION_ENCRYPTION_SECRET | gcloud secrets create session-encryption-secret --data-file=-
echo -n "https://your-app.run.app" | gcloud secrets create app-base-url --data-file=-
