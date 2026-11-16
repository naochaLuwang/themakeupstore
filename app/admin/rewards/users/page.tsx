import Link from 'next/link'
import { adminGetAllUsersPoints } from '@/app/actions/loyalty'
import { rewardFilters, rewardHref, type RewardParams } from '@/lib/reward-users'
import { AdminRewardsUsersClient } from './client'

export default async function AdminRewardsUsersPage({
    searchParams,
}: {
    searchParams: Promise<RewardParams>
}) {
    const params = await searchParams
    let report, filters
    try {
        filters = rewardFilters(params)
        report = await adminGetAllUsersPoints(params)
    } catch (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">Reward users</h1>
                <div role="alert" className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
                    <p className="text-sm text-red-700">
                        {error instanceof Error ? error.message : 'Unable to load reward users.'}
                    </p>
                    <Link href={rewardHref('/admin/rewards/users', params, 1)} className="text-sm underline">
                        Retry
                    </Link>
                    <Link href="/admin/rewards/users" className="ml-4 text-sm underline">
                        Reset filters
                    </Link>
                </div>
            </div>
        )
    }
    return <AdminRewardsUsersClient report={report} filters={filters} />
}
