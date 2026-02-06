"use client"

import * as React from "react"
import { X, Share, Sparkles, Download, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const PWA_HIDE_KEY = "pwa_prompt_dismissed_v2";
const SESSION_VIEW_KEY = "pwa_prompt_shown_this_session";

export function PWAPrompt() {
    const [installPrompt, setInstallPrompt] = React.useState<any>(null)
    const [isVisible, setIsVisible] = React.useState(false)
    const [isIOS, setIsIOS] = React.useState(false)

    React.useEffect(() => {
        // 1. Check if permanently dismissed or already seen in this session
        const isDismissed = localStorage.getItem(PWA_HIDE_KEY)
        const isSeenThisSession = sessionStorage.getItem(SESSION_VIEW_KEY)

        if (isDismissed || isSeenThisSession) return;

        // 2. Hide if already running as an app
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        if (isStandalone) return;

        // 3. Environment Detection
        const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        setIsIOS(isApple)

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)
            triggerShow()
        }

        const triggerShow = () => {
            setTimeout(() => {
                setIsVisible(true)
                // Mark as seen for this session
                sessionStorage.setItem(SESSION_VIEW_KEY, "true")
            }, 4000) // 4 second delay
        }

        if (isApple) triggerShow()

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            handleDismiss(true)
        }
        setInstallPrompt(null)
    }

    const handleDismiss = (permanent = false) => {
        setIsVisible(false)
        if (permanent) {
            localStorage.setItem(PWA_HIDE_KEY, "true")
        }
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.95 }}
                className="fixed bottom-6 left-6 right-6 z-[300] md:left-auto md:right-10 md:w-[400px]"
            >
                <div className="bg-white border border-slate-100 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] p-8 rounded-[2.5rem] relative overflow-hidden">
                    {/* Background Sparkle Decor */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />

                    <button
                        onClick={() => handleDismiss(false)}
                        className="absolute top-6 right-6 text-slate-300 hover:text-black transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-slate-300">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-900">App Experience</h3>
                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Highly Recommended</p>
                            </div>
                        </div>

                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.05em] leading-[1.6]">
                            {isIOS
                                ? "Tap 'Share' and then 'Add to Home Screen' to launch our full-screen mobile experience."
                                : "Add our app to your home screen for lightning fast loading and offline access."
                            }
                        </p>

                        <div className="flex flex-col gap-3">
                            {isIOS ? (
                                <div className="flex items-center justify-center gap-3 bg-slate-50 py-4 rounded-2xl border border-slate-100 italic">
                                    <Share className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Share → Add to Home Screen</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleInstall}
                                    className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-xl shadow-indigo-100"
                                >
                                    <Download className="w-4 h-4" />
                                    Install Native App
                                </button>
                            )}

                            <button
                                onClick={() => handleDismiss(true)}
                                className="w-full h-10 text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
                            >
                                <EyeOff className="w-3.5 h-3.5" />
                                Don't show again
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}