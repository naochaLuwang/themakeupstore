import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Gift } from "lucide-react"
import { FreeGiftStatusToggle, DeleteFreeGiftButton } from "@/components/admin/PromoControls"
import Link from "next/link"

export default async function AdminFreeGiftsPage() {
    const supabase = await createClient()
    const { data: rules } = await supabase
        .from('free_gifts')
        .select('*, gift_product:products!free_gifts_gift_product_id_fkey(name, thumbnail_url), gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name, image_url)')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Free Gifts</h1>
                    <p className="text-sm text-slate-500">Automatic free gift rules based on cart conditions</p>
                </div>
                <Link href="/admin/free-gifts/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Rule
                </Link>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Rule Name</th>
                            <th className="py-4 px-6 text-left">Gift Product</th>
                            <th className="py-4 px-6 text-left">Trigger</th>
                            <th className="py-4 px-6 text-left">Usage / Expiry</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rules?.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No free gift rules yet.</td></tr>
                        ) : (
                            rules?.map((rule) => (
                                <tr key={rule.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            <Gift className="w-4 h-4 text-purple-500" /> {rule.name}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">Qty: {rule.gift_quantity}</div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-700">{rule.gift_product_ref?.name || rule.gift_product?.name || 'N/A'}</span>
                                        {rule.gift_product_ref_id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold uppercase">gift</span>}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                            {rule.trigger_type.replace('_', ' ')}
                                        </span>
                                        {rule.trigger_type === 'cart_total' && (
                                            <div className="text-xs text-slate-400 mt-1">₹{rule.trigger_threshold} min</div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 space-y-1 text-sm">
                                        <div className="text-slate-600">{rule.used_count} / {rule.usage_limit || '∞'} used</div>
                                        <div className="text-slate-500 text-xs">
                                            {rule.starts_at ? new Date(rule.starts_at).toLocaleDateString() : 'Active now'}
                                            {rule.expires_at ? ` — ${new Date(rule.expires_at).toLocaleDateString()}` : ''}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <FreeGiftStatusToggle id={rule.id} isActive={rule.is_active} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/free-gifts/edit/${rule.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <DeleteFreeGiftButton id={rule.id} />
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
