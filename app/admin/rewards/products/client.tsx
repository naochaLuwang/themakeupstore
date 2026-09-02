"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, Plus, ArrowUpRight, Trash2, Loader2 } from "lucide-react"
import { deleteRewardProduct } from "@/app/actions/rewards-admin"
import { toast } from "sonner"

export function RewardProductsClient({ products }: { products: any[] }) {
    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this reward product?")) return
        setDeletingId(id)
        const res = await deleteRewardProduct(id)
        if (res.success) {
            toast.success("Reward product deleted")
            router.refresh()
        } else {
            toast.error(res.message || "Failed to delete")
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Reward Products</h1>
                    <p className="text-sm text-slate-500">{products.length} total products</p>
                </div>
                <Link href="/admin/rewards/products/new" className="inline-flex items-center gap-2 rounded-xl h-10 px-4 bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all">
                    <Plus className="w-4 h-4" /> Add Product
                </Link>
            </div>

            {products.length > 0 ? (
                <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <th className="py-4 px-6 text-left">Product</th>
                                <th className="py-4 px-6 text-right">Cost (Coins)</th>
                                <th className="py-4 px-6 text-right">Stock</th>
                                <th className="py-4 px-6 text-center">Type</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{p.product_name}</div>
                                            <div className="text-xs text-slate-400 truncate max-w-xs">{p.description || "No description"}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="text-sm font-black text-slate-900">{p.coins_required.toLocaleString()}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`text-sm font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                            {p.stock}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                                            {p.reward_type || "product"}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                                            p.active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"
                                        }`}>
                                            {p.active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <Link href={`/admin/rewards/products/edit/${p.id}`} className="rounded-lg h-8 w-8 border border-slate-200 hover:bg-slate-100 transition-all inline-flex items-center justify-center text-slate-400">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                disabled={deletingId === p.id}
                                                className="rounded-lg h-8 w-8 border border-red-200 hover:bg-red-50 transition-all inline-flex items-center justify-center text-red-400 disabled:opacity-50"
                                            >
                                                {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
                    <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No reward products yet</p>
                    <Link href="/admin/rewards/products/new" className="text-xs text-rose-500 hover:text-rose-600 mt-2 inline-block">Add your first reward</Link>
                </div>
            )}
        </div>
    )
}