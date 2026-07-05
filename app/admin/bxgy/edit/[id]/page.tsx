import { createClient } from "@/utils/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BXGYForm } from "../../bxgy-form"

export default async function AdminBXGYEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [ruleRes, productsRes, categoriesRes] = await Promise.all([
        supabase
            .from('buy_x_get_y')
            .select('*, buy_products:bxgy_buy_products(product_id), buy_categories:bxgy_buy_categories(category_id), buy_brands:bxgy_buy_brands(brand), get_products:bxgy_get_products(product_id)')
            .eq('id', id)
            .single(),
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
    ])

    if (!ruleRes.data) notFound()
    const rule = ruleRes.data

    const initialSelectedIds = {
        buy_product_ids: rule.buy_products?.map((r: any) => r.product_id) || [],
        buy_category_ids: rule.buy_categories?.map((r: any) => r.category_id) || [],
        buy_brands: rule.buy_brands?.map((r: any) => r.brand) || [],
        get_product_ids: rule.get_products?.map((r: any) => r.product_id) || [],
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
