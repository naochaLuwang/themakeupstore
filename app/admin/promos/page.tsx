import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Ticket } from "lucide-react"
import { PromoStatusToggle, DeletePromoButton } from "@/components/admin/PromoControls"
import Link from "next/link"

export default async function AdminPromosPage() {
    const supabase = await createClient()
    const { data: promos } = await supabase.from('promo_codes').select('id, code, apply_to, discount_type, discount_value, min_order_amount, used_count, usage_limit, starts_at, expires_at, is_active').order('created_at', { ascending: false }).limit(500)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-slate-900 text-2xl font-black tracking-tight">Promo Management</h1>
                    <p className="text-sm text-slate-500">Manage and monitor active discount rules</p>
                </div>
                <Link href="/admin/promos/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4 stroke-[1.5]" /> New Rule
                </Link>
            </div>

            <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-semibold text-slate-600 tracking-normal">
                            <th className="py-4 px-6 text-left">Offer Detail</th>
                            <th className="py-4 px-6 text-left">Discount</th>
                            <th className="py-4 px-6 text-left">Usage / Expiry</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {promos?.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-medium tabular-nums">No promo codes found.</td></tr>
                        ) : (
                            promos?.map((promo) => (
                                <tr key={promo.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="py-4 px-6 tabular-nums">
                                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-slate-700 stroke-[1.5]" /> {promo.code}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {promo.apply_to?.replace('_', ' ') || 'ALL'}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 font-semibold text-slate-900 tabular-nums">
                                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                                        <div className="text-xs text-slate-500 font-medium">Min. order ₹{promo.min_order_amount}</div>
                                    </td>
                                    <td className="py-4 px-6 space-y-1 text-sm tabular-nums">
                                        <div className="text-slate-600">{promo.used_count} / {promo.usage_limit || '∞'} used</div>
                                        <div className="text-slate-500 text-xs">
                                            {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString() : 'Active now'}
                                            {promo.expires_at ? ` — ${new Date(promo.expires_at).toLocaleDateString()}` : ''}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 tabular-nums">
                                        <PromoStatusToggle id={promo.id} isActive={promo.is_active} />
                                    </td>
                                    <td className="py-4 px-6 tabular-nums">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/promos/edit/${promo.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500 inline-flex items-center justify-center">
                                                <Edit3 className="w-4 h-4 stroke-[1.5]" />
                                            </Link>
                                            <DeletePromoButton id={promo.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}