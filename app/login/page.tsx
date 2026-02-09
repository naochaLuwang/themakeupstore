// "use client"

// import * as React from "react"
// import { useState } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { useRouter } from "next/navigation"
// import { motion, AnimatePresence } from "framer-motion"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { toast } from "sonner"
// import {
//     Mail, Lock, User, Phone, ArrowRight,
//     Loader2, Sparkles, Eye, EyeOff
// } from "lucide-react"

// type AuthMode = 'login' | 'signup'

// export default function AuthPage() {
//     const [mode, setMode] = useState<AuthMode>('login')
//     const [loading, setLoading] = useState(false)
//     const [showPassword, setShowPassword] = useState(false) // Toggle State
//     const supabase = createClient()
//     const router = useRouter()

//     const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault()
//         setLoading(true)
//         const formData = new FormData(e.currentTarget)
//         const email = formData.get('email') as string
//         const password = formData.get('password') as string

//         try {
//             if (mode === 'signup') {
//                 const { data, error } = await supabase.auth.signUp({
//                     email,
//                     password,
//                     options: {
//                         data: {
//                             full_name: formData.get('fullName'),
//                             phone: formData.get('phone')
//                         }
//                     }
//                 })
//                 if (error) throw error
//                 data.session ? router.push("/") : toast.success("Verify your email!")
//             } else {
//                 const { error } = await supabase.auth.signInWithPassword({ email, password })
//                 if (error) throw error
//                 router.push("/")
//                 router.refresh()
//             }
//         } catch (error: any) {
//             toast.error(error.message)
//         } finally {
//             setLoading(false)
//         }
//     }

//     return (
//         <div className="relative min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] overflow-hidden">

//             {/* Background Refraction Blobs */}
//             <div className="absolute inset-0 pointer-events-none">
//                 <motion.div
//                     animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
//                     transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
//                     className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/40 rounded-full blur-[100px]"
//                 />
//                 <motion.div
//                     animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
//                     transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
//                     className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-rose-200/40 rounded-full blur-[100px]"
//                 />
//             </div>

//             <motion.div
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="relative z-10 w-full max-w-[500px] px-4"
//             >
//                 <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">

//                     {/* Compact Header */}
//                     <div className="flex items-center justify-between mb-8">
//                         <div>
//                             <h1 className="text-2xl font-daciana tracking-tighter uppercase text-slate-900 leading-none">THE MAKEUP STORE</h1>
//                             <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">WANGKHEI</p>
//                         </div>
//                         <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
//                             <Sparkles className="w-5 h-5 text-indigo-400" />
//                         </div>
//                     </div>

//                     {/* Compact Switcher */}
//                     <div className="inline-flex p-1 bg-slate-200/40 rounded-xl mb-8">
//                         <button
//                             onClick={() => { setMode('login'); setShowPassword(false); }}
//                             className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//                         >
//                             Log In
//                         </button>
//                         <button
//                             onClick={() => { setMode('signup'); setShowPassword(false); }}
//                             className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//                         >
//                             Sign Up
//                         </button>
//                     </div>

//                     <form onSubmit={handleAuth} className="space-y-4">
//                         <AnimatePresence mode="wait">
//                             <motion.div
//                                 key={mode}
//                                 initial={{ opacity: 0, scale: 0.98 }}
//                                 animate={{ opacity: 1, scale: 1 }}
//                                 exit={{ opacity: 0, scale: 0.98 }}
//                                 transition={{ duration: 0.2 }}
//                                 className="space-y-3"
//                             >
//                                 {mode === 'signup' && (
//                                     <div className="grid grid-cols-2 gap-3">
//                                         <div className="relative">
//                                             <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
//                                             <Input name="fullName" placeholder="Name" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold" required />
//                                         </div>
//                                         <div className="relative">
//                                             <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
//                                             <Input name="phone" type="tel" placeholder="Phone" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold" required />
//                                         </div>
//                                     </div>
//                                 )}

//                                 <div className="relative">
//                                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
//                                     <Input name="email" type="email" placeholder="Email Address" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold" required />
//                                 </div>

//                                 <div className="relative">
//                                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
//                                     <Input
//                                         name="password"
//                                         type={showPassword ? "text" : "password"}
//                                         placeholder="Password"
//                                         className="h-11 pl-9 pr-10 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold"
//                                         required
//                                     />
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowPassword(!showPassword)}
//                                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
//                                     >
//                                         {showPassword ? (
//                                             <EyeOff className="h-4 w-4" />
//                                         ) : (
//                                             <Eye className="h-4 w-4" />
//                                         )}
//                                     </button>
//                                 </div>
//                             </motion.div>
//                         </AnimatePresence>

//                         <Button
//                             className="w-full h-12 mt-2 rounded-xl bg-slate-900 text-white hover:bg-black transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
//                             disabled={loading}
//                         >
//                             {loading ? (
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                             ) : (
//                                 <span className="flex items-center">
//                                     Continue <ArrowRight className="ml-2 h-4 w-4" />
//                                 </span>
//                             )}
//                         </Button>
//                     </form>

//                     <p className="mt-8 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
//                         THE MAKEUPSTORE WANGKHEI &copy; 2026
//                     </p>
//                 </div>
//             </motion.div>
//         </div>
//     )
// }
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
    Mail, Lock, User, Phone, ArrowRight,
    Loader2, Sparkles, Eye, EyeOff
} from "lucide-react"

type AuthMode = 'login' | 'signup'

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('login')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mounted, setMounted] = useState(false) // Fix hydration

    const supabase = createClient()
    const router = useRouter()

    // 1. FIX HYDRATION: Ensure client and server match on first pass
    useEffect(() => {
        setMounted(true)
    }, [])

    // 2. REDIRECT LOGIC: Listen for Auth changes (Google/Magic Link)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.push("/")
                router.refresh()
            }
        })
        return () => subscription.unsubscribe()
    }, [supabase, router])

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Must match your callback route exactly
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: formData.get('fullName'),
                            phone: formData.get('phone')
                        }
                    }
                })
                if (error) throw error
                if (!data.session) {
                    toast.success("Check your email for verification!")
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                router.push("/")
                router.refresh()
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Don't render until mounted to avoid the "Sign Up" vs "Join" mismatch error
    if (!mounted) return null

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/40 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-rose-200/40 rounded-full blur-[100px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-[500px] px-4"
            >
                <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-daciana tracking-tighter uppercase text-slate-900 leading-none">THE MAKEUP STORE</h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">WANGKHEI</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="inline-flex p-1 bg-slate-200/40 rounded-xl mb-8">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setShowPassword(false); }}
                            className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Log In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setShowPassword(false); }}
                            className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                {mode === 'signup' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <Input name="fullName" placeholder="Name" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold shadow-none focus-visible:ring-0" required />
                                        </div>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <Input name="phone" type="tel" placeholder="Phone" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold shadow-none focus-visible:ring-0" required />
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input name="email" type="email" placeholder="Email Address" className="h-11 pl-9 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold shadow-none focus-visible:ring-0" required />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        className="h-11 pl-9 pr-10 rounded-xl border-white/50 bg-white/50 focus:bg-white text-xs font-bold shadow-none focus-visible:ring-0"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <Button
                            className="w-full h-12 mt-2 rounded-xl bg-slate-900 text-white hover:bg-black transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center">Continue <ArrowRight className="ml-2 h-4 w-4" /></span>}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest text-slate-400">
                            <span className="bg-white/10 px-2 backdrop-blur-sm">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Button */}
                    <Button
                        type="button"
                        onClick={handleGoogleLogin}
                        variant="outline"
                        className="w-full h-12 rounded-xl border-white/60 bg-white/50 hover:bg-white text-slate-900 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center gap-3"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </Button>

                    <p className="mt-8 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        THE MAKEUPSTORE WANGKHEI &copy; 2026
                    </p>
                </div>
            </motion.div>
        </div>
    )
}