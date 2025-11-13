import { managementClient } from "@/lib/auth0"
import { getCurrentOrgId } from "@/lib/get-current-org"
import { Role } from "@/lib/roles"
import { PageHeader } from "@/components/page-header"

import { CreateInvitationForm } from "./create-invitation-form"
import { InvitationsList } from "./invitations-list"
import { MembersList } from "./members-list"

export default async function Members() {
  const currentOrgId = await getCurrentOrgId()
  
  const { data: members } = await managementClient.organizations.getMembers({
    id: currentOrgId,
    fields: ["user_id", "name", "email", "picture"].join(","),
    include_fields: true,
  })

  const adminRoleId = process.env.AUTH0_ADMIN_ROLE_ID

  const membersWithRoles = await Promise.all(
    members.map(async (member) => {
      const { data: memberRoles } =
        await managementClient.organizations.getMemberRoles({
          id: currentOrgId,
          user_id: member.user_id,
        })

      const isAdmin = Boolean(
        adminRoleId && memberRoles.some((role) => role.id === adminRoleId)
      )

      const role: Role = isAdmin ? "admin" : "member"

      return {
        id: member.user_id,
        name: member.name,
        email: member.email,
        picture: member.picture,
        role,
      }
    })
  )
  const { data: invitations } =
    await managementClient.organizations.getInvitations({
      id: currentOrgId,
    })

  return (
    <div className="space-y-2">
      <PageHeader
        title="Members"
        description="Manage the members of the organization."
      />

      <MembersList members={membersWithRoles} />

      <InvitationsList
        invitations={invitations.map((i) => ({
          id: i.id,
          inviter: {
            name: i.inviter.name,
          },
          invitee: {
            email: i.invitee.email,
          },
          role:
            i.roles &&
            i.roles[0] &&
            i.roles[0] === process.env.AUTH0_ADMIN_ROLE_ID
              ? "admin"
              : "member",
          url: i.invitation_url,
        }))}
      />

      <CreateInvitationForm />
    </div>
  )
}
