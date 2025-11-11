import { User } from "@auth0/nextjs-auth0/types"

const ROLES_CLAIM_KEY = `${process.env.CUSTOM_CLAIMS_NAMESPACE}/roles`

export const roles = {
  member: process.env.AUTH0_MEMBER_ROLE_ID,
  admin: process.env.AUTH0_ADMIN_ROLE_ID,
}

export type Role = keyof typeof roles

export function getRole(user: User) {
  // we only allow a single role to be assigned to a user
  const roleClaim = user[ROLES_CLAIM_KEY]
  
  // Handle different claim formats
  let role: string | undefined
  
  if (Array.isArray(roleClaim)) {
    // If it's an array, get the first element
    role = roleClaim[0]
  } else if (typeof roleClaim === "string") {
    // If it's a string directly, use it
    role = roleClaim
  } else if (roleClaim && typeof roleClaim === "object") {
    // If it's an object (shouldn't happen, but handle it)
    role = undefined
  }

  // if no role is assigned, set them to the default member role
  if (!role || typeof role !== "string") {
    return "member"
  }

  // Normalize the role name (trim whitespace, lowercase for comparison)
  const normalizedRole = role.trim().toLowerCase()

  // Auth0's event.authorization.roles contains role names (e.g., "admin", "member")
  // not role IDs, so we can check the role name directly
  if (normalizedRole === "admin") {
    return "admin"
  }

  // Default to member for any other role or if role is "member"
  return "member"
}
