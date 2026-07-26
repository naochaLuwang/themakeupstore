"use client"

import { useState, useEffect } from "react"
import {
    Send,
    UserCheck,
    ScrollText,
    Link2,
    Type,
    Activity,
    Users,
    Monitor,
    RefreshCw,
    Circle,
    CheckCircle2,
    Smartphone,
    Bell
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"


export default function AdminBroadcastForm() {
    const supabase = createClient()
    const [form, setForm] = useState({ title: "", body: "", url: "" })
    const [loading, setLoading] = useState(false)
    const [recipients, setRecipients] = useState<string[]>([])
    const [status, setStatus] = useState<string | null>(null)
    const [testStatus, setTestStatus] = useState<string | null>(null)
    const [testLoading, setTestLoading] = useState(false)
    const [stats, setStats] = useState({ devices: 0, users: 0 })

    const fetchNetworkStats = async () => {
        try {
            // This will now return ALL rows because you are an Admin
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('user_id');

            if (error) throw error;

            if (data) {
                const uniqueIds = new Set(data.map(d => d.user_id)).size;
                setStats({
                    devices: data.length,
                    users: uniqueIds
                });
            }
        } catch (err) {
            console.error("Admin RLS fetch failed:", err);
        }
    };
    useEffect(() => {
        fetchNetworkStats();
        // Optional: Refresh stats every 30 seconds
        const interval = setInterval(fetchNetworkStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const sendBroadcast = async () => {
        if (!form.title || !form.body) return;
        setLoading(true);
        setStatus("Synchronizing with push servers...");
        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setStats({ devices: data.totalDevices, users: data.totalDevices });
                setStatus("Broadcast dispatched successfully.");
                setForm({ title: "", body: "", url: "" });
            } else {
                setStatus(data.error || "Broadcast failed.");
            }
        } catch (e) { setStatus("Dispatch failed."); }
        finally { setLoading(false); }
    }

    const sendTest = async () => {
        if (!form.title || !form.body) return;
        setTestLoading(true);
        setTestStatus("Sending test notification...");
        try {
            const res = await fetch('/api/admin/broadcast/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setTestStatus(`Test sent to ${data.sent} device${data.sent !== 1 ? 's' : ''}`);
            } else {
                setTestStatus(data.error || "Test failed.");
            }
        } catch {
            setTestStatus("Test failed.");
        } finally {
            setTestLoading(false);
        }
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
            {/* STATS STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Network Reach</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-semibold text-zinc-900">{stats.devices}</span>
                        <span className="text-sm text-zinc-500 mb-1">Devices</span>
                    </div>
                </div>
                <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Unique Audience</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-semibold text-zinc-900">{stats.users}</span>
                        <span className="text-sm text-zinc-500 mb-1">Users</span>
                    </div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-lg shadow-zinc-200 flex flex-col justify-center">
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-xs font-medium uppercase tracking-tighter">Server Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-emerald-500 text-[10px] font-bold uppercase">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* COMPOSER */}
                <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm space-y-8">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Campaign Composer</h1>
                        <p className="text-zinc-500 text-sm">Design and transmit your notification payload.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Title</label>
                            <input
                                className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-zinc-100 focus:border-zinc-400 outline-none transition-all"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Summer Sale 2024"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Message Body</label>
                            <textarea
                                className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-zinc-100 focus:border-zinc-400 outline-none transition-all h-28 resize-none"
                                value={form.body}
                                onChange={e => setForm({ ...form, body: e.target.value })}
                                placeholder="Get 20% off all collections starting now..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Redirection Link</label>
                            <div className="relative">
                                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input
                                    className="w-full pl-11 pr-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none text-sm"
                                    value={form.url}
                                    onChange={e => setForm({ ...form, url: e.target.value })}
                                    placeholder="/shop"
                                />
                            </div>
                        </div>

                        <button
                            onClick={sendBroadcast}
                            disabled={loading || stats.devices === 0}
                            className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-[0.99] disabled:opacity-20 shadow-xl shadow-zinc-200"
                        >
                            {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? "TRANSMITTING..." : "PUBLISH BROADCAST"}
                        </button>
                        <button
                            onClick={sendTest}
                            disabled={testLoading || !form.title || !form.body}
                            className="w-full py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all active:scale-[0.99] disabled:opacity-30"
                        >
                            {testLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                            {testLoading ? "SENDING..." : "SEND TEST TO MY DEVICE"}
                        </button>
                        {testStatus && (
                            <p className={`text-[11px] font-medium text-center ${testStatus.includes('sent') ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {testStatus}
                            </p>
                        )}
                    </div>
                </div>

                {/* PREVIEW + LOG */}
                <div className="lg:col-span-5 space-y-8">
                    {/* PHONE MOCKUP PREVIEW */}
                    <div className="bg-zinc-100 rounded-[3rem] p-4 border-[8px] border-zinc-200 shadow-inner relative overflow-hidden flex justify-center py-12">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-200 rounded-b-2xl z-10" />

                        {/* THE NOTIFICATION BUBBLE */}
                        <div className="w-[90%] bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-white min-h-[80px] animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-6 h-6 bg-zinc-900 rounded-lg flex items-center justify-center">
                                    <Bell className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Store App</span>
                                <span className="text-[10px] text-zinc-300 ml-auto font-medium italic">now</span>
                            </div>
                            <h4 className="text-sm font-bold text-zinc-900 truncate uppercase tracking-tight">
                                {form.title || "Headline Preview"}
                            </h4>
                            <p className="text-[12px] text-zinc-600 leading-snug line-clamp-2 mt-0.5">
                                {form.body || "Your message will appear here. This preview shows how users see your content on lock screens."}
                            </p>
                        </div>

                        {/* SMARTPHONE DECORATION */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-zinc-300 rounded-full" />
                    </div>

                    {/* RECIPIENT LOG */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm min-h-[200px]">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-50 pb-4">
                            <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Transmission Log</h3>
                            <span className="text-[10px] font-bold text-emerald-500">{recipients.length} Success</span>
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                            {recipients.map((name, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 border border-zinc-50 rounded-lg hover:bg-zinc-50 transition-colors">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-zinc-600 truncate uppercase">{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}