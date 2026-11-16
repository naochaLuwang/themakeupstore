import { expect, it } from 'vitest'
import { rewardCSV, rewardFilters, rewardTxFilters, validateCredit } from './reward-users'
import { rewardRequest } from './reward-users.test-fixtures'
it.each([0, -1, 1.5, NaN, Infinity, 100001])('rejects invalid credit amounts %s', (amount) =>
    expect(() => validateCredit({ ...rewardRequest, amount })).toThrow('whole coins')
)
it('requires bounded reasons, UUIDs and a safe reviewed balance', () => {
    for (const note of ['', '  ', 'x'.repeat(501)])
        expect(() => validateCredit({ ...rewardRequest, note })).toThrow('reason')
    expect(() => validateCredit({ ...rewardRequest, userId: 'bad' })).toThrow('Invalid credit')
    expect(() => validateCredit({ ...rewardRequest, expectedBalance: NaN })).toThrow('Balance')
    expect(() => validateCredit({ ...rewardRequest, expectedBalance: 2147483640 })).toThrow('Balance')
    expect(() => validateCredit(rewardRequest)).not.toThrow()
})
it('combines search and zero filtering and clamps page input', () => {
    expect(
        rewardFilters({
            q: ' anita@example.test ',
            hideZero: '1',
            spent: 'spent',
            tier: 'gold',
            sort: 'pending',
            page: '-1',
        })
    ).toEqual({
        q: 'anita@example.test',
        hideZero: true,
        spent: 'spent',
        tier: 'gold',
        sort: 'pending',
        page: 1,
    })
})
it.each([{ tier: '__proto__' }, { spent: 'bad' }, { sort: 'DROP TABLE' }])(
    'rejects invalid filters %j',
    (filters) => expect(() => rewardFilters(filters)).toThrow('filters')
)
it.each([
    { from: '2026-02-30' },
    { from: '2026-11-14', to: '2026-11-13' },
    { type: 'bad' },
    { status: 'bad' },
])('rejects invalid transaction filters %j', (filters) => expect(() => rewardTxFilters(filters)).toThrow())
it('escapes CSV quotes and neutralizes spreadsheet formulas', () => {
    expect(
        rewardCSV([
            ['Name', 'Note'],
            ['Anita "Fixture"', '=HYPERLINK("bad")'],
        ])
    ).toContain('"Anita ""Fixture""","\'=HYPERLINK(""bad"")"')
})
