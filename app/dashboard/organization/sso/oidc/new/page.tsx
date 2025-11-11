import Link from "next/link"
import { ArrowLeftIcon } from "@radix-ui/react-icons"

import { appClient } from "@/lib/auth0"
import { getCurrentOrgId } from "@/lib/get-current-org"
import { getOrCreateDomainVerificationToken } from "@/lib/domain-verification"
import { Button } from "@/components/ui/button"
import { AppBreadcrumb } from "@/components/app-breadcrumb"

import { CreateOidcConnectionForm } from "./create-oidc-connection-form"

export default async function CreateOidcConnection() {
  const session = await appClient.getSession()

  const orgId = await getCurrentOrgId()

  const domainVerificationToken =
    await getOrCreateDomainVerificationToken(orgId)

  return (
    <div className="space-y-1">
      <div className="px-2 py-3">
        <AppBreadcrumb
          title="Back to connections"
          href="/dashboard/organization/sso"
        />
      </div>

      <CreateOidcConnectionForm
        domainVerificationToken={domainVerificationToken}
      />
    </div>
  )
}
