"use client"

import * as React from "react"
import { X, Download, Share } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function PWAPrompt() {
    const [installPrompt, setInstallPrompt] = React.useState<any>(null)
    const [isVisible, setIsVisible] = React.useState(false)
    const [isIOS, setIsIOS] = React.useState(false)

    React.useEffect(() => {
        // 1. Detect iOS (iOS doesn't support beforeinstallprompt)
        const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
        setIsIOS(isApple)

        // 2. Handle Android/Chrome/Edge
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)

            // Show prompt after a small delay (e.g., 3 seconds after first visit)
            const timer = setTimeout(() => setIsVisible(true), 3000)
            return () => clearTimeout(timer)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        // 3. Hide if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false)
        }

        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setIsVisible(false)
        }
        setInstallPrompt(null)
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-6 right-6 z-[150] md:left-auto md:right-10 md:w-80"
            >
                <div className="bg-white border border-zinc-100 shadow-2xl p-6 rounded-2xl relative overflow-hidden">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">
                                Native Experience
                            </h3>
                            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-widest">
                                {isIOS
                                    ? "Tap the share icon and 'Add to Home Screen' for the full archive experience."
                                    : "Install the app for offline access and a faster browsing experience."}
                            </p>
                        </div>

                        {isIOS ? (
                            <div className="flex items-center gap-3 py-2 border-t border-zinc-50 mt-2">
                                <Share className="w-4 h-4 text-primary" />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">Tap Share & Add to Home Screen</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstall}
                                className="w-full h-12 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Install App
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}