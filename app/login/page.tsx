

"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
    Mail, Lock, User, Phone, ArrowRight,
    Loader2, Eye, EyeOff
} from "lucide-react"

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mounted, setMounted] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => { setMounted(true); document.title = "Sign In | THE MAKEUP STORE WANGKHEI" }, [])

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.push("/")
                router.refresh()
            }
        })
        return () => subscription.unsubscribe()
    }, [supabase, router])

    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()

    const handleGoogleLogin = useCallback(async () => {
        if (isCapacitor) {
            try {
                const { nativeGoogleSignIn } = await import('@/lib/capacitor-google-auth')
                const result = await nativeGoogleSignIn()
                if (!result) {
                    toast.error('Google sign-in cancelled')
                    return
                }
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: result.idToken,
                    nonce: result.nonce,
                })
                if (error) toast.error('Supabase error: ' + error.message)
            } catch (err: any) {
                toast.error(err?.message || 'Google sign-in failed')
            }
        } else {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            })
            if (error) toast.error(error.message)
        }
    }, [isCapacitor, supabase])

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { full_name: formData.get('fullName'), phone: formData.get('phone') } }
                })
                if (error) throw error
                toast.success("Check your email!")
                setLoading(false)
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            }
        } catch (error: any) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen w-full bg-white">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col min-h-screen"
            >
                {/* BRAND HEADER */}
                <div className="pt-20 pb-8 px-6 text-center">
                    <div className="w-20 h-20 mx-auto mb-5 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <img
                            src="/icon-192x192.svg"
                            alt="Logo"
                            className="w-full h-full object-contain rounded-xl"
                        />
                    </div>
                    <h1 className="text-3xl font-daciana text-slate-950 tracking-tighter leading-none mb-1">
                        THE MAKEUP STORE
                    </h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">
                        WANGKHEI
                    </p>
                </div>

                {/* FORM CARD */}
                <div className="flex-1 px-6">
                    <div className="bg-[#FAFAFA] rounded-3xl p-6 pb-8 border border-slate-100">
                        {/* MODE TOGGLE */}
                        <div className="flex bg-white rounded-xl p-1 mb-7 shadow-sm border border-slate-100">
                            {(['login', 'signup'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    disabled={loading}
                                    className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                        mode === m
                                            ? 'bg-[#fc2779] text-white shadow-sm shadow-pink-200'
                                            : 'text-slate-400 hover:text-slate-600'
                                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {m === 'login' ? 'Log In' : 'Sign Up'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleAuth} className="space-y-3">
                            {mode === 'signup' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3"
                                >
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input name="fullName" placeholder="Full name" className="h-12 pl-11 rounded-xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-0 transition-all" required />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input name="phone" type="tel" placeholder="Phone number" className="h-12 pl-11 rounded-xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-0 transition-all" required />
                                    </div>
                                </motion.div>
                            )}

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input name="email" type="email" placeholder="Email address" className="h-12 pl-11 rounded-xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-0 transition-all" required />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    className="h-12 pl-11 pr-11 rounded-xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-0 transition-all"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#fc2779] transition-colors">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 mt-2 rounded-xl bg-[#fc2779] text-white hover:bg-[#d91d64] transition-all font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-pink-200 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>{mode === 'login' ? 'Log In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        {/* DIVIDER */}
                        <div className="flex items-center gap-4 my-7">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">or</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* SOCIAL LOGIN */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all font-semibold text-[13px] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="py-8 px-6 text-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
                        The Makeup Store Wangkhei &copy; 2026
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
