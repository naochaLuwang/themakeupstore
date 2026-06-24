"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function EditProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [formData, setFormData] = React.useState({
        full_name: "",
        phone: ""
    })

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
            .upsert({
                id: user?.id,
                full_name: formData.full_name,
                phone: formData.phone,
            })

        if (error) {
            toast.error(`Update failed: ${error.message}`)
            setSaving(false)
        } else {
            toast.success("Profile updated")
            router.back()
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white">
            <header className="flex items-center gap-3 px-5 h-12 border-b border-gray-100">
                <button onClick={() => router.back()} className="p-1 -ml-1 rounded hover:bg-gray-50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="text-sm font-semibold text-gray-900">Edit Profile</h1>
            </header>

            <main className="max-w-xl mx-auto px-5 py-6">
                <form onSubmit={handleUpdate} className="space-y-5">
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Enter your name"
                            className="w-full h-11 px-4 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 00000 00000"
                            className="w-full h-11 px-4 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full h-11 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </form>
            </main>
        </div>
    )
}
