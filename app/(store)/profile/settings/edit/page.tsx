"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, User, Phone, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function EditProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        full_name: "",
        phone: ""
    })

    // Fetch initial data
    React.useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data } = await supabase
                .from("profiles")
                .select("full_name, phone")
                .eq("id", user.id)
                .single()

            if (data) {
                setFormData({
                    full_name: data.full_name || "",
                    phone: data.phone || ""
                })
            }
            setLoading(false)
        }
        loadProfile()
    }, [router, supabase])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from("profiles")
            .upsert({ // Changed from .update to .upsert
                id: user?.id, // ID is required for upsert to know which row to target
                full_name: formData.full_name,
                phone: formData.phone,
            })

        if (error) {
            console.error("Supabase Error Details:", error.message, error.details, error.hint);
            toast.error(`Update failed: ${error.message}`);
            setSaving(false);
        } else {
            toast.success("Profile updated successfully")
            setTimeout(() => router.back(), 1500)
        }
    }

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 animate-pulse">Initializing...</div>

    return (
        <div className="min-h-auto bg-white pb-0">
            {/* HEADER */}
            <header className="px-6 pt-5 pb-0 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-zinc-50 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-zinc-900" />
                        </button>
                        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">Personal Info</h1>
                    </div>
                    {saving && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in" />}
                </div>
            </header>

            <main className="px-6 py-10 max-w-xl mx-auto">
                {/* PREVIEW CARD */}
                <div className="mb-12 p-8 rounded-[2rem] bg-zinc-900 text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 block mb-6">Live Identity</span>
                        <h2 className="text-3xl font-serif italic tracking-tighter mb-1">
                            {formData.full_name || "New Member"}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                            {formData.phone || "+91 — — —"}
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <User className="w-32 h-32" />
                    </div>
                </div>

                {/* EDIT FORM */}
                <form onSubmit={handleUpdate} className="space-y-10">
                    <div className="space-y-8">
                        {/* NAME INPUT */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">
                                Full Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Enter your name"
                                    className="w-full bg-zinc-50 border-none rounded-2xl px-6 py-5 text-sm font-bold placeholder:text-zinc-300 focus:ring-2 focus:ring-zinc-900 transition-all"
                                />
                                <User className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                            </div>
                        </div>

                        {/* PHONE INPUT */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">
                                Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 00000 00000"
                                    className="w-full bg-zinc-50 border-none rounded-2xl px-6 py-5 text-sm font-bold placeholder:text-zinc-300 focus:ring-2 focus:ring-zinc-900 transition-all"
                                />
                                <Phone className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] transition-all"
                    >
                        {saving ? (
                            <span className="animate-pulse">Updating...</span>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    )
}