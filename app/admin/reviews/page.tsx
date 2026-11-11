import { createClient } from "@/utils/supabase/server"
import { Star, Trash2, XCircle, ShieldCheck } from "lucide-react"
import { deleteReview, toggleVerification, approveReview } from "./actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function ReviewModeratorPage() {
    const supabase = await createClient()

    // Fetch reviews - No changes here, but ensure your SQL policy allows this select
    const { data: reviews } = await supabase
        .from("product_reviews")
        .select(`
            *,
            products(name, thumbnail_url)
        `)
        .order("is_approved", { ascending: true })
        .order("created_at", { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-slate-900 text-2xl font-black tracking-tight">Review Moderator</h1>
                    <p className="text-sm text-slate-500">Curate client feedback and manage verification status.</p>
                </div>
                <div className="flex gap-6">
                    <div className="text-right">
                        <p className="text-xs text-slate-500 font-medium">Total</p>
                        <p className="text-xl font-semibold">{reviews?.length || 0}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-amber-500 font-medium">Pending</p>
                        <p className="text-xl font-semibold">{reviews?.filter(r => !r.is_approved).length || 0}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-semibold text-slate-600 tracking-normal">
                            <th className="py-4 px-6 text-left">Product</th>
                            <th className="py-4 px-6 text-left">Review Detail</th>
                            <th className="py-4 px-6 text-left">Author Info</th>
                            <th className="py-4 px-6 text-left">Visibility</th>
                            <th className="py-4 px-6 text-left">Trust Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {reviews?.map((review) => (
                            <tr
                                key={review.id}
                                className={`text-sm transition-colors ${!review.is_approved ? 'bg-amber-50/30' : 'hover:bg-slate-50'}`}
                            >
                                <td className="py-4 px-6 max-w-[180px] tabular-nums">
                                    <div className="font-semibold text-slate-900 truncate">{review.products?.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">ID: {review.id.split('-')[0]}</div>
                                </td>

                                <td className="py-4 px-6 tabular-nums">
                                    <div className="flex gap-0.5 mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 stroke-[1.5] ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                                        ))}
                                    </div>
                                    <div className="max-w-[320px]">
                                        <p className="font-semibold text-sm text-slate-900 mb-1">{review.title}</p>
                                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">"{review.comment}"</p>
                                    </div>
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap tabular-nums">
                                    <div className="font-medium text-sm text-slate-900">{review.user_name}</div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </div>
                                </td>

                                <td className="py-4 px-6 tabular-nums">
                                    {review.is_approved ? (
                                        <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-none">
                                            Published
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
                                            Pending
                                        </Badge>
                                    )}
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap tabular-nums">
                                    {review.is_verified ? (
                                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                            <ShieldCheck className="w-4 h-4 stroke-[1.5]" /> Verified
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                            <XCircle className="w-4 h-4 stroke-[1.5]" /> Standard
                                        </span>
                                    )}
                                </td>

                                <td className="py-4 px-6 text-right tabular-nums">
                                    <div className="flex justify-end items-center gap-2">
                                        {!review.is_approved && (
                                            <form action={approveReview}>
                                                <input type="hidden" name="id" value={review.id} />
                                                <Button type="submit" size="sm" className="h-8 bg-slate-900 hover:bg-black text-white text-xs font-medium px-4 rounded-lg">
                                                    Approve
                                                </Button>
                                            </form>
                                        )}

                                        <form action={toggleVerification.bind(null, review.id, review.is_verified)}>
                                            <Button variant="outline" size="sm" className="h-8 text-xs font-medium border border-slate-200 rounded-lg">
                                                {review.is_verified ? "Unverify" : "Verify User"}
                                            </Button>
                                        </form>

                                        <form action={deleteReview.bind(null, review.id)}>
                                            <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4 stroke-[1.5]" />
                                            </Button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}