"use client"

import { useState } from "react"
import { CreditCard, Banknote, Smartphone, Landmark, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const PAYMENT_METHODS = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "cod", label: "COD", icon: Landmark },
]

export default function PaymentModal({ grandTotal, onConfirm, onClose }: any) {
    const [method, setMethod] = useState("cash")
    const [tendered, setTendered] = useState(grandTotal.toString())
    const [processing, setProcessing] = useState(false)

    const tenderedAmount = parseFloat(tendered) || 0
    const change = Math.max(0, tenderedAmount - grandTotal)
    const isShort = method === "cash" && tenderedAmount < grandTotal

    const handleConfirm = async () => {
        setProcessing(true)
        await onConfirm(method, tenderedAmount)
        setProcessing(false)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-bold">Complete Payment</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Total Display */}
                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Due</p>
                        <p className="text-4xl font-black text-slate-900 mt-1">₹{grandTotal.toLocaleString()}</p>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="grid grid-cols-4 gap-2">
                        {PAYMENT_METHODS.map(pm => {
                            const Icon = pm.icon
                            return (
                                <button
                                    key={pm.id}
                                    onClick={() => setMethod(pm.id)}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                                        method === pm.id
                                            ? "border-slate-900 bg-slate-50 text-slate-900"
                                            : "border-slate-200 text-slate-400 hover:border-slate-300"
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-[10px] font-bold">{pm.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Cash Tendered (only for cash) */}
                    {method === "cash" && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">Amount Tendered</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                                <Input
                                    type="number"
                                    value={tendered}
                                    onChange={e => setTendered(e.target.value)}
                                    className="pl-7 h-12 text-lg font-bold text-right"
                                    autoFocus
                                />
                            </div>
                            {!isShort && tenderedAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Change</span>
                                    <span className="font-bold text-emerald-600">₹{change.toLocaleString()}</span>
                                </div>
                            )}
                            {isShort && (
                                <p className="text-xs font-medium text-red-500">Insufficient amount</p>
                            )}
                        </div>
                    )}

                    {/* Confirm Button */}
                    <Button
                        className="w-full h-12 text-sm font-bold tracking-wide"
                        disabled={processing || (method === "cash" && isShort)}
                        onClick={handleConfirm}
                    >
                        {processing ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Check className="w-5 h-5 mr-2" />
                        )}
                        {method === "cash"
                            ? `Pay ₹${grandTotal.toLocaleString()}`
                            : `Complete ${method.toUpperCase()} Payment`
                        }
                    </Button>
                </div>
            </div>
        </div>
    )
}
