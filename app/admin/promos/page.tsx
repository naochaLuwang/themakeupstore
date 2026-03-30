import { createClient } from "@/utils/supabase/server"
import { Target, Plus, Calendar, Hash, Edit3, Ticket, Clock } from "lucide-react"
import { PromoStatusToggle, DeletePromoButton } from "@/components/admin/PromoControls"
import Link from "next/link"

export default async function AdminPromosPage() {
    const supabase = await createClient()
    const { data: promos } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })

    return (
        <div className="max-w-7xl mx-auto p-8">
            <header className="flex justify-between items-end mb-12 border-b border-slate-900 pb-4">
                <div className="space-y-1">
                    <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Promo Management</h1>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">Manage and monitor active discount rules</p>
                </div>
                <Link href="/admin/promos/new" className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                    <Plus className="w-3 h-3" /> New Rule
                </Link>
            </header>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-[10px] uppercase tracking-widest">
                    <thead className="bg-slate-50/50 text-slate-400">
                        <tr>
                            <th className="p-6 text-left font-black">Offer Detail</th>
                            <th className="p-6 text-left font-black">Discount</th>
                            <th className="p-6 text-left font-black">Usage / Expiry</th>
                            <th className="p-6 text-left font-black">Status</th>
                            <th className="p-6 text-right font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {promos?.length === 0 ? (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">No promo codes found.</td></tr>
                        ) : (
                            promos?.map((promo) => (
                                <tr key={promo.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="p-6">
                                        <div className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tighter flex items-center gap-2">
                                            <Ticket className="w-3 h-3 text-indigo-500" /> {promo.code}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase">
                                            <Target className="w-2.5 h-2.5" />
                                            {/* FIXED: Optional chaining and fallback for NULL values */}
                                            {promo.apply_to?.replace('_', ' ') || 'ALL'}
                                        </div>
                                    </td>
                                    <td className="p-6 font-black text-slate-900">
                                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                                        <div className="text-[8px] text-slate-400 font-bold">MIN. ORDER ₹{promo.min_order_amount}</div>
                                    </td>
                                    <td className="p-6 space-y-1 font-bold">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Hash className="w-2.5 h-2.5" /> {promo.used_count} / {promo.usage_limit || '∞'}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock className="w-2.5 h-2.5" /> {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString() : 'ACTIVE NOW'}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="w-2.5 h-2.5" /> {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'LIFETIME'}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <PromoStatusToggle id={promo.id} isActive={promo.is_active} />
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/promos/edit/${promo.id}`} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                                                <Edit3 className="w-3.5 h-3.5" />
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