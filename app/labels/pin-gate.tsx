"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"

export function PinGate() {
    const router = useRouter()
    const [pin, setPin] = useState("")
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (busy) return
        setError("")
        setBusy(true)
        try {
            const res = await fetch("/api/labels-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            })
            if (res.ok) {
                router.refresh()
            } else {
                const data = await res.json().catch(() => null)
                setError(data?.error || "Verification failed. Try again.")
                setPin("")
            }
        } catch {
            setError("Network error. Try again.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <form
                onSubmit={submit}
                className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
                <div className="text-center mb-7">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="font-daciana text-[26px] font-black uppercase tracking-tight leading-none text-slate-950">
                        Label Maker
                    </h1>
                    <p className="text-sm text-slate-500 mt-2">Enter the access PIN to continue</p>
                </div>

                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Access PIN
                </label>
                <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    autoFocus
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                />

                {error && (
                    <p className="text-xs font-bold text-red-500 mt-2.5 text-center">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={busy || pin.length < 4}
                    className="mt-5 w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
                >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Unlock
                </button>
            </form>
        </div>
    )
}
