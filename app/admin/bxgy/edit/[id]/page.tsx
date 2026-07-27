import { createClient } from "@/utils/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BXGYForm } from "../../bxgy-form"

export default async function AdminBXGYEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [ruleRes, productsRes, categoriesRes, buyProductsRes, buyCategoriesRes, buyBrandsRes, getProductsRes] = await Promise.all([
        supabase
            .from('buy_x_get_y')
            .select('*')
            .eq('id', id)
            .single(),
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('bxgy_buy_products').select('product_id').eq('bxgy_id', id),
        supabase.from('bxgy_buy_categories').select('category_id').eq('bxgy_id', id),
        supabase.from('bxgy_buy_brands').select('brand').eq('bxgy_id', id),
        supabase.from('bxgy_get_products').select('product_id').eq('bxgy_id', id),
    ])

    if (!ruleRes.data) notFound()
    const rule = ruleRes.data

    const initialSelectedIds = {
        buy_product_ids: buyProductsRes.data?.map((r: any) => r.product_id) || [],
        buy_category_ids: buyCategoriesRes.data?.map((r: any) => r.category_id) || [],
        buy_brands: buyBrandsRes.data?.map((r: any) => r.brand) || [],
        get_product_ids: getProductsRes.data?.map((r: any) => r.product_id) || [],
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/bxgy" className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit BXGY Rule</h1>
                    <p className="text-sm text-slate-500">Update &ldquo;{rule.name}&rdquo;</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <BXGYForm
                    products={productsRes.data || []}
                    categories={categoriesRes.data || []}
                    initialData={rule}
                    initialSelectedIds={initialSelectedIds}
                />
            </div>
        </div>
    )
}
