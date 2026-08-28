"use client"

import { useState, useEffect } from "react"
import {
    Send,
    Activity,
    Link2,
    Bell,
    Smartphone,
    Users,
    Radio,
    Loader2,
    CheckCircle2,
    XCircle,
    Info,
    Trash2
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"


export default function AdminBroadcastForm() {
    const supabase = createClient()
    const [form, setForm] = useState({ title: "", body: "", url: "" })
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
    const [stats, setStats] = useState({ devices: 0, users: 0 })
    const [devices, setDevices] = useState<any[]>([])

    const fetchNetworkStats = async () => {
        try {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('id, user_id, fcm_token, platform, created_at, profiles!push_subscriptions_user_id_fkey(full_name)')

            if (error) throw error

            if (data) {
                const uniqueIds = new Set(data.map((d: any) => d.user_id)).size
                setStats({
                    devices: data.length,
                    users: uniqueIds
                })
                setDevices(data)
            }
        } catch (err) {
            console.error("Admin RLS fetch failed:", err)
        }
    }

    useEffect(() => {
        fetchNetworkStats()
        const interval = setInterval(fetchNetworkStats, 30000)
        return () => clearInterval(interval)
    }, [])

    const setMsg = (type: "success" | "error" | "info", text: string) => setStatus({ type, text })

    const sendBroadcast = async () => {
        if (!form.title || !form.body) return
        setLoading(true)
        setMsg("info", "Synchronizing with FCM push servers...")
        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (data.success) {
                if (data.totalDevices === 0) setMsg("info", data.details || "No FCM devices found")
                else setMsg("success", `Broadcast delivered to ${data.totalDevices} device${data.totalDevices === 1 ? "" : "s"}${data.failedDevices ? ` · ${data.failedDevices} invalid removed` : ""}`)
                setForm({ title: "", body: "", url: "" })
                fetchNetworkStats()
            } else {
                setMsg("error", data.error || "Broadcast failed.")
            }
        } catch (e) {
            setMsg("error", "Dispatch failed.")
        } finally {
            setLoading(false)
        }
    }

    const sendTest = async () => {
        if (!form.title || !form.body) return
        setLoading(true)
        setMsg("info", "Sending to your devices...")
        try {
            const res = await fetch('/api/admin/broadcast/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (data.success) {
                setMsg("success", `Sent to ${data.sent} of your ${data.devices} device(s)`)
            } else {
                setMsg("error", data.error || "Test failed.")
            }
        } catch {
            setMsg("error", "Test failed.")
        } finally {
            setLoading(false)
        }
    }

    const sendTopicTest = async () => {
        if (!form.title || !form.body) return
        setLoading(true)
        setMsg("info", "Sending to admin topic...")
        try {
            const res = await fetch('/api/admin/broadcast/test-topic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (data.success) {
                setMsg("success", "Sent to admin topic — all subscribed devices receive this")
            } else {
                setMsg("error", data.error || "Topic test failed.")
            }
        } catch {
            setMsg("error", "Topic test failed.")
        } finally {
            setLoading(false)
        }
    }

    const [fcmTestLoading, setFcmTestLoading] = useState(false)
    const [fcmTestResult, setFcmTestResult] = useState<{ ok: boolean; text: string } | null>(null)
    const [regLoading, setRegLoading] = useState(false)
    const [regStatus, setRegStatus] = useState<string | null>(null)

    const registerFCM = async () => {
        setRegLoading(true)
        setRegStatus(null)
        try {
            const isCap = !!(window as any).Capacitor?.isNativePlatform()
            if (!isCap) {
                setRegStatus("FCM registration requires the Capacitor app — open this admin on your phone app to register.")
                return
            }
            const { registerForFCM } = await import('@/lib/capacitor-push')
            await registerForFCM()
            setRegStatus("FCM registered successfully for this device.")
            fetchNetworkStats()
        } catch (e: any) {
            setRegStatus(`Failed: ${e.message}`)
        } finally {
            setRegLoading(false)
        }
    }

    const testFcmKey = async () => {
        setFcmTestLoading(true)
        setFcmTestResult(null)
        try {
            const res = await fetch('/api/admin/broadcast/test-fcm', { method: 'POST' })
            const data = await res.json()
            const diag = data.results
                ? `[key len=${data.results.envVarLength} project=${data.results.projectId ?? "?"}]`
                : ''
            if (data.success) {
                setFcmTestResult({ ok: true, text: data.message || `FCM key valid — delivered to ${data.sentCount} device(s)` })
            } else if (data.warning) {
                setFcmTestResult({ ok: true, text: `Key valid but: ${data.warning} ${diag}` })
            } else {
                setFcmTestResult({ ok: false, text: `Step "${data.step || 'unknown'}": ${data.error}${data.detail ? ` — ${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)}` : ''} ${diag}` })
            }
        } catch (e: any) {
            setFcmTestResult({ ok: false, text: `Network error: ${e.message}` })
        } finally {
            setFcmTestLoading(false)
        }
    }

    const StatusBanner = () => (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium ${
            status?.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
            status?.type === "error" ? "bg-red-50 text-red-600 border border-red-200" :
            status?.type === "info" ? "bg-slate-50 text-slate-600 border border-slate-200" :
            "hidden"
        }`}>
            {status?.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
             status?.type === "error" ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
             status?.type === "info" ? <Info className="w-4 h-4 shrink-0 mt-0.5" /> : null}
            <span>{status?.text}</span>
        </div>
    )

    const fieldClass = "w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-300 focus:bg-white transition-all"

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Broadcast</h1>
                <p className="text-sm text-slate-500">Send FCM push notifications to every installed device.</p>
            </div>

            {/* STAT STRIP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Devices</p>
                        <p className="text-lg font-black text-slate-900 truncate">{stats.devices}</p>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Users</p>
                        <p className="text-lg font-black text-slate-900 truncate">{stats.users}</p>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FCM Service</p>
                        <p className="text-lg font-black text-emerald-600 truncate flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </p>
                    </div>
                </div>
            </div>

            {/* REGISTERED DEVICES */}
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Registered Devices</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Every active FCM token in the app.</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stats.devices} token{stats.devices === 1 ? "" : "s"}</span>
                </div>
                {devices.length === 0 ? (
                    <div className="p-12 text-center">
                        <Smartphone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">No devices registered yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Open the app, log in, and grant notification permission.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left py-3 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">User</th>
                                    <th className="text-left py-3 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Token</th>
                                    <th className="text-left py-3 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Platform</th>
                                    <th className="text-left py-3 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Registered</th>
                                    <th className="text-right py-3 px-6 font-bold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((d: any) => (
                                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-800">{d.profiles?.full_name || "Unknown user"}</span>
                                                <span className="text-[11px] font-mono text-slate-400">{d.user_id?.slice(0, 8) || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <span className="font-mono text-[11px] text-slate-500">{d.fcm_token?.slice(0, 28)}...</span>
                                        </td>
                                        <td className="py-3 px-6">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                {d.platform || "android"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-xs text-slate-500">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                                        <td className="py-3 px-6 text-right">
                                            <button
                                                onClick={async () => {
                                                    const { error } = await supabase.from('push_subscriptions').delete().eq('id', d.id)
                                                    if (!error) { toast.success("Device removed"); fetchNetworkStats() }
                                                    else toast.error("Failed to remove device")
                                                }}
                                                className="rounded-lg h-8 w-8 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-slate-400 flex items-center justify-center"
                                                title="Remove this device token"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* COMPOSER */}
                <div className="lg:col-span-7 rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">New Notification</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Reaches every registered device with the app installed.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
                        <input
                            className={fieldClass}
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Summer Sale is Live"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Message Body</label>
                        <textarea
                            className={`${fieldClass} h-28 resize-none pt-3`}
                            value={form.body}
                            onChange={e => setForm({ ...form, body: e.target.value })}
                            placeholder="Get 20% off all collections starting now..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Redirect Link</label>
                        <div className="relative">
                            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                className={`${fieldClass} pl-10`}
                                value={form.url}
                                onChange={e => setForm({ ...form, url: e.target.value })}
                                placeholder="/shop"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-1">
                        <button
                            onClick={sendBroadcast}
                            disabled={loading || !form.title || !form.body || stats.devices === 0}
                            className="w-full h-11 bg-pink-600 hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? "SENDING..." : `Broadcast to ${stats.devices} device${stats.devices === 1 ? "" : "s"}`}
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={sendTest}
                                disabled={loading || stats.devices === 0}
                                className="h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                                Send Test to My Devices
                            </button>
                            <button
                                onClick={sendTopicTest}
                                disabled={loading || stats.devices === 0}
                                className="h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                                Test via Topic
                            </button>
                        </div>
                    </div>

                    <StatusBanner />
                </div>

                {/* PREVIEW + DIAGNOSTICS */}
                <div className="lg:col-span-5 space-y-6">
                    {/* PHONE PREVIEW */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Preview</p>
                        <div className="rounded-[2.5rem] bg-slate-100 border-4 border-slate-200 px-4 pt-10 pb-4 relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 mx-auto w-24 h-5 bg-slate-200 rounded-b-2xl" />
                            <div className="bg-white rounded-xl shadow p-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 bg-pink-600 rounded-md flex items-center justify-center">
                                        <Bell className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">The Makeup Store</span>
                                    <span className="text-[9px] text-slate-300 ml-auto italic">now</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">
                                    {form.title || "Headline Preview"}
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mt-1">
                                    {form.body || "Your message will appear here — exactly as users see it on their lock screen."}
                                </p>
                            </div>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-slate-300" />
                        </div>
                    </div>

                    {/* FCM KEY DIAGNOSTICS */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FCM Diagnostics</p>
                            <Bell className="w-4 h-4 text-slate-300" />
                        </div>
                        <button
                            onClick={testFcmKey}
                            disabled={fcmTestLoading}
                            className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {fcmTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {fcmTestLoading ? "TESTING..." : "Test FCM Service Key"}
                        </button>
                        {fcmTestResult && (
                            <p className={`text-[11px] font-medium px-3 py-2.5 rounded-lg border ${
                                fcmTestResult.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                            }`}>
                                {fcmTestResult.text}
                            </p>
                        )}
                        <button
                            onClick={registerFCM}
                            disabled={regLoading}
                            className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                            {regLoading ? "REGISTERING..." : "Register This Device for FCM"}
                        </button>
                        {regStatus && (
                            <p className={`text-[11px] font-medium px-3 py-2.5 rounded-lg border ${
                                regStatus.startsWith("Failed") || regStatus.includes("denied") || regStatus.includes("requires")
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                                {regStatus}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}