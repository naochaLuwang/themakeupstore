"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingBag } from "lucide-react"

export default function TrackPage() {
    const router = useRouter()
    const [token, setToken] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (token.trim()) router.push(`/pos/track/${token.trim()}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-8 h-8 text-slate-400" />
                </div>
                <h1 className="text-2xl font-black tracking-tight mb-2">Track Your Order</h1>
                <p className="text-sm text-slate-500 mb-8">Enter your token number to check the status</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="e.g. 001 or K001"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        className="w-full h-14 text-center text-2xl font-black tracking-widest border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-slate-900 transition-all"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!token.trim()}
                        className="w-full h-14 bg-slate-900 text-white text-base font-bold rounded-2xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <Search className="w-5 h-5" /> Track Order
                    </button>
                </form>
            </div>
        </div>
    )
}
