"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, FileText, Check, Package, MapPin } from "lucide-react"

export default function OrderSuccessPage() {
    const searchParams = useSearchParams()
    const orderId = searchParams.get("orderId")

    return (
        <div className="min-h-auto bg-white flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">

            <div className="w-full max-w-xl space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">

                {/* Status Indicator */}
                <header className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-200">
                            <Check className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
                            Order Confirmed
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                            Your shipment is being processed
                        </p>
                    </div>
                </header>

                {/* Logistics Info Card */}
                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                    <div className="grid grid-cols-2 gap-8 pb-8 border-b border-slate-200/50">
                        <div className="space-y-1.5">
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Order Reference</p>
                            <p className="text-sm font-black text-slate-900">
                                #{orderId?.slice(0, 8).toUpperCase() || "ORD-XXXX"}
                            </p>
                        </div>
                        <div className="space-y-1.5 text-right">
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Payment Status</p>
                            <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">
                                Cash on Delivery
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 space-y-6">
                        {/* <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                                <FileText className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Email Confirmation</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                    A summary has been sent to your registered address.
                                </p>
                            </div>
                        </div> */}

                        <Link
                            href={`/profile/orders/${orderId}`}
                            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-[0.98]"
                        >
                            View Order Details <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Footer Navigation */}
                <footer className="flex flex-col items-center gap-8">
                    <Link href="/" className="group flex flex-col items-center gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-slate-900 transition-colors">Return to Shop</span>
                        <div className="h-[1.5px] w-4 bg-slate-200 group-hover:w-full transition-all duration-300" />
                    </Link>

                    <div className="flex items-center gap-4 opacity-30">
                        <Package className="w-4 h-4" />
                        <div className="h-4 w-[1px] bg-slate-900" />
                        <MapPin className="w-4 h-4" />
                    </div>
                </footer>

            </div>

            {/* Background Branding Detail */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-slate-50/40 -z-10 select-none tracking-tighter uppercase italic">
                Done
            </div>
        </div>
    )
}