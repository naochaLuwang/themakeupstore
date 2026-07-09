"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ChevronLeft,
    User,
    Lock,
    FileText,
    ShieldCheck,
    Truck,
    Mail,
    ChevronRight,
    AlertTriangle,
    Trash2,
    Eye,
    EyeOff,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { deleteAccount } from "@/app/actions/profile"

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = React.useState<any>(null)
    const [email, setEmail] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
    const [deleteLoading, setDeleteLoading] = React.useState(false)
    const [showPasswordSheet, setShowPasswordSheet] = React.useState(false)
    const [pwCurrent, setPwCurrent] = React.useState("")
    const [pwNew, setPwNew] = React.useState("")
    const [pwConfirm, setPwConfirm] = React.useState("")
    const [pwSaving, setPwSaving] = React.useState(false)
    const [showCurrent, setShowCurrent] = React.useState(false)
    const [showNew, setShowNew] = React.useState(false)
    const [showConfirm, setShowConfirm] = React.useState(false)

    React.useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            setEmail(user.email || "")

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            setProfile(data)
            setLoading(false)
        }
        getProfile()
    }, [router, supabase])

    const resetPwFields = () => {
        setPwCurrent("")
        setPwNew("")
        setPwConfirm("")
        setShowCurrent(false)
        setShowNew(false)
        setShowConfirm(false)
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pwNew.length < 6) return toast.error("New password must be at least 6 characters")
        if (pwNew !== pwConfirm) return toast.error("Passwords do not match")

        setPwSaving(true)
        try {
            // Verify current password by attempting sign-in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: pwCurrent,
            })
            if (signInError) {
                toast.error("Current password is incorrect")
                setPwSaving(false)
                return
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: pwNew,
            })
            if (updateError) throw updateError

            toast.success("Password updated")
            setShowPasswordSheet(false)
            resetPwFields()
        } catch (err: any) {
            toast.error(err.message || "Failed to update password")
        } finally {
            setPwSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        setDeleteLoading(true)
        try {
            const result = await deleteAccount()
            if (!result.success) throw new Error("Failed to delete account")
            await supabase.auth.signOut()
            toast.success("Account deleted")
            router.push('/')
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete account")
            setShowDeleteConfirm(false)
        } finally {
            setDeleteLoading(false)
        }
    }

    const legalLinks = [
        { label: "Terms of Use", href: "/legal/terms_and_conditions", icon: FileText, detail: "Usage & agreements" },
        { label: "Privacy Policy", href: "/legal/privacy_policy", icon: ShieldCheck, detail: "Your data security" },
        { label: "Return Policy", href: "/legal/return_policy", icon: Truck, detail: "Shipping & refunds" },
        { label: "Contact Us", href: "/contact", icon: Mail, detail: "Get in touch with us" },
    ]

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-white pb-12">
            <header className="flex items-center gap-3 px-5 h-12 border-b border-gray-100">
                <button onClick={() => router.back()} className="p-1 -ml-1 rounded hover:bg-gray-50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="text-sm font-semibold text-gray-900">Settings</h1>
            </header>

            <main className="max-w-xl mx-auto px-5 py-6 space-y-8">
                {/* Profile Card */}
                <Link
                    href="/profile/settings/edit"
                    className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {profile?.full_name || "Add your name"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                            {profile?.phone || "Add your phone number"}
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>

                {/* Change Password Card */}
                <button
                    onClick={() => setShowPasswordSheet(true)}
                    className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">Change Password</p>
                        <p className="text-xs text-gray-400">Update your account password</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>

                {/* Legal Links */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    {legalLinks.map((item, idx) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${idx !== legalLinks.length - 1 ? 'border-b border-gray-50' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <item.icon className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                <p className="text-xs text-gray-400">{item.detail}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                        </Link>
                    ))}
                </div>

                {/* Danger Zone */}
                <div className="border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">Danger Zone</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">Delete your account and all associated data</p>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                        Delete Account
                    </button>
                </div>

                <footer className="text-center pt-4">
                    <p className="text-[10px] text-gray-300">The Makeup Store</p>
                </footer>
            </main>

            {/* Change Password Sheet */}
            <AnimatePresence>
                {showPasswordSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowPasswordSheet(false); resetPwFields() }}
                            className="fixed inset-0 bg-black/30 z-[80]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-xl max-w-lg mx-auto"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
                                <button onClick={() => { setShowPasswordSheet(false); resetPwFields() }} className="p-1 rounded hover:bg-gray-50 transition-colors">
                                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? "text" : "password"}
                                            value={pwCurrent}
                                            onChange={(e) => setPwCurrent(e.target.value)}
                                            placeholder="Enter current password"
                                            required
                                            className="w-full h-11 px-4 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? "text" : "password"}
                                            value={pwNew}
                                            onChange={(e) => setPwNew(e.target.value)}
                                            placeholder="At least 6 characters"
                                            required
                                            minLength={6}
                                            className="w-full h-11 px-4 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        />
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            value={pwConfirm}
                                            onChange={(e) => setPwConfirm(e.target.value)}
                                            placeholder="Re-enter new password"
                                            required
                                            minLength={6}
                                            className="w-full h-11 px-4 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                        />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                                    className="w-full h-11 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
                                >
                                    {pwSaving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Update Password"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
                            className="fixed inset-0 bg-black/30 z-[80]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-xl max-w-lg mx-auto"
                        >
                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900">Delete Account?</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        All orders, wishlists, and data will be permanently removed.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteLoading}
                                        className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {deleteLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            "Delete Account"
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={deleteLoading}
                                        className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
