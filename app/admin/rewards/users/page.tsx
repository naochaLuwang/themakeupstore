import { adminGetAllUsersPoints } from "@/app/actions/loyalty"
import { AdminRewardsUsersClient } from "./client"

export default async function AdminRewardsUsersPage() {
  const users = await adminGetAllUsersPoints()
  return <AdminRewardsUsersClient users={users} />
}
