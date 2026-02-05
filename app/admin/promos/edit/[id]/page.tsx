import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { PromoForm } from "../../promo-form"
import { getPromoUsageHistory } from "@/app/actions/promo"
import { Clock, ShoppingBag } from "lucide-react"

// In Next.js 15, params is a Promise
interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPromoPage({ params }: PageProps) {
    // 1. Unwrap the params promise
    const { id } = await params;

    const supabase = await createClient()

    // 2. Fetch promo with relations
    const { data: promo } = await supabase
        .from('promo_codes')
        .select(`*, promo_code_products(product_id), promo_code_categories(category_id)`)
        .eq('id', id) // Used the unwrapped id
        .single()

    if (!promo) notFound()

    // 3. Parallel fetch for targeting data and usage history
    const [products, categories, history] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        getPromoUsageHistory(id)
    ])

    const initialSelectedIds = promo.apply_to === 'specific_products'
        ? promo.promo_code_products.map((p: any) => p.product_id)
        : promo.promo_code_categories.map((c: any) => c.category_id)

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Manage Promo</h1>
                <p className="text-slate-500 font-medium">
                    Update settings or track performance for <span className="text-slate-900 font-bold">{promo.code}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <PromoForm
                        products={products.data || []}
                        categories={categories.data || []}
                        initialData={promo}
                        initialSelectedIds={initialSelectedIds}
                    />
                </div>

                {/* Usage History Sidebar */}
                <div className="space-y-6">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Recent Redemptions
                        </h3>

                        {history && history.length > 0 ? (
                            <div className="space-y-4">
                                {history.map((usage: any) => (
                                    <div key={usage.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase truncate max-w-[120px]">
                                                {usage.user_name || "User"}
                                            </span>
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                ₹{usage.order_total}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[9px] text-slate-400 font-bold uppercase">
                                            <span className="flex items-center gap-1">
                                                <ShoppingBag className="w-2.5 h-2.5" /> #{usage.order_id?.slice(0, 8)}
                                            </span>
                                            <span>{new Date(usage.redeemed_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 font-medium italic">No redemptions yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}