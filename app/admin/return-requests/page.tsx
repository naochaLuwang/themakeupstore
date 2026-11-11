import { createClient } from "@/utils/supabase/server"
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Banknote,
    ExternalLink,
    Search
} from "lucide-react"
import { updateReturnStatus, markRefunded } from "./actions"
import Link from "next/link"

const STATUS_STYLES: Record<string, { label: string; icon: React.ReactNode; bg: string; dot: string }> = {
    pending: {
        label: "Pending",
        icon: <AlertTriangle className="w-4 h-4 stroke-[1.5]" />,
        bg: "bg-amber-50 text-amber-700",
        dot: "bg-amber-400",
    },
    approved: {
        label: "Approved",
        icon: <CheckCircle className="w-4 h-4 stroke-[1.5]" />,
        bg: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-400",
    },
    rejected: {
        label: "Rejected",
        icon: <XCircle className="w-4 h-4 stroke-[1.5]" />,
        bg: "bg-red-50 text-red-700",
        dot: "bg-red-400",
    },
    refunded: {
        label: "Refunded",
        icon: <Banknote className="w-4 h-4 stroke-[1.5]" />,
        bg: "bg-blue-50 text-blue-700",
        dot: "bg-blue-400",
    },
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    })
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
    })
}

export default async function ReturnRequestsPage() {
    const supabase = await createClient()

    const { data: requests } = await supabase
        .from("return_requests")
        .select(`
            *,
            return_status_logs(id, status, note, created_at),
            orders(shipping_address, payment_method, razorpay_payment_id),
            products(name, thumbnail_url)
        `)
        .order("created_at", { ascending: false })
        .limit(500)

    const pendingCount = requests?.filter(r => r.status === "pending").length || 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-slate-900 text-2xl font-black tracking-tight">Return Requests</h1>
                    <p className="text-sm text-slate-500">Manage customer return requests and process refunds.</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-medium text-slate-500">Total</span>
                        <span className="text-lg font-semibold text-slate-900 tabular-nums">{requests?.length || 0}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-medium text-slate-500">Pending</span>
                        <span className="text-lg font-semibold text-amber-600 tabular-nums">{pendingCount}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Customer</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Product</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Reason</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Status</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Payment</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Transaction ID</th>
                            <th className="py-3.5 px-5 text-left text-xs font-semibold tracking-normal text-slate-500">Submitted</th>
                            <th className="py-3.5 px-5 text-right text-xs font-semibold tracking-normal text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(!requests || requests.length === 0) && (
                            <tr>
                                <td colSpan={8} className="py-16 text-center tabular-nums">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertTriangle className="w-8 h-8 text-slate-200 stroke-[1.5]" />
                                        <p className="text-sm text-slate-500">No return requests yet.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {requests?.map((req) => {
                            const addr = (req.orders?.shipping_address as any) || {}
                            const style = STATUS_STYLES[req.status] || STATUS_STYLES.pending
                            const images: string[] = req.images || []

                            return (
                                <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-5 tabular-nums">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                                                {(addr.full_name || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{addr.full_name || "Unknown"}</p>
                                                {addr.phone && (
                                                    <p className="text-xs text-slate-500">{addr.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-5 tabular-nums">
                                        <div className="flex items-center gap-3">
                                            {req.products?.thumbnail_url ? (
                                                <img src={req.products.thumbnail_url} alt={req.products?.name || "Return item photo"} className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0" loading="lazy" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                                                    {req.products?.name || "Unknown"}
                                                </p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                                    #{req.id.split("-")[0]}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-5 max-w-[260px] tabular-nums">
                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{req.reason}</p>
                                    </td>

                                    <td className="py-4 px-5 tabular-nums">
                                        <div className="flex flex-col gap-2">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${style.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                {style.label}
                                            </div>
                                            {images.length > 0 && (
                                                <div className="flex gap-1">
                                                    {images.slice(0, 3).map((url: string, i: number) => (
                                                        <a
                                                            key={i}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-7 h-7 rounded border border-slate-200 overflow-hidden block bg-slate-50 hover:ring-2 hover:ring-slate-300 transition-colors"
                                                        >
                                                            <img src={url} alt="Return item photo" className="w-full h-full object-cover" loading="lazy" />
                                                        </a>
                                                    ))}
                                                    {images.length > 3 && (
                                                        <span className="text-xs text-slate-500 font-medium self-center">+{images.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="py-4 px-5 tabular-nums">
                                        <span className="text-xs font-medium text-slate-700">
                                            {req.orders?.payment_method === "razorpay" ? "Razorpay" : req.orders?.payment_method || "—"}
                                        </span>
                                    </td>

                                    <td className="py-4 px-5 align-middle tabular-nums">
                                        {req.status === "approved" ? (
                                            <form action={markRefunded} className="flex items-center gap-2">
                                                <input type="hidden" name="id" value={req.id} />
                                                <input
                                                    name="transaction_id"
                                                    placeholder="Enter transaction ID..."
                                                    required
                                                    className="w-36 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-colors"
                                                />
                                                <button
                                                    type="submit"
                                                    className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-center text-slate-700 hover:bg-blue-100 transition-colors shrink-0"
                                                    title="Mark as Refunded"
                                                >
                                                    <Banknote className="w-4 h-4 stroke-[1.5]" />
                                                </button>
                                            </form>
                                        ) : req.transaction_id ? (
                                            <code className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                {req.transaction_id}
                                            </code>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>

                                    <td className="py-4 px-5 whitespace-nowrap tabular-nums">
                                        <p className="text-sm text-slate-600">{formatDate(req.created_at)}</p>
                                        <p className="text-xs text-slate-500">{formatTime(req.created_at)}</p>
                                    </td>

                                    <td className="py-4 px-5 tabular-nums">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/return-requests/${req.id}`}
                                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4 stroke-[1.5]" />
                                            </Link>
                                            {req.status === "pending" && (
                                                <>
                                                    <form action={updateReturnStatus}>
                                                        <input type="hidden" name="id" value={req.id} />
                                                        <input type="hidden" name="status" value="approved" />
                                                        <button
                                                            type="submit"
                                                            className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-4 h-4 stroke-[1.5]" />
                                                        </button>
                                                    </form>
                                                    <form action={updateReturnStatus}>
                                                        <input type="hidden" name="id" value={req.id} />
                                                        <input type="hidden" name="status" value="rejected" />
                                                        <button
                                                            type="submit"
                                                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4 stroke-[1.5]" />
                                                        </button>
                                                    </form>
                                                </>
                                            )}

                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>


        </div>
    )
}
