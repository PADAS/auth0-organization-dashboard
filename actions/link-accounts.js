/**
 * Handler that will be called during the execution of a PostLogin flow.
 * This action automatically links accounts with the same email address.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Only run for the dashboard client
  if (event.client.client_id !== event.secrets.DASHBOARD_CLIENT_ID) {
    return;
  }

  // Skip if user already has multiple identities (already linked)
  if (event.user.identities && event.user.identities.length > 1) {
    return;
  }

  // Skip if no email
  if (!event.user.email) {
    return;
  }

  const ManagementClient = require("auth0").ManagementClient;

  const managementClient = new ManagementClient({
    domain: event.secrets.DOMAIN,
    clientId: event.secrets.CLIENT_ID,
    clientSecret: event.secrets.CLIENT_SECRET,
  });

  try {
    // Find all users with the same email
    const { data: users } = await managementClient.usersByEmail.getByEmail({
      email: event.user.email,
    });

    // Filter out the current user and find users from different connections
    const otherUsers = users.filter(
      (u) =>
        u.user_id !== event.user.user_id &&
        u.identities &&
        u.identities.length > 0 &&
        u.identities[0].connection !== event.user.identities[0].connection
    );

    if (otherUsers.length === 0) {
      return;
    }

    // Determine primary user: prefer database connection (auth0) as primary
    // This ensures organization memberships and roles are preserved
    // If multiple users exist, prefer the database connection as primary
    const currentIsDatabase = event.user.identities[0].connection === "auth0";
    
    // Find database connection user if it exists
    const databaseUser = otherUsers.find(
      (u) => u.identities?.[0]?.connection === "auth0"
    ) || (currentIsDatabase ? event.user : null);
    
    // Determine primary: database connection if exists, otherwise first existing user
    let primaryUserId, primaryUser;
    
    if (databaseUser) {
      // Database connection exists - use it as primary
      primaryUserId = databaseUser.user_id;
      primaryUser = databaseUser;
    } else {
      // No database connection - use the first existing user (oldest account)
      // Sort by created_at to get the oldest
      const sortedUsers = [event.user, ...otherUsers].sort((a, b) => {
        const aDate = new Date(a.created_at || 0);
        const bDate = new Date(b.created_at || 0);
        return aDate - bDate;
      });
      primaryUser = sortedUsers[0];
      primaryUserId = primaryUser.user_id;
    }

    // Link all other users to the primary
    const usersToLink = [event.user, ...otherUsers].filter(
      (u) => u.user_id !== primaryUserId
    );

    for (const userToLink of usersToLink) {
      const identity = userToLink.identities[0];
      
      // Build link parameters
      const linkParams = {
        user_id: userToLink.user_id,
        provider: identity.provider,
      };

      // Only include connection_id for database connections (starts with "con_")
      // Social connections (like google-oauth2) don't need connection_id
      if (identity.connection && identity.connection.startsWith("con_")) {
        linkParams.connection_id = identity.connection;
      }

      await managementClient.users.link(
        { id: primaryUserId },
        linkParams
      );
    }

    console.log(`Linked ${usersToLink.length} account(s) to primary account: ${primaryUserId}`);
  } catch (error) {
    // Log error but don't block login
    // Common errors: accounts already linked, user not found, etc.
    console.error("Failed to link accounts:", error.message || error);
  }
};

