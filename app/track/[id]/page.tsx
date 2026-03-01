import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link";

// 1. Define the correct type for the async params
type tParams = Promise<{ id: string }>;

export default async function PublicTrackingPage(props: { params: tParams }) {
    // 2. Await the params before using 'id'
    const { id } = await props.params;

    const supabase = await createClient()

    // 3. Fetch only necessary status data for public view
    const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, created_at, shipping_label')
        .eq('id', id)
        .single()

    if (error || !order) return notFound()

    const steps = [
        { status: 'pending', label: 'Order Placed', icon: Clock },
        { status: 'processing', label: 'Processing', icon: Package },
        { status: 'shipped', label: 'In Transit', icon: Truck },
        { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ]

    const currentIndex = steps.findIndex(s => s.status === order.status)

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] border p-8 md:p-12 shadow-sm">
                <div className="flex-1 lg:flex-none">
                    <Link href="/" className="flex flex-col group min-w-fit">
                        <span className="text-xl md:text-2xl font-black font-daciana tracking-[0.15em] leading-none text-slate-900 group-hover:text-primary transition-colors uppercase">
                            THE MAKEUP STORE
                        </span>
                        <span className="text-[7px] md:text-[8px] font-bold tracking-[0.3em] text-slate-400 uppercase whitespace-nowrap mt-1">
                            WANGKHEI
                        </span>
                    </Link>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Track Order</h1>
                    <p className="text-slate-400 font-mono text-xs mt-2 uppercase">ID: {order.id}</p>
                </div>

                <div className="relative space-y-8">
                    {steps.map((step, idx) => {
                        const Icon = step.icon
                        const isCompleted = idx <= currentIndex
                        const isCurrent = idx === currentIndex
                        const isCancelled = order.status === 'cancelled'

                        return (
                            <div key={step.status} className="flex items-start gap-4 relative">
                                {idx !== steps.length - 1 && (
                                    <div className={`absolute left-5 top-10 w-0.5 h-10 ${idx < currentIndex ? 'bg-black' : 'bg-slate-100'
                                        }`} />
                                )}

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-black border-black text-white' : 'bg-white border-slate-100 text-slate-300'
                                    } ${isCurrent && !isCancelled ? 'ring-4 ring-slate-100' : ''}`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                <div className="pt-1">
                                    <p className={`font-black uppercase text-sm tracking-tight ${isCompleted ? 'text-slate-900' : 'text-slate-300'
                                        }`}>
                                        {step.label}
                                    </p>
                                    {isCurrent && (
                                        <Badge variant="outline" className="mt-1 text-[9px] font-bold uppercase bg-slate-50">
                                            Current Status
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {order.status === 'cancelled' && (
                        <div className="mt-8 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="font-bold text-sm uppercase">This order has been cancelled.</p>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-dashed text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Carrier</p>
                    <div className="flex items-center justify-center gap-2 font-bold text-slate-900">
                        <Truck className="w-4 h-4 text-slate-400" />
                        {order.shipping_label || "Standard Delivery"}
                    </div>
                </div>
            </div>
        </div>
    )
}