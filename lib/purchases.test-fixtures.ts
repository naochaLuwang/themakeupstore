import type { PurchaseDetail, PurchaseDirectory, PurchaseDraft, PurchaseProduct, Supplier } from './purchases'
export const purchaseSupplier: Supplier = {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Fixture Supplier',
    email: 'supplier@example.test',
    phone: '9876543210',
    address: 'Wangkhei, Imphal',
    contact_person: 'Anita',
}
export const purchaseProduct: PurchaseProduct = {
    variant_id: '40000000-0000-0000-0000-000000000001',
    product_id: '30000000-0000-0000-0000-000000000001',
    name: 'Lipstick',
    title: 'Rose',
    sku: 'LIP-ROSE',
    brand: 'FOREVER52',
    stock: 10,
    selling_price: 500,
    last_cost: 125,
    status: 'active',
}
export const purchaseDraft: PurchaseDraft = {
    supplier_id: purchaseSupplier.id,
    reference_number: 'PO-TEST',
    expected_on: '',
    notes: 'Supplier note',
    items: [{ variant_id: purchaseProduct.variant_id, quantity: 10, unit_cost: 125 }],
}
export const purchaseDetail: PurchaseDetail = {
    id: '60000000-0000-0000-0000-000000000001',
    reference_number: 'PO-TEST',
    supplier: purchaseSupplier,
    status: 'draft',
    total_cost: 1250,
    created_at: '2026-11-12T18:30:00Z',
    expected_on: null,
    version: 1,
    units: 10,
    received_units: 0,
    damaged_units: 0,
    notes: 'Supplier note',
    legacy_receipt: false,
    items: [
        {
            id: '80000000-0000-0000-0000-000000000001',
            variant_id: purchaseProduct.variant_id,
            product_id: purchaseProduct.product_id,
            name: purchaseProduct.name,
            title: purchaseProduct.title,
            sku: purchaseProduct.sku,
            quantity: 10,
            unit_cost: 125,
            received_quantity: 0,
            damaged_quantity: 0,
        },
    ],
    receipts: [],
    events: [],
}
export const purchaseDirectory: PurchaseDirectory = {
    orders: [purchaseDetail],
    total: 52,
    page: 2,
    totalPages: 3,
    summary: { value: 65000, open: 25, received: 100, damaged: 2 },
}
