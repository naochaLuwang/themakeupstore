import type { CreditRequest, RewardDirectory, RewardUser, RewardUserDetail } from './reward-users'
export const rewardUser: RewardUser = {
    user_id: '99999999-0000-4000-8000-000000000002',
    full_name: 'Anita Fixture',
    phone: '9000000000',
    email: 'anita@example.test',
    balance: 100,
    lifetime_earned: 150,
    lifetime_spent: 50,
    pending: 10,
    tier: 'bronze',
    last_activity: '2026-11-13T08:00:00Z',
}
export const rewardRequest: CreditRequest = {
    requestId: '99999999-0000-4000-8000-000000000020',
    userId: rewardUser.user_id,
    amount: 50,
    expectedBalance: 100,
    note: 'Fixture compensation',
}
export const rewardDirectory: RewardDirectory = {
    users: [rewardUser],
    total: 1881,
    page: 2,
    totalPages: 76,
    summary: { balance: 10000, earned: 20000, spent: 5000, pending: 500, active: 1000 },
}
export const rewardDetail: RewardUserDetail = {
    user: rewardUser,
    summary: { recordedEarned: 150, spent: 50, pending: 10, expired: 0 },
    total: 252,
    page: 2,
    totalPages: 11,
    transactions: [
        {
            id: '99999999-0000-4000-8000-000000000030',
            type: 'bonus',
            amount: 50,
            status: 'available',
            note: 'Fixture compensation',
            created_at: '2026-11-13T08:00:00Z',
            reference_type: 'admin',
            reference_id: rewardRequest.requestId,
            balance_before: 50,
            balance_after: 100,
            admin_actor_id: '99999999-0000-4000-8000-000000000001',
            actor_name: 'Fixture Administrator',
        },
    ],
}
