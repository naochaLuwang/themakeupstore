import { createClient } from "@/utils/supabase/server"
import {
    CheckCircle,
    XCircle,
    RotateCcw,
    AlertTriangle,
    Banknote,
    ExternalLink,
} from "lucide-react"
import { updateReturnStatus, markRefunded } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-blue-100 text-blue-800 border-blue-200",
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <AlertTriangle className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
    refunded: <Banknote className="w-3 h-3" />,
}

export default async function ReturnRequestsPage() {
    const supabase = await createClient()

    const { data: requests } = await supabase
        .from("return_requests")
        .select(`
            *,
            return_status_logs(id, status, note, created_at),
            orders(shipping_address),
            products(name, thumbnail_url)
        `)
        .order("created_at", { ascending: false })

    const counts = {
        total: requests?.length || 0,
        pending: requests?.filter(r => r.status === "pending").length || 0,
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Return Requests</h1>
                    <p className="text-sm text-slate-500">Manage customer return requests and process refunds.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-xl font-bold">{counts.total}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending</p>
                        <p className="text-xl font-bold">{counts.pending}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="p-4">Customer</th>
                            <th className="p-4">Product</th>
                            <th className="p-4">Reason</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                                    No return requests yet.
                                </td>
                            </tr>
                        )}
                        {requests?.map((req) => {
                            const addr = (req.orders?.shipping_address as any) || {}
                            return (
                                <tr
                                    key={req.id}
                                    className={`text-sm transition-colors ${req.status === 'pending' ? 'bg-amber-50/30' : 'hover:bg-slate-50'}`}
                                >
                                    {/* Customer */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                                            {addr.full_name || "Unknown"}
                                        </div>
                                        {addr.phone && (
                                            <div className="text-[10px] text-slate-400 font-medium">{addr.phone}</div>
                                        )}
                                    </td>

                                    {/* Product */}
                                    <td className="p-4 max-w-[200px]">
                                        <div className="flex items-center gap-3">
                                            {req.products?.thumbnail_url && (
                                                <img
                                                    src={req.products.thumbnail_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded object-cover bg-slate-100"
                                                />
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-900 text-xs truncate">
                                                    {req.products?.name || "Unknown"}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono uppercase">
                                                    ID: {req.id.split("-")[0]}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Reason */}
                                    <td className="p-4 max-w-[280px]">
                                        <p className="text-slate-700 text-xs leading-relaxed line-clamp-2">
                                            {req.reason}
                                        </p>
                                    </td>

                                    {/* Status */}
                                    <td className="p-4">
                                        <Badge
                                            variant="outline"
                                            className={`gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[req.status] || "bg-slate-100 text-slate-600"}`}
                                        >
                                            {STATUS_ICONS[req.status]}
                                            {req.status}
                                        </Badge>
                                        {req.images?.length > 0 && (
                                            <div className="flex gap-1.5 mt-2">
                                                {req.images.map((url: string, i: number) => (
                                                    <a
                                                        key={i}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden block bg-slate-50 hover:ring-2 hover:ring-slate-300 transition-all"
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="text-xs text-slate-600">
                                            {new Date(req.created_at).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {new Date(req.created_at).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4">
                                        <div className="flex flex-col gap-2 items-end">
                                            <Link
                                                href={`/admin/return-requests/${req.id}`}
                                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View Details
                                            </Link>
                                            {req.status === "pending" && (
                                                <form className="flex gap-2">
                                                    <input type="hidden" name="id" value={req.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="default"
                                                        size="sm"
                                                        name="status"
                                                        value="approved"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider h-8 px-3 gap-1.5"
                                                        formAction={updateReturnStatus}
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        size="sm"
                                                        name="status"
                                                        value="rejected"
                                                        className="text-red-600 border-red-200 hover:bg-red-50 text-[10px] font-black uppercase tracking-wider h-8 px-3 gap-1.5"
                                                        formAction={updateReturnStatus}
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        Reject
                                                    </Button>
                                                </form>
                                            )}
                                            {req.status === "approved" && (
                                                <form>
                                                    <input type="hidden" name="id" value={req.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 text-[10px] font-black uppercase tracking-wider h-8 px-3 gap-1.5"
                                                        formAction={markRefunded}
                                                    >
                                                        <Banknote className="w-3 h-3" />
                                                        Mark Refunded
                                                    </Button>
                                                </form>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Timeline */}
            {requests && requests.some(r => r.return_status_logs?.length > 0) && (
                <details className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <summary className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50">
                        Activity Timeline ({requests.reduce((acc, r) => acc + (r.return_status_logs?.length || 0), 0)} entries)
                    </summary>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {requests
                            ?.flatMap(r =>
                                (r.return_status_logs || []).map((log: any) => ({
                                    ...log,
                                    productName: r.products?.name || "Unknown",
                                }))
                            )
                            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 50)
                            .map((entry: any) => (
                                <div key={entry.id} className="p-3 flex items-center gap-3 text-xs">
                                    <Badge
                                        variant="outline"
                                        className={`gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[entry.status] || "bg-slate-100 text-slate-600"}`}
                                    >
                                        {entry.status}
                                    </Badge>
                                    <span className="text-slate-600 font-medium">{entry.productName}</span>
                                    {entry.note && (
                                        <span className="text-slate-400 italic">— {entry.note}</span>
                                    )}
                                    <span className="text-slate-400 ml-auto text-[10px]">
                                        {new Date(entry.created_at).toLocaleString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            ))}
                    </div>
                </details>
            )}
        </div>
    )
}
