"use client"

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowLeft, Home, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 selection:bg-zinc-100">

            {/* Decorative Background Element */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span className="text-[25vw] font-black text-zinc-50/50 select-none tracking-tighter">
                    404
                </span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-xl w-full text-center space-y-12"
            >
                {/* Header Section */}
                <div className="space-y-4">
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="inline-block px-3 py-1 border border-zinc-100 rounded-full mb-4"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                            Out of Bounds
                        </span>
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-serif italic tracking-tight text-zinc-900 leading-tight">
                        Lost in the <br />Archive.
                    </h1>

                    <p className="text-[11px] text-zinc-400 uppercase tracking-[0.2em] leading-relaxed max-w-xs mx-auto">
                        The page you are looking for has been moved, archived, or never existed in this collection.
                    </p>
                </div>

                {/* Quick Links / Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                    <Button asChild variant="outline" className="h-14 border-zinc-100 rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all">
                        <Link href="/" className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5" />
                            Return Home
                        </Link>
                    </Button>

                    <Button asChild className="h-14 bg-zinc-900 text-white rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg shadow-zinc-200">
                        <Link href="/shop" className="flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Shop Arrivals
                        </Link>
                    </Button>
                </div>

                {/* Footer Signature */}
                <div className="pt-20 flex flex-col items-center gap-6">
                    <div className="h-[1px] w-12 bg-zinc-100" />
                    <button
                        onClick={() => window.history.back()}
                        className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                        Go Back
                    </button>
                </div>
            </motion.div>
        </div>
    )
}