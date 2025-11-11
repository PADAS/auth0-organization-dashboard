#!/usr/bin/env node

/**
 * Manual script to link two Auth0 user accounts with the same email address.
 * 
 * Usage:
 *   node scripts/link-accounts-manually.mjs <email>
 * 
 * This will find all users with the given email and link them together.
 * 
 * Requires .env.local with:
 *   - AUTH0_MANAGEMENT_API_DOMAIN
 *   - AUTH0_MANAGEMENT_CLIENT_ID
 *   - AUTH0_MANAGEMENT_CLIENT_SECRET
 */

import { ManagementClient } from "auth0";
import ora from "ora";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Expand variable references (dotenv doesn't do this by default)
// If AUTH0_MANAGEMENT_API_DOMAIN contains ${AUTH0_DOMAIN}, expand it
if (process.env.AUTH0_MANAGEMENT_API_DOMAIN?.includes("${AUTH0_DOMAIN}")) {
  process.env.AUTH0_MANAGEMENT_API_DOMAIN = process.env.AUTH0_DOMAIN || process.env.AUTH0_MANAGEMENT_API_DOMAIN.replace("${AUTH0_DOMAIN}", process.env.AUTH0_DOMAIN || "");
}

// Same for NEXT_PUBLIC_AUTH0_DOMAIN
if (process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.includes("${AUTH0_DOMAIN}")) {
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN.replace("${AUTH0_DOMAIN}", process.env.AUTH0_DOMAIN || "");
}

// Fallback: if AUTH0_MANAGEMENT_API_DOMAIN is still not set or contains unresolved variables, use AUTH0_DOMAIN
if (!process.env.AUTH0_MANAGEMENT_API_DOMAIN || process.env.AUTH0_MANAGEMENT_API_DOMAIN.includes("${")) {
  process.env.AUTH0_MANAGEMENT_API_DOMAIN = 
    process.env.AUTH0_DOMAIN || 
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/link-accounts-manually.mjs <email>");
  process.exit(1);
}

// Validate required environment variables
const requiredEnvVars = [
  "AUTH0_MANAGEMENT_API_DOMAIN",
  "AUTH0_MANAGEMENT_CLIENT_ID",
  "AUTH0_MANAGEMENT_CLIENT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set in .env.local`);
    process.exit(1);
  }
}

// Debug: Show what we're using
console.log("Environment variables:");
console.log(`  AUTH0_MANAGEMENT_API_DOMAIN: ${process.env.AUTH0_MANAGEMENT_API_DOMAIN}`);
console.log(`  AUTH0_MANAGEMENT_CLIENT_ID: ${process.env.AUTH0_MANAGEMENT_CLIENT_ID ? "✓ Set" : "✗ Missing"}`);
console.log(`  AUTH0_MANAGEMENT_CLIENT_SECRET: ${process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? "✓ Set" : "✗ Missing"}`);
console.log("");

// Initialize Management API client
const domain = process.env.AUTH0_MANAGEMENT_API_DOMAIN;
if (!domain || domain.includes("${")) {
  console.error("❌ Error: AUTH0_MANAGEMENT_API_DOMAIN is not properly set or contains unresolved variables");
  console.error(`   Current value: ${domain}`);
  console.error("   Please check your .env.local file");
  process.exit(1);
}

const managementClient = new ManagementClient({
  domain: domain,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
});

const spinner = ora({
  text: `Finding users with email: ${email}`,
}).start();

try {
  // Test the Management API connection first
  spinner.text = "Testing Management API connection...";
  
  // Find all users with this email using Management API
  const { data: users } = await managementClient.usersByEmail.getByEmail({
    email,
  });

  if (users.length < 2) {
    spinner.fail(`Found ${users.length} user(s) with email ${email}. Need at least 2 to link.`);
    process.exit(1);
  }

  spinner.succeed(`Found ${users.length} user(s) with email ${email}`);

  // Determine primary user (prefer database connection, otherwise first user)
  const primaryUser = users.find(
    (u) => u.identities?.[0]?.connection === "auth0"
  ) || users[0];

  const secondaryUsers = users.filter((u) => u.user_id !== primaryUser.user_id);

  console.log(`\nPrimary user: ${primaryUser.user_id} (${primaryUser.identities?.[0]?.connection})`);
  console.log(`Secondary users to link:`);
  secondaryUsers.forEach((u) => {
    console.log(`  - ${u.user_id} (${u.identities?.[0]?.connection})`);
  });

  // Link each secondary user to the primary
  for (const secondaryUser of secondaryUsers) {
    const linkSpinner = ora({
      text: `Linking ${secondaryUser.user_id} to ${primaryUser.user_id}`,
    }).start();

    try {
      const identity = secondaryUser.identities?.[0];
      if (!identity) {
        linkSpinner.fail(`No identity found for user ${secondaryUser.user_id}`);
        continue;
      }

      // Use Management API to link accounts
      // For social connections (like google-oauth2), we need to use provider instead of connection_id
      const linkParams = {
        user_id: secondaryUser.user_id,
        provider: identity.provider,
      };

      // Only include connection_id if it's a database connection (starts with "con_")
      // Social connections use the provider name directly
      if (identity.connection && identity.connection.startsWith("con_")) {
        linkParams.connection_id = identity.connection;
      }

      await managementClient.users.link(
        { id: primaryUser.user_id },
        linkParams
      );

      linkSpinner.succeed(`Linked ${secondaryUser.user_id} to ${primaryUser.user_id}`);
    } catch (error) {
      linkSpinner.fail(`Failed to link ${secondaryUser.user_id}: ${error.message || error}`);
    }
  }

  console.log(`\n✅ Account linking complete!`);
  console.log(`\nUsers can now log in with either connection and will see the same account.`);
} catch (error) {
  spinner.fail(`Error: ${error.message || error}`);
  
  // Provide more detailed error information
  if (error.message?.includes("fetch failed") || error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    console.error("\n❌ Connection error. Please check:");
    console.error(`   - AUTH0_MANAGEMENT_API_DOMAIN: ${process.env.AUTH0_MANAGEMENT_API_DOMAIN}`);
    console.error(`   - Network connectivity`);
    console.error(`   - Auth0 tenant is accessible`);
  } else if (error.statusCode === 401 || error.message?.includes("Unauthorized")) {
    console.error("\n❌ Authentication error. Please check:");
    console.error(`   - AUTH0_MANAGEMENT_CLIENT_ID: ${process.env.AUTH0_MANAGEMENT_CLIENT_ID ? "✓ Set" : "✗ Missing"}`);
    console.error(`   - AUTH0_MANAGEMENT_CLIENT_SECRET: ${process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? "✓ Set" : "✗ Missing"}`);
    console.error(`   - Management API client has correct permissions`);
  } else {
    console.error("\nFull error details:", error);
  }
  
  process.exit(1);
}
