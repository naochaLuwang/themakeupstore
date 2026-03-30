"use client"
import { Ticket, Percent, IndianRupee, Copy, Check, Info, Lock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface Promo {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    is_eligible: boolean;
    reasons?: string[];
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

    // Sort: Eligible first
    const sortedPromos = [...promos].sort((a, b) => (b.is_eligible ? 1 : 0) - (a.is_eligible ? 1 : 0))

    return (
        <section className="space-y-6 pt-10 border-t border-slate-50 mt-10">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#fc2779]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 leading-none">
                        Exclusive Offers
                    </h3>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-full">
                    {promos.filter(p => p.is_eligible).length} Applicable
                </span>
            </div>

            <div className="flex flex-col gap-4">
                {sortedPromos.map((promo, idx) => (
                    <motion.div
                        key={promo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`relative group overflow-hidden rounded-3xl border transition-all duration-500 ${
                            promo.is_eligible 
                                ? 'bg-white border-slate-200 hover:border-[#fc2779] shadow-sm hover:shadow-xl hover:shadow-slate-200/50' 
                                : 'bg-slate-50/50 border-slate-100 opacity-80'
                        }`}
                    >
                        <div className="p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                {/* ICON / TYPE */}
                                <div className={`p-3 rounded-2xl shrink-0 transition-colors duration-500 ${
                                    promo.is_eligible ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 border border-slate-100'
                                }`}>
                                    {promo.discount_type === 'percentage' ? (
                                        <Percent className="w-4 h-4" />
                                    ) : (
                                        <IndianRupee className="w-4 h-4" />
                                    )}
                                </div>

                                <div className="space-y-1 truncate">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[12px] font-black uppercase tracking-tight ${
                                            promo.is_eligible ? 'text-slate-900' : 'text-slate-400'
                                        }`}>
                                            {promo.code}
                                        </span>
                                        {!promo.is_eligible && (
                                            <div className="flex items-center gap-1 text-[7px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                <Lock className="w-2 h-2" /> Restricted
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-[10px] font-medium truncate ${
                                        promo.is_eligible ? 'text-slate-500' : 'text-slate-400'
                                    }`}>
                                        {promo.description || `${promo.discount_type === 'percentage' ? promo.discount_value + '%' : '₹' + promo.discount_value} off on your order.`}
                                    </p>
                                    
                                    {!promo.is_eligible && promo.reasons && promo.reasons.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Info className="w-2.5 h-2.5 text-slate-300" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {promo.reasons[0]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTION / PRICE */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`text-sm font-black italic tracking-tighter ${
                                    promo.is_eligible ? 'text-slate-900' : 'text-slate-300 line-through'
                                }`}>
                                    {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                                    <span className="text-[9px] font-medium ml-0.5 not-italic uppercase tracking-widest opacity-40">Off</span>
                                </span>
                                
                                {promo.is_eligible ? (
                                    <button 
                                        onClick={() => handleCopy(promo.code)}
                                        className="flex items-center gap-1.5 text-[9px] font-black text-[#fc2779] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100"
                                    >
                                        {copiedCode === promo.code ? (
                                            <><Check className="w-3 h-3" /> Copied</>
                                        ) : (
                                            <><Copy className="w-3 h-3" /> Copy Code</>
                                        )}
                                    </button>
                                ) : (
                                    <div className="h-7 flex items-center justify-center grayscale">
                                        <div className="w-6 h-6 rounded-full border border-slate-100 flex items-center justify-center">
                                            <Lock className="w-2.5 h-2.5 text-slate-200" />
                                        </div>
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
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] text-center leading-relaxed">
                    *Offers are valid for a limited time only. 
                    <br/>Minimum order values and specific product eligibility applies.
                </p>
            </div>
        </section>
    )
}
