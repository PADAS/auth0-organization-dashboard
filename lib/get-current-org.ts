import { redirect } from "next/navigation"
import { SessionData } from "@auth0/nextjs-auth0/types"
import { appClient, managementClient } from "./auth0"

/**
 * Gets the current organization ID from a session object.
 * If org_id is not in the session, it uses the user's first organization.
 * If the user has no organizations, throws an error (for use in actions).
 */
export async function getOrgIdFromSession(session: SessionData): Promise<string> {
  if (!session?.user) {
    throw new Error("User is not authenticated")
  }

  // Get user's organizations
  const { data: orgs } = await managementClient.users.getUserOrganizations({
    id: session.user.sub,
  })

  // If user has no organizations, throw error
  if (!orgs.length) {
    throw new Error("User does not belong to any organizations")
  }

  // Use org_id from session if available, otherwise use first organization
  const currentOrgId = session.user.org_id || orgs[0]?.id

  if (!currentOrgId) {
    throw new Error("Could not determine organization ID")
  }

  return currentOrgId
}

/**
 * Gets the current organization ID from the session.
 * If org_id is not in the session, it uses the user's first organization.
 * If the user has no organizations, redirects to onboarding.
 */
export async function getCurrentOrgId(): Promise<string> {
  const session = await appClient.getSession()

  if (!session?.user) {
    redirect("/auth/login")
  }

  try {
    return await getOrgIdFromSession(session)
  } catch {
    redirect("/onboarding/create")
  }
}

