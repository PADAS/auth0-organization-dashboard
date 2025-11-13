"use server"

import { revalidatePath } from "next/cache"
import { SessionData } from "@auth0/nextjs-auth0/types"

import { managementClient } from "@/lib/auth0"
import { getOrgIdFromSession } from "@/lib/get-current-org"
import { Role, roles } from "@/lib/roles"
import { withServerActionAuth } from "@/lib/with-server-action-auth"

export const createInvitation = withServerActionAuth(
  async function createInvitation(formData: FormData, session: SessionData) {
    const email = formData.get("email")

    if (!email || typeof email !== "string") {
      return {
        error: "Email address is required.",
      }
    }

    const role = formData.get("role") as Role

    if (
      !role ||
      typeof role !== "string" ||
      !["member", "admin"].includes(role)
    ) {
      return {
        error: "Role is required and must be either 'member' or 'admin'.",
      }
    }

    const roleId = roles[role]
    const orgId = await getOrgIdFromSession(session)

    const { data: existingUsers } =
      await managementClient.usersByEmail.getByEmail({
        email,
        // Optional helpers:
        // fields: 'user_id,email',
        // include_fields: true,
      })

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      // Add existing user to org
      await managementClient.organizations.addMembers(
        { id: orgId },
        { members: [existingUser.user_id] }
      )

      if (roleId) {
        await managementClient.organizations.addMemberRoles(
          { id: orgId, user_id: existingUser.user_id },
          { roles: [roleId] }
        )
      }

      return {}
    }

    
    try {
      // const roleId = roles[role]
      // const orgId = await getOrgIdFromSession(session)

      await managementClient.organizations.createInvitation(
        {
          id: orgId,
        },
        {
          invitee: {
            email,
          },
          inviter: {
            name: session.user.name!,
          },
          client_id: process.env.AUTH0_CLIENT_ID,
          // if the roleId exists, then assign it. Regular members do not have a role assigned,
          // only admins are assigned a specific role.
          roles: roleId ? [roleId] : undefined,
        }
      )

      revalidatePath("/dashboard/organization/members")
    } catch (error) {
      console.error("failed to create invitation", error)
      return {
        error: "Failed to create invitation.",
      }
    }

    return {}
  },
  {
    role: "admin",
  }
)

export const revokeInvitation = withServerActionAuth(
  async function revokeInvitation(invitationId: string, session: SessionData) {
    try {
      const orgId = await getOrgIdFromSession(session)
      await managementClient.organizations.deleteInvitation({
        id: orgId,
        invitation_id: invitationId,
      })

      revalidatePath("/dashboard/organization/members")
    } catch (error) {
      console.error("failed to revoke invitation", error)
      return {
        error: "Failed to revoke invitation.",
      }
    }

    return {}
  },
  {
    role: "admin",
  }
)

export const removeMember = withServerActionAuth(
  async function removeMember(userId: string, session: SessionData) {
    if (userId === session.user.sub) {
      return {
        error: "You cannot remove yourself from an organization.",
      }
    }

    try {
      const orgId = await getOrgIdFromSession(session)
      await managementClient.organizations.deleteMembers(
        {
          id: orgId,
        },
        {
          members: [userId],
        }
      )

      revalidatePath("/dashboard/organization/members")
    } catch (error) {
      console.error("failed to remove member", error)
      return {
        error: "Failed to remove member.",
      }
    }

    return {}
  },
  {
    role: "admin",
  }
)

export const updateRole = withServerActionAuth(
  async function updateRole(userId: string, role: Role, session: SessionData) {
    if (userId === session.user.sub) {
      return {
        error: "You cannot update your own role.",
      }
    }

    if (
      !role ||
      typeof role !== "string" ||
      !["member", "admin"].includes(role)
    ) {
      return {
        error: "Role is required and must be either 'member' or 'admin'.",
      }
    }

    const roleId = roles[role]

    try {
      const orgId = await getOrgIdFromSession(session)
      const { data: currentRoles } =
        await managementClient.organizations.getMemberRoles({
          id: orgId,
          user_id: userId,
        })

      // if the user has any existing roles, remove them
      if (currentRoles.length) {
        await managementClient.organizations.deleteMemberRoles(
          {
            id: orgId,
            user_id: userId,
          },
          {
            roles: currentRoles.map((r) => r.id),
          }
        )
      }

      // if the user is being assigned a non-member role (non-null), set the new role
      if (roleId) {
        await managementClient.organizations.addMemberRoles(
          {
            id: orgId,
            user_id: userId,
          },
          {
            roles: [roleId],
          }
        )
      }

      revalidatePath("/dashboard/organization/members")
    } catch (error) {
      console.error("failed to update member's role", error)
      return {
        error: "Failed to update member's role.",
      }
    }

    return {}
  },
  {
    role: "admin",
  }
)
