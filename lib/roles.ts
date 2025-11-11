import { User } from "@auth0/nextjs-auth0/types"

const ROLES_CLAIM_KEY = `${process.env.CUSTOM_CLAIMS_NAMESPACE}/roles`

export const roles = {
  member: process.env.AUTH0_MEMBER_ROLE_ID,
  admin: process.env.AUTH0_ADMIN_ROLE_ID,
}

export type Role = keyof typeof roles

export function getRole(user: User) {
  const roleClaim = user[ROLES_CLAIM_KEY]
  
  // Handle different claim formats
  let rolesArray: string[] = []
  
  if (Array.isArray(roleClaim)) {
    // If it's an array, use all elements
    rolesArray = roleClaim.filter((r) => typeof r === "string")
  } else if (typeof roleClaim === "string") {
    // If it's a string directly, treat it as a single role
    rolesArray = [roleClaim]
  }

  // if no roles are assigned, set them to the default member role
  if (rolesArray.length === 0) {
    return "member"
  }

  // Normalize all role names (trim whitespace, lowercase for comparison)
  const normalizedRoles = rolesArray.map((r) => r.trim().toLowerCase())

  // Auth0's event.authorization.roles contains role names (e.g., "admin", "member")
  // If the user has the "admin" role anywhere in their roles, they are an admin
  // This handles cases where a user might have both "member" and "admin" roles
  if (normalizedRoles.includes("admin")) {
    return "admin"
  }

  // Default to member if no admin role is found
  return "member"
}
