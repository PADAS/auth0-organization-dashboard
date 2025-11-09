"use server"

import { revalidatePath } from "next/cache"
import { SessionData } from "@auth0/nextjs-auth0/types"

import { managementClient } from "@/lib/auth0"
import { getOrgIdFromSession } from "@/lib/get-current-org"
import { withServerActionAuth } from "@/lib/with-server-action-auth"

export const updateDisplayName = withServerActionAuth(
  async function updateDisplayName(formData: FormData, session: SessionData) {
    const displayName = formData.get("display_name")

    if (!displayName || typeof displayName !== "string") {
      return {
        error: "Display name is required.",
      }
    }

    try {
      const orgId = await getOrgIdFromSession(session)
      await managementClient.organizations.update(
        {
          id: orgId,
        },
        {
          display_name: displayName,
        }
      )

      revalidatePath("/", "layout")
    } catch (error) {
      console.error("failed to update organization display name", error)
      return {
        error: "Failed to update the organization's display name.",
      }
    }

    return {}
  },
  {
    role: "admin",
  }
)
