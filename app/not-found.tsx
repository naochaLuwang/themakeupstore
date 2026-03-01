"use client"

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, ShoppingBag, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 selection:bg-pink-100 overflow-hidden">

            {/* Decorative Background: Soft Pink Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-rose-50/40 rounded-full blur-[100px]" />
                <span className="text-[30vw] font-black text-pink-50/30 select-none tracking-tighter opacity-40">
                    404
                </span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-xl w-full text-center space-y-10"
            >
                {/* Header Section */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#fc2779]/10 bg-[#fc2779]/5 rounded-full mb-4"
                    >
                        <Sparkles className="w-3 h-3 text-[#fc2779]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#fc2779]">
                            A Minor Detour
                        </span>
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight text-zinc-900 leading-[0.9]">
                        Beauty <br />
                        <span className="text-[#fc2779]">Interrupted.</span>
                    </h1>

                    <p className="text-[10px] md:text-[11px] text-zinc-400 uppercase tracking-[0.25em] leading-relaxed max-w-xs mx-auto font-medium">
                        The collection you are seeking is currently unavailable or has been curated elsewhere.
                    </p>
                </div>

                {/* Main Navigation Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Button asChild variant="outline" className="h-14 border-zinc-200 rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-50 hover:text-zinc-900 transition-all group">
                        <Link href="/" className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                            Return Home
                        </Link>
                    </Button>

                    <Button asChild className="h-14 bg-[#fc2779] text-white rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#d91e65] transition-all shadow-xl shadow-pink-200 group">
                        <Link href="/shop" className="flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                            Shop Newness
                        </Link>
                    </Button>
                </div>

                {/* Footer Signature */}
                <div className="pt-16 flex flex-col items-center gap-8">
                    <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

                    <button
                        onClick={() => window.history.back()}
                        className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 hover:text-[#fc2779] transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-2" />
                        Go Back
                    </button>

                    <div className="text-[8px] font-black tracking-[0.5em] text-zinc-300 uppercase">
                        The Makeup Store Wangkhei
                    </div>
                </div>
            </motion.div>
        </div>
    )
}