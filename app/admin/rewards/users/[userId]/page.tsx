import { adminGetUserTransactions } from '@/app/actions/loyalty'
import { rewardTxFilters, rewardHref, type RewardTxParams } from '@/lib/reward-users'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RewardUserDetailClient } from './user-detail-client'

export default async function AdminRewardsUserDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ userId: string }>
    searchParams: Promise<RewardTxParams>
}) {
    const { userId } = await params
    const filtersInput = await searchParams
    let data, filters
    try {
        filters = rewardTxFilters(filtersInput)
        data = await adminGetUserTransactions(userId, filtersInput)
    } catch (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-black tracking-tight">Reward history</h1>
                <div role="alert" className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
                    <p className="text-sm text-red-700">
                        {error instanceof Error ? error.message : 'Unable to load reward history.'}
                    </p>
                    <Link
                        href={rewardHref(
                            `/admin/rewards/users/${encodeURIComponent(userId)}`,
                            filtersInput,
                            1
                        )}
                        className="text-sm underline"
                    >
                        Retry
                    </Link>
                    <Link
                        href={`/admin/rewards/users/${encodeURIComponent(userId)}`}
                        className="ml-4 text-sm underline"
                    >
                        Reset filters
                    </Link>
                </div>
            </div>
        )
    }
    if (!data) notFound()
    return <RewardUserDetailClient data={data} filters={filters} />
}
