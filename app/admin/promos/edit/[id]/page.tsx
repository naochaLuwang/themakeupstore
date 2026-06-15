import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { PromoForm } from "../../promo-form"
import { getPromoUsageHistory } from "@/app/actions/promo"
import { ChevronLeft, Clock, ShoppingBag } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPromoPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient()

    const { data: promo } = await supabase
        .from('promo_codes')
        .select(`*, promo_code_products(product_id), promo_code_categories(category_id)`)
        .eq('id', id)
        .single()

    if (!promo) notFound()

    const [products, categories, history] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        getPromoUsageHistory(id)
    ])

    const initialSelectedIds = promo.apply_to === 'specific_products'
        ? promo.promo_code_products.map((p: any) => p.product_id)
        : promo.promo_code_categories.map((c: any) => c.category_id)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/promos"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Manage Promo</h1>
                    <p className="text-sm text-slate-500">Update settings or track performance for <span className="font-semibold">{promo.code}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
                    <PromoForm
                        products={products.data || []}
                        categories={categories.data || []}
                        initialData={promo}
                        initialSelectedIds={initialSelectedIds}
                    />
                </div>

                <div className="rounded-2xl border bg-slate-50 p-6 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Recent Redemptions
                    </h3>

                    {history && history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((usage: any) => (
                                <div key={usage.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-medium truncate max-w-[120px]">
                                            {usage.user_name || "User"}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                            ₹{usage.order_total}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <ShoppingBag className="w-3 h-3" /> #{usage.order_id?.slice(0, 8)}
                                        </span>
                                        <span>{new Date(usage.redeemed_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No redemptions yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}