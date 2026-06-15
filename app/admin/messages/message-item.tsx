"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Clock, User as UserIcon, CheckCircle2, Circle, Reply } from "lucide-react"
import { toast } from "sonner"

export function MessageItem({ msg }: { msg: any }) {
    const supabase = createClient()
    const [status, setStatus] = useState(msg.status)
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const toggleStatus = async () => {
        setLoading(true)
        const newStatus = status === 'unread' ? 'read' : 'unread'
        const { error } = await supabase
            .from('contact_messages')
            .update({ status: newStatus })
            .eq('id', msg.id)

        if (!error) {
            setStatus(newStatus)
            toast.success(`Message marked as ${newStatus}`)
        }
        setLoading(false)
    }

    // Generate the mailto link
    const mailtoLink = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)} | DACIANA Inquiry&body=${encodeURIComponent(`\n\n--- Original Message ---\nFrom: ${msg.name}\nMessage: ${msg.message}`)}`;

    return (
        <div className={`group bg-white border ${status === 'unread' ? 'border-rose-400/20 shadow-md' : 'border-slate-100 shadow-sm'} p-6 rounded-2xl transition-all relative overflow-hidden`}>
            {status === 'unread' && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}

            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{msg.name}</h3>
                            {status === 'unread' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{msg.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase mr-2">
                        <Clock className="w-3 h-3" />
                        {mounted ? new Date(msg.created_at).toLocaleDateString() : '---'}
                    </div>

                    {/* NEW QUICK REPLY BUTTON */}
                    <a
                        href={mailtoLink}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                        title="Reply to Message"
                    >
                        <Reply className="w-5 h-5" />
                    </a>

                    {/* Status Toggle */}
                    <button
                        onClick={toggleStatus}
                        disabled={loading}
                        className={`p-2 rounded-lg transition-colors ${status === 'read' ? 'text-green-500 bg-green-50' : 'text-slate-300 hover:text-rose-500 hover:bg-slate-50'}`}
                        title={status === 'unread' ? "Mark as Read" : "Mark as Unread"}
                    >
                        {status === 'read' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-rose-500">{msg.subject}</p>
                <div className="group/msg relative">
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                        {msg.message}
                    </p>
                </div>
            </div>
        </div>
    )
}