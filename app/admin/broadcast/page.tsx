"use client"

import { useState } from "react"
import { Send, Megaphone, Loader2 } from "lucide-react"

export default function AdminBroadcastForm() {
    const [form, setForm] = useState({ title: "", body: "", url: "" })
    const [loading, setLoading] = useState(false)

    const sendBroadcast = async () => {
        if (!form.title || !form.body) return alert("Please fill title and body")
        setLoading(true)

        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (data.success) {
                alert(data.details)
                setForm({ title: "", body: "", url: "" })
            }
        } catch (error) {
            alert("Broadcast failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl bg-white dark:bg-zinc-950 p-6 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2 className="font-bold uppercase tracking-tight">Marketing Broadcast</h2>
            </div>

            <div className="space-y-4">
                <input
                    placeholder="Notification Title (e.g. 50% OFF FLASH SALE)"
                    className="w-full p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl outline-none text-sm"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                />
                <textarea
                    placeholder="Message body..."
                    rows={3}
                    className="w-full p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl outline-none text-sm resize-none"
                    value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                />
                <input
                    placeholder="Redirect URL (e.g. /shop/lipsticks)"
                    className="w-full p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl outline-none text-sm"
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                />

                <button
                    onClick={sendBroadcast}
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to all users
                </button>
            </div>
        </div>
    )
}