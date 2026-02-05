"use client"

import * as React from "react"
import { X, Download, Share, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const PWA_HIDE_KEY = "pwa_prompt_dismissed_v2"; // Versioning the key to reset stale states

export function PWAPrompt() {
    const [installPrompt, setInstallPrompt] = React.useState<any>(null)
    const [isVisible, setIsVisible] = React.useState(false)
    const [isIOS, setIsIOS] = React.useState(false)

    React.useEffect(() => {
        // 1. Check if user already dismissed it
        if (typeof window !== "undefined" && localStorage.getItem(PWA_HIDE_KEY)) {
            return;
        }

        // 2. Hide if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        setIsIOS(isApple)

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)
            // Show after 5 seconds to be less intrusive
            setTimeout(() => setIsVisible(true), 5000)
        }

        if (isApple) {
            setTimeout(() => setIsVisible(true), 5000)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }, [])

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem(PWA_HIDE_KEY, "true")
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-6 right-6 z-[200] md:left-auto md:right-10 md:w-80"
            >
                <div className="bg-white border border-slate-100 shadow-2xl p-6 rounded-3xl relative overflow-hidden">
                    <button onClick={handleDismiss} className="absolute top-4 right-4 text-slate-300 hover:text-black transition-colors">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><Sparkles className="w-5 h-5" /></div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest">Install App</h3>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            {isIOS ? "Tap Share and 'Add to Home Screen' for the best experience." : "Install our app for a faster and smoother shopping experience."}
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}