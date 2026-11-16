import { expect, it } from 'vitest'
import { purchaseCSV, purchaseFilters, validatePurchaseDraft } from './purchases'
import { purchaseDetail, purchaseDraft } from './purchases.test-fixtures'

it('calculates exact paise totals and permits explicitly free supplier items', () => {
    expect(
        validatePurchaseDraft({
            ...purchaseDraft,
            items: [{ ...purchaseDraft.items[0], quantity: 3, unit_cost: 0.29 }],
        })
    ).toBe(0.87)
    expect(
        validatePurchaseDraft({ ...purchaseDraft, items: [{ ...purchaseDraft.items[0], unit_cost: 0 }] })
    ).toBe(0)
})
it.each([0, -1, 1.5, NaN, Infinity, 1000001])('rejects invalid quantity %s', (quantity) => {
    expect(() =>
        validatePurchaseDraft({ ...purchaseDraft, items: [{ ...purchaseDraft.items[0], quantity }] })
    ).toThrow('Quantities')
})
it.each([-1, NaN, Infinity, 12.345, 10000001])('rejects invalid cost %s', (unit_cost) => {
    expect(() =>
        validatePurchaseDraft({ ...purchaseDraft, items: [{ ...purchaseDraft.items[0], unit_cost }] })
    ).toThrow('unit cost')
})
it('rejects duplicate shades, empty purchases and invalid delivery dates', () => {
    expect(() =>
        validatePurchaseDraft({ ...purchaseDraft, items: [...purchaseDraft.items, ...purchaseDraft.items] })
    ).toThrow('once')
    expect(() => validatePurchaseDraft({ ...purchaseDraft, items: [] })).toThrow('Add between')
    expect(() => validatePurchaseDraft({ ...purchaseDraft, expected_on: '2026-02-30' })).toThrow('date')
})
it.each([{ from: '2026-02-30' }, { from: '2026-11-14', to: '2026-11-13' }, { status: '__proto__' }])(
    'rejects invalid history filters %j',
    (filters) => {
        expect(() => purchaseFilters(filters)).toThrow()
    }
)
it('preserves actual filter scope and clamps invalid pages', () => {
    expect(
        purchaseFilters({ q: '  PO-1 ', status: 'partial', from: '2026-11-13', to: '2026-11-13', page: '-1' })
    ).toEqual({ q: 'PO-1', status: 'partial', from: '2026-11-13', to: '2026-11-13', page: 1 })
})
it('escapes CSV quotes and neutralizes supplier spreadsheet formulas', () => {
    const csv = purchaseCSV([
        {
            ...purchaseDetail,
            reference_number: 'REF "one"',
            supplier: { ...purchaseDetail.supplier, name: '=HYPERLINK("bad")' },
        },
    ])
    expect(csv).toContain('"REF ""one"""')
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"')
    expect(csv).toContain('13 Nov 2026')
    expect(csv).toContain('"1250"')
})
