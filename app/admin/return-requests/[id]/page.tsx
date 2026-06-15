import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Banknote,
    ExternalLink,
    Clock,
} from "lucide-react"
import { updateReturnStatus, markRefunded } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-blue-100 text-blue-800 border-blue-200",
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <AlertTriangle className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
    refunded: <Banknote className="w-4 h-4" />,
}

export default async function ReturnRequestDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: req } = await supabase
        .from("return_requests")
        .select(`
            *,
            return_status_logs(id, status, note, created_at),
            orders(
                id, status, total, shipping_price, shipping_address, created_at
            ),
            products(name, thumbnail_url)
        `)
        .eq("id", id)
        .single()

    if (!req) notFound()

    const addr = (req.orders?.shipping_address as any) || {}
    const images: string[] = req.images || []

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Back + Header */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/return-requests"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Return Requests
                </Link>
                <div className="flex items-center gap-3">
                    <Badge
                        variant="outline"
                        className={`gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider ${STATUS_COLORS[req.status] || "bg-slate-100 text-slate-600"}`}
                    >
                        {STATUS_ICONS[req.status]}
                        {req.status}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Left column: Product + Customer + Images */}
                <div className="col-span-2 space-y-6">
                    {/* Product Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Product</h2>
                        <div className="flex gap-4">
                            {req.products?.thumbnail_url && (
                                <Image
                                    src={req.products.thumbnail_url}
                                    alt={req.products.name || ""}
                                    width={80}
                                    height={80}
                                    className="rounded-lg object-cover bg-slate-100"
                                />
                            )}
                            <div>
                                <p className="font-bold text-slate-900">{req.products?.name || "Unknown"}</p>
                                {req.product_variant_id && (
                                    <p className="text-sm text-slate-500 mt-1">Variant ID: {req.product_variant_id.split("-")[0]}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">ID: {req.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Customer</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</p>
                                <p className="font-medium text-slate-900">{addr.full_name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                                <p className="font-medium text-slate-900">{addr.phone || "—"}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</p>
                                <p className="font-medium text-slate-900">
                                    {[addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ") || "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Return Reason</h2>
                        <p className="text-sm text-slate-700 leading-relaxed">{req.reason}</p>
                    </div>

                    {/* Images */}
                    {images.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                Proof Images ({images.length})
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {images.map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                                    >
                                        <Image
                                            src={url}
                                            alt={`Proof image ${i + 1}`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                            <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    {req.return_status_logs?.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Activity Timeline</h2>
                            <div className="space-y-4">
                                {req.return_status_logs
                                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                    .map((log: any, i: number) => (
                                        <div key={log.id} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        STATUS_COLORS[log.status]
                                                            ? "border-emerald-500 bg-emerald-100"
                                                            : "border-slate-300 bg-slate-100"
                                                    }`}
                                                />
                                                {i < req.return_status_logs.length - 1 && (
                                                    <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                                                )}
                                            </div>
                                            <div className="pb-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[log.status] || "bg-slate-100 text-slate-600"}`}
                                                    >
                                                        {log.status}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(log.created_at).toLocaleString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                </div>
                                                {log.note && (
                                                    <p className="text-sm text-slate-600 mt-1 ml-0.5">{log.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right column: Actions + Order Info */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    {req.status === "pending" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Actions</h2>
                            <div className="space-y-3">
                                <form action={updateReturnStatus}>
                                    <input type="hidden" name="id" value={req.id} />
                                    <input type="hidden" name="status" value="approved" />
                                    <Button type="submit" variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Approve Return
                                    </Button>
                                </form>
                                <form action={updateReturnStatus}>
                                    <input type="hidden" name="id" value={req.id} />
                                    <input type="hidden" name="status" value="rejected" />
                                    <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Reject Return
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {req.status === "approved" && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Initiate Refund</h2>
                            <form action={markRefunded} className="space-y-4">
                                <input type="hidden" name="id" value={req.id} />
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                                        Transaction ID <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        name="transaction_id"
                                        placeholder="e.g. TXN123456789"
                                        required
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all"
                                    />
                                </div>
                                <Button type="submit" variant="default" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Banknote className="w-4 h-4" />
                                    Mark as Refunded
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* Order Info */}
                    {req.orders && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Order Info</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Order ID</span>
                                    <span className="font-mono text-[11px] text-slate-900">{req.orders.id?.split("-")[0]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total</span>
                                    <span className="font-bold text-slate-900">₹{Math.round(req.orders.total || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Shipping</span>
                                    <span className="text-slate-900">{req.orders.shipping_price ? `₹${req.orders.shipping_price}` : "FREE"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Items</span>
                                    <span className="text-slate-900">—</span>
                                </div>
                                {req.transaction_id && (
                                    <div className="flex justify-between pt-2 border-t border-slate-100">
                                        <span className="text-slate-500">Transaction ID</span>
                                        <code className="text-[11px] font-mono text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded">
                                            {req.transaction_id}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Submitted Date */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Submitted</h2>
                        <p className="text-sm font-medium text-slate-900">
                            {new Date(req.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                        <p className="text-xs text-slate-500">
                            {new Date(req.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
