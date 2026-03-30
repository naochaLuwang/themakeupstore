"use client"
import { Tag, Ticket, Percent, IndianRupee, Copy, Check, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface Promo {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    is_eligible: boolean;
}

export function PromoDisplay({ promos }: { promos: Promo[] }) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        toast.success(`Code ${code} copied to clipboard`)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    if (!promos || promos.length === 0) return null

    return (
        <section className="space-y-6 pt-10 border-t border-slate-50 mt-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-[#fc2779]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">
                        Exclusive Offers
                    </h3>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-full">
                    {promos.filter(p => p.is_eligible).length} Available
                </span>
            </div>

            <div className="flex flex-col gap-4">
                {promos.map((promo) => (
                    <motion.div
                        key={promo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative group overflow-hidden rounded-2xl border transition-all duration-500 ${
                            promo.is_eligible 
                                ? 'bg-white border-slate-200 hover:border-[#fc2779] shadow-sm hover:shadow-xl hover:shadow-slate-200/50' 
                                : 'bg-slate-50/50 border-transparent opacity-60 grayscale'
                        }`}
                    >
                        <div className="p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                {/* ICON / TYPE */}
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    promo.is_eligible ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
                                }`}>
                                    {promo.discount_type === 'percentage' ? (
                                        <Percent className="w-4 h-4" />
                                    ) : (
                                        <IndianRupee className="w-4 h-4" />
                                    )}
                                </div>

                                <div className="space-y-1 truncate">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-black uppercase tracking-tighter ${
                                            promo.is_eligible ? 'text-slate-900' : 'text-slate-500'
                                        }`}>
                                            {promo.code}
                                        </span>
                                        {!promo.is_eligible && (
                                            <span className="text-[8px] font-black text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase">
                                                Ineligible
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] font-medium truncate ${
                                        promo.is_eligible ? 'text-slate-500' : 'text-slate-400'
                                    }`}>
                                        {promo.description}
                                    </p>
                                </div>
                            </div>

                            {/* ACTION / PRICE */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-sm font-black ${
                                    promo.is_eligible ? 'text-slate-900' : 'text-slate-400'
                                }`}>
                                    {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                                    <span className="text-[9px] font-medium ml-1">OFF</span>
                                </span>
                                
                                {promo.is_eligible ? (
                                    <button 
                                        onClick={() => handleCopy(promo.code)}
                                        className="flex items-center gap-1.5 text-[9px] font-black text-[#fc2779] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {copiedCode === promo.code ? (
                                            <><Check className="w-3 h-3" /> Copied</>
                                        ) : (
                                            <><Copy className="w-3 h-3" /> Copy Code</>
                                        )}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">
                                        <Info className="w-2.5 h-2.5" /> Restricted
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HOVER GLOW FOR ELIGIBLE */}
                        {promo.is_eligible && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fc2779]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* MIN ORDER NOTE */}
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest text-center pt-2">
                *T&C Apply. Minimum order values may be required at checkout.
            </p>
        </section>
    )
}
