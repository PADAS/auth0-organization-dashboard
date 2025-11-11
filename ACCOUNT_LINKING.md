# Account Linking Setup Guide

This guide explains how to set up automatic account linking for users with the same email address across different connections (e.g., Google OAuth and database connection).

## Overview

When a user signs up with both Google OAuth and a database connection using the same email, Auth0 creates two separate user accounts. This action automatically links them during login so users can authenticate with either method.

## Setup Instructions

### Step 1: Deploy the Account Linking Action

1. **Open Auth0 Dashboard** → **Actions** → **Library**

2. **Click "Create Action"** and select **"Login / Post Login"** trigger

3. **Name the action**: "Automatic Account Linking"

4. **Copy the code** from `actions/link-accounts.js` into the action editor

5. **Add the following secrets** (click "Secrets" in the action editor):
   - `DASHBOARD_CLIENT_ID`: Your dashboard client ID (from `.env.local`: `AUTH0_CLIENT_ID`)
   - `DOMAIN`: Your Auth0 domain (from `.env.local`: `AUTH0_MANAGEMENT_API_DOMAIN`)
   - `CLIENT_ID`: Your management client ID (from `.env.local`: `AUTH0_MANAGEMENT_CLIENT_ID`)
   - `CLIENT_SECRET`: Your management client secret (from `.env.local`: `AUTH0_MANAGEMENT_CLIENT_SECRET`)

6. **Add the dependency**: Click "Dependencies" and add:
   - `auth0` version `4.4.0` (or latest)

7. **Click "Deploy"** to save the action

### Step 2: Add Action to Login Flow

1. **Go to Actions** → **Flows** → **Login**

2. **Click the "+" icon** to add an action

3. **Select "Automatic Account Linking"** from the custom actions list

4. **Drag it to the appropriate position** in the flow (typically after "Add Role to Tokens" but before "Security Policies")

5. **Click "Apply"** to save the flow

### Step 3: Test the Setup

1. **Create two test users** with the same email:
   - One via Google OAuth
   - One via database connection (sign up form)

2. **Log in with either method** - the accounts should be automatically linked

3. **Verify linking**:
   - Log in with Google OAuth
   - Log out
   - Log in with database credentials
   - Both should now access the same account

## How It Works

1. **During login**, the action checks if the user already has multiple identities (already linked)
2. If not, it searches for other users with the same email address
3. If found, it links the accounts, preferring the database connection as the primary account
4. After linking, users can log in with either connection method

## Manual Linking (For Existing Users)

If you have existing duplicate accounts, use the manual linking script:

```bash
node scripts/link-accounts-manually.mjs user@example.com
```

This will find all users with that email and link them together.

## Security Considerations

⚠️ **Important**: Automatic account linking based on email alone can be a security risk if:
- Email addresses are not verified
- Email addresses can be spoofed

**Best practices**:
- Ensure email verification is enabled for all connections
- Consider requiring additional verification before linking (e.g., send confirmation email)
- Monitor the Auth0 logs for suspicious linking activity

## Troubleshooting

### Action not running
- Check that the action is added to the Login flow
- Verify the action is deployed (not in draft)
- Check the action logs in Auth0 Dashboard → Actions → [Your Action] → Logs

### Accounts not linking
- Verify both users have the same email address (case-sensitive in some cases)
- Check that the users are from different connections
- Review the action logs for errors

### Users lose organization memberships after linking
- The action prefers the database connection as primary to preserve memberships
- If issues persist, manually link accounts and specify which should be primary

