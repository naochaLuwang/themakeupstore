"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
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
    const reduceMotion = useReducedMotion()

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => { setMounted(true); document.title = "Sign In | THE MAKEUP STORE WANGKHEI" }, [])

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
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
            // Detect platform: use Google One Tap only on Android; use web OAuth on iOS
            const isAndroid = (window as any).Capacitor?.getPlatform()?.toLowerCase() === 'android'
            if (isAndroid) {
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
                // iOS or other platforms: use standard OAuth flow
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                })
                if (error) toast.error(error.message)
            }
        } else {
            // Web
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
        <div className="min-h-[100dvh] w-full bg-white relative overflow-hidden">
            {/* SOFT PINK WASHES */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: [
                        "radial-gradient(1100px 700px at 90% -10%, rgba(252,39,121,0.09), transparent 60%)",
                        "radial-gradient(900px 600px at -5% 110%, rgba(252,39,121,0.06), transparent 55%)",
                    ].join(", "),
                }}
            />

            {/* FLOATING WATERMARK — signature Anders M */}
            <motion.div
                aria-hidden
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
                <span
                    className="font-daciana text-[46vw] md:text-[400px] leading-none select-none bg-clip-text text-transparent"
                    style={{
                        backgroundImage: "linear-gradient(180deg, rgba(252,39,121,0.16) 0%, rgba(252,39,121,0.05) 70%)",
                    }}
                >
                    M
                </span>
            </motion.div>

            <div className="relative flex flex-col min-h-[100dvh] max-w-md mx-auto w-full px-6">
                {/* BRAND HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="pt-16 pb-9 text-center flex flex-col items-center"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fc2779] to-[#d91d64] shadow-lg shadow-pink-200 flex items-center justify-center mb-5">
                        <span className="font-daciana text-[26px] text-white leading-none pt-0.5">M</span>
                    </div>
                    <h1 className="text-2xl font-daciana text-slate-950 tracking-tight leading-none">
                        THE MAKEUP STORE
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[#fc2779] mt-1.5">
                        Wangkhei
                    </p>
                </motion.div>

                {/* FORM CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1"
                >
                    <div className="bg-white rounded-[2rem] border border-pink-50/70 p-6 pb-8 shadow-[0_24px_80px_-24px_rgba(252,39,121,0.25)]">
                        {/* MODE TOGGLE */}
                        <div className="flex bg-slate-50/80 rounded-2xl p-1 mb-7 border border-slate-100">
                            {(['login', 'signup'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    disabled={loading}
                                    className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
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
                                        <Input name="fullName" placeholder="Full name" className="h-12 pl-11 rounded-2xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-4 focus:ring-pink-100 transition-all" required />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input name="phone" type="tel" placeholder="Phone number" className="h-12 pl-11 rounded-2xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-4 focus:ring-pink-100 transition-all" required />
                                    </div>
                                </motion.div>
                            )}

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input name="email" type="email" placeholder="Email address" className="h-12 pl-11 rounded-2xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-4 focus:ring-pink-100 transition-all" required />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    className="h-12 pl-11 pr-11 rounded-2xl border-slate-200 bg-white text-[13px] font-medium placeholder:text-slate-400 focus:border-[#fc2779] focus:ring-4 focus:ring-pink-100 transition-all"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#fc2779] transition-colors">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 mt-2 rounded-2xl bg-[#fc2779] text-white hover:bg-[#d91d64] transition-all font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-pink-200/60 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
                            className="w-full h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[13px] text-slate-700 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
                </motion.div>

                {/* FOOTER */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="py-8 text-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]"
                >
                    The Makeup Store Wangkhei &copy; 2026
                </motion.p>
            </div>
        </div>
    )
}