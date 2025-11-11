"use server"

import { SessionData } from "@auth0/nextjs-auth0/types"

import { verifyDnsRecords } from "@/lib/domain-verification"
import { getOrgIdFromSession } from "@/lib/get-current-org"
import { withServerActionAuth } from "@/lib/with-server-action-auth"

export const verifyDomain = withServerActionAuth(
  async function verifyDomain(domain: string, session: SessionData) {
    if (!domain || typeof domain !== "string") {
      return {
        error: "Domain is required.",
      }
    }

    const normalizedDomain = domain.trim().toLowerCase()

    try {
      const orgId = await getOrgIdFromSession(session)
      const verified = await verifyDnsRecords(normalizedDomain, orgId)

      return { verified }
    } catch (error) {
      console.error("failed to validate the domain", error)
      return {
        error: "Failed to validate the domain.",
      }
    }
  },
  {
    role: "admin",
  }
)
