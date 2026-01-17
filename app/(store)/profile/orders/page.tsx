// import { createClient } from "@/utils/supabase/server"
// import Link from "next/link"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { Package, ChevronRight, ShoppingBag, Calendar } from "lucide-react"

// export default async function OrdersHistoryPage() {
//     const supabase = await createClient()

//     // 1. Get current user
//     const { data: { user } } = await supabase.auth.getUser()

//     // 2. Fetch orders sorted by newest first
//     const { data: orders, error } = await supabase
//         .from("orders")
//         .select(`
//             id,
//             created_at,
//             status,
//             total,
//             order_items (count)
//         `)
//         .eq("user_id", user?.id)
//         .order("created_at", { ascending: false })

//     if (error) {
//         return <div className="py-20 text-center">Error loading orders. Please try again.</div>
//     }

//     return (
//         <div className="container mx-auto px-4 py-12 max-w-5xl">
//             <div className="flex flex-col gap-2 mb-10">
//                 <h1 className="text-3xl font-black tracking-tight text-slate-900">Your Orders</h1>
//                 <p className="text-slate-500 font-medium">Manage and track your recent purchases.</p>
//             </div>

//             {orders && orders.length > 0 ? (
//                 <div className="grid gap-6">
//                     {orders.map((order) => (
//                         <div
//                             key={order.id}
//                             className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow group"
//                         >
//                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//                                 {/* Order Metadata */}
//                                 <div className="flex gap-4 items-start">
//                                     <div className="bg-slate-100 p-3 rounded-xl hidden sm:block">
//                                         <Package className="w-6 h-6 text-slate-400" />
//                                     </div>
//                                     <div className="space-y-1">
//                                         <div className="flex items-center gap-2">
//                                             <span className="font-bold text-slate-900">
//                                                 Order #{order.id.slice(0, 8).toUpperCase()}
//                                             </span>
//                                             <Badge className={`text-[10px] px-2 py-0 uppercase font-black tracking-tighter ${order.status === 'delivered' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
//                                                 order.status === 'pending' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
//                                                     'bg-blue-100 text-blue-700 hover:bg-blue-100'
//                                                 }`}>
//                                                 {order.status}
//                                             </Badge>
//                                         </div>
//                                         <div className="flex items-center gap-3 text-sm text-slate-500">
//                                             <span className="flex items-center gap-1">
//                                                 <Calendar className="w-3 h-3" />
//                                                 {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
//                                             </span>
//                                             <span>•</span>
//                                             <span>{order.order_items[0].count} Items</span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Order Value & Action */}
//                                 <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 pt-4 md:pt-0">
//                                     <div className="text-right">
//                                         <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Total Amount</p>
//                                         <p className="text-xl font-black text-slate-900">₹{order.total.toLocaleString('en-IN')}</p>
//                                     </div>
//                                     <Button asChild variant="ghost" className="rounded-xl group-hover:bg-slate-100">
//                                         <Link href={`/profile/orders/${order.id}`}>
//                                             View Details <ChevronRight className="ml-1 w-4 h-4" />
//                                         </Link>
//                                     </Button>
//                                 </div>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             ) : (
//                 /* EMPTY STATE */
//                 <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//                     <div className="bg-white p-6 rounded-full shadow-sm mb-6">
//                         <ShoppingBag className="w-12 h-12 text-slate-300" />
//                     </div>
//                     <h3 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h3>
//                     <p className="text-slate-500 mb-8 max-w-xs text-center">
//                         Looks like you haven't placed any orders. Start shopping to see them here!
//                     </p>
//                     <Button asChild className="bg-black text-white px-8 py-6 rounded-2xl">
//                         <Link href="/shop">Start Shopping</Link>
//                     </Button>
//                 </div>
//             )}
//         </div>
//     )
// }

import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, ChevronRight, ShoppingBag, Calendar, ArrowRight } from "lucide-react"

export default async function OrdersHistoryPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            id,
            created_at,
            status,
            total,
            order_items (count)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Failed to sync your collection.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white min-h-screen text-slate-900">
            <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">

                {/* HEADER */}
                <div className="flex flex-col space-y-2 mb-16 border-b border-slate-100 pb-10">
                    <h1 className="text-3xl font-medium tracking-tight">Order History</h1>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-[0.2em]">
                        Archived purchases & current tracking
                    </p>
                </div>

                {orders && orders.length > 0 ? (
                    <div className="space-y-0 border-t border-slate-100">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={`/profile/orders/${order.id}`}
                                className="group flex flex-col md:flex-row md:items-center justify-between py-10 border-b border-slate-100 hover:bg-slate-50/50 transition-all px-2"
                            >
                                {/* LEFT: METADATA */}
                                <div className="flex flex-col space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[13px] font-medium tracking-tight">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${order.status === 'delivered' ? 'border-emerald-200 text-emerald-600' :
                                            order.status === 'cancelled' ? 'border-red-100 text-red-400' : 'border-slate-900 text-black'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <span>{order.order_items[0].count} Items</span>
                                    </div>
                                </div>

                                {/* RIGHT: PRICE & ACTION */}
                                <div className="flex items-center justify-between md:justify-end gap-12 mt-6 md:mt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1">Amount</p>
                                        <p className="text-xl font-light tracking-tighter italic">₹{order.total.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                        Details <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    /* REDESIGNED EMPTY STATE */
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-8">
                            <ShoppingBag className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                        </div>
                        <h3 className="text-lg font-medium tracking-tight mb-2">No past acquisitions</h3>
                        <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] mb-10 max-w-[280px] leading-relaxed">
                            Your wardrobe is waiting for its first daciana piece.
                        </p>
                        <Button asChild className="bg-black text-white rounded-none px-10 h-14 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all group">
                            <Link href="/shop" className="flex items-center">
                                Start Shopping
                                <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}