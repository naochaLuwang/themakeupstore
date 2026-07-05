import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Zap } from "lucide-react"
import { BXGYStatusToggle, DeleteBXGYButton } from "@/components/admin/PromoControls"
import Link from "next/link"

export default async function AdminBXGYPage() {
    const supabase = await createClient()
    const { data: rules } = await supabase
        .from('buy_x_get_y')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Buy X Get Y</h1>
                    <p className="text-sm text-slate-500">Automatic BOGO and bundle promotions</p>
                </div>
                <Link href="/admin/bxgy/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Rule
                </Link>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Rule Name</th>
                            <th className="py-4 px-6 text-left">Buy Condition</th>
                            <th className="py-4 px-6 text-left">Get Reward</th>
                            <th className="py-4 px-6 text-left">Usage / Expiry</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rules?.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No BXGY rules yet.</td></tr>
                        ) : (
                            rules?.map((rule) => (
                                <tr key={rule.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-[#fc2779]" /> {rule.name}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                            Buy {rule.buy_quantity} ({rule.buy_type.replace('_', ' ')})
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-semibold bg-pink-50 text-pink-600 px-2 py-1 rounded-md">
                                            {rule.get_type === 'cheapest_free' ? 'Cheapest Free' : rule.get_discount_type === 'free' ? 'Free Product' : `${rule.get_discount_value}${rule.get_discount_type === 'percentage' ? '% off' : '₹ off'}`}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 space-y-1 text-sm">
                                        <div className="text-slate-600">{rule.used_count} / {rule.usage_limit || '∞'} used</div>
                                        <div className="text-slate-500 text-xs">
                                            {rule.starts_at ? new Date(rule.starts_at).toLocaleDateString() : 'Active now'}
                                            {rule.expires_at ? ` — ${new Date(rule.expires_at).toLocaleDateString()}` : ''}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <BXGYStatusToggle id={rule.id} isActive={rule.is_active} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/bxgy/edit/${rule.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <DeleteBXGYButton id={rule.id} />
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
