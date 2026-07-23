import { createClient } from "@/utils/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FreeGiftForm } from "../../free-gift-form"

export default async function AdminFreeGiftEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [ruleRes, productsRes, giftProductsRes, categoriesRes] = await Promise.all([
        supabase
            .from('free_gifts')
            .select('*, qualifying_products:free_gift_products(product_id), qualifying_categories:free_gift_categories(category_id), qualifying_brands:free_gift_brands(brand)')
            .eq('id', id)
            .single(),
        supabase.from('products').select('id, name').order('name'),
        (async () => { try { return await supabase.from('gift_products').select('id, name').eq('is_active', true).order('name') } catch { return { data: [] } } })(),
        supabase.from('categories').select('id, name').order('name'),
    ])

    if (!ruleRes.data) notFound()
    const rule = ruleRes.data

    const initialSelectedIds = {
        product_ids: rule.qualifying_products?.map((r: any) => r.product_id) || [],
        category_ids: rule.qualifying_categories?.map((r: any) => r.category_id) || [],
        brands: rule.qualifying_brands?.map((r: any) => r.brand) || [],
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/free-gifts" className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Free Gift Rule</h1>
                    <p className="text-sm text-slate-500">Update &ldquo;{rule.name}&rdquo;</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <FreeGiftForm
                    products={productsRes.data || []}
                    giftProducts={giftProductsRes.data || []}
                    categories={categoriesRes.data || []}
                    initialData={rule}
                    initialSelectedIds={initialSelectedIds}
                />
            </div>
        </div>
    )
}
