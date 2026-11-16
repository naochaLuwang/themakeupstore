import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import InventoryRegistryWrapper from './inventory-registry-wrapper'
import type { ProductData } from './inventory-registry-wrapper'

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; stock?: string }>
}) {
    const { supabase } = await requireAdmin()
    const params = await searchParams
    const search = typeof params.q === 'string' ? params.q.slice(0, 200) : ''
    const stock =
        params.stock === 'out' || params.stock === 'low' || params.stock === 'in' ? params.stock : 'all'

    async function loadProducts() {
        const products: ProductData[] = []
        let total = Infinity
        while (products.length < total) {
            const { data, error, count } = await supabase
                .from('products')
                .select(
                    `
                id,name,brand,thumbnail_url,product_categories(category_id),
                product_variants(id,sku,title,stock,price,discount_type,discount_value)
            `,
                    { count: 'exact' }
                )
                .order('name')
                .order('id')
                .range(products.length, products.length + 499)
                .returns<ProductData[]>()
            if (error || !data || (data.length === 0 && products.length < (count || 0)))
                throw new Error('Unable to load the complete inventory. Please try again.')
            products.push(...data)
            total = count ?? products.length
        }
        return products
    }
    const [categoryResult, productResult] = await Promise.allSettled([
        supabase.from('categories').select('id, name').order('name'),
        loadProducts(),
    ])
    const categories = categoryResult.status === 'fulfilled' ? categoryResult.value.data : []
    const failed =
        productResult.status === 'rejected' ||
        categoryResult.status === 'rejected' ||
        !!categoryResult.value.error

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-slate-900 text-2xl font-black tracking-tight">Inventory</h1>
                <p className="text-sm text-slate-500">Global stock and SKU management</p>
            </div>

            {failed ? (
                <div role="alert" className="rounded-2xl border bg-white p-6 space-y-3 text-sm">
                    <p className="text-red-600">Unable to load the complete inventory. Please try again.</p>
                    <Link
                        href={`/admin/inventory?${new URLSearchParams({ q: search, stock })}`}
                        className="font-medium underline"
                    >
                        Try again
                    </Link>
                </div>
            ) : (
                <InventoryRegistryWrapper
                    key={`${search}:${stock}`}
                    initialProducts={productResult.status === 'fulfilled' ? productResult.value : []}
                    categories={categories || []}
                    initialSearch={search}
                    initialStock={stock}
                />
            )}
        </div>
    )
}
