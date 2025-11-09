import { managementClient } from "@/lib/auth0"
import { getCurrentOrgId } from "@/lib/get-current-org"
import { PageHeader } from "@/components/page-header"

import { DisplayNameForm } from "./display-name-form"

export default async function GeneralSettings() {
  const currentOrgId = await getCurrentOrgId()

  const { data: org } = await managementClient.organizations.get({
    id: currentOrgId,
  })

  return (
    <div className="space-y-2">
      <PageHeader
        title="General Settings"
        description="Update your organization's general settings."
      />

      <DisplayNameForm
        organization={{
          id: org.id,
          slug: org.name,
          displayName: org.display_name,
        }}
      />
    </div>
  )
}
