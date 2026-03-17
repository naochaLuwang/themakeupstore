"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sparkles, Zap, ChevronRight, Loader2,
    Flame, ArrowRight, Smartphone, Gift,
    ShieldCheck, Star
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductCard } from '@/components/store/product-card'

const SALE_END_DATE = new Date("2026-03-31T23:59:59").getTime();

export default function AppPromotionalOfferPage() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('app-exclusive')

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const { data: prodData } = await supabase
                    .from('products')
                    .select(`*, product_variants (*)`)
                    .eq('status', 'active')
                    .limit(8);
                setProducts(prodData || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchData();
    }, [supabase]);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-950 pb-32 overflow-hidden selection:bg-pink-500 selection:text-white">

            {/* 1. DYNAMIC TOP NAVIGATION (APP THEME) */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">App Exclusive</span>
                </div>
                <div className="bg-pink-50 text-[#fc2779] px-3 py-1 rounded-full text-[9px] font-black uppercase">
                    Code: APP500
                </div>
            </nav>

            {/* 2. THE IMMERSIVE APP HERO */}
            <section className="px-5 pt-8">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="relative h-[480px] w-full rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)]"
                >
                    <Image
                        src="https://images.unsplash.com/photo-1596462502278-27bfac4033c8?q=80&w=2080&auto=format&fit=crop"
                        fill className="object-cover scale-110" alt="App Offer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />

                    {/* Floating Feature Tags */}
                    <div className="absolute top-8 left-8 flex flex-col gap-2">
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-2xl flex items-center gap-2 w-fit">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">4.9 Rated App</span>
                        </div>
                    </div>

                    <div className="absolute bottom-10 left-8 right-8 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-6xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                                Better <br /> On The <span className="text-[#fc2779] italic font-serif lowercase">app.</span>
                            </h1>
                            <p className="text-white/70 text-xs font-medium max-w-[240px] leading-relaxed uppercase tracking-widest">
                                Unlock early access & hidden discounts available nowhere else.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 h-14 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform">
                                <Gift className="w-4 h-4" /> Claim App Reward
                            </button>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* 3. APP PERKS GRID */}
            <section className="px-5 mt-12 grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Flash Access</h4>
                    <p className="text-[9px] text-slate-400 font-medium">Get notified 2 hours before the crowd.</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">App Warranty</h4>
                    <p className="text-[9px] text-slate-400 font-medium">Extended 1-year coverage on all devices.</p>
                </div>
            </section>

            {/* 4. THE CATEGORY "REELS" */}
            <section className="mt-16 space-y-8">
                <div className="px-6 flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter italic font-serif">Trending Reels</h3>
                    <div className="h-[1px] flex-1 bg-slate-100 mx-6" />
                </div>

                <div className="flex overflow-x-auto gap-6 no-scrollbar px-6">
                    {['Serum', 'Lipstick', 'Palettes', 'Glow'].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 shrink-0">
                            <div className="w-20 h-20 rounded-full p-1 border-2 border-[#fc2779] rotate-12">
                                <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden relative">
                                    <Image src={`https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&auto=format&fit=crop`} fill alt="cat" className="object-cover" />
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. DYNAMIC OFFER TABS */}
            <section className="mt-20 px-5 space-y-8">
                <div className="flex bg-slate-100 p-1.5 rounded-3xl">
                    <button
                        onClick={() => setActiveTab('app-exclusive')}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'app-exclusive' ? 'bg-white shadow-md text-black' : 'text-slate-400'}`}
                    >
                        App Only
                    </button>
                    <button
                        onClick={() => setActiveTab('best-sellers')}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'best-sellers' ? 'bg-white shadow-md text-black' : 'text-slate-400'}`}
                    >
                        Best Sellers
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-12">
                    {products.map((product) => (
                        <div key={product.id} className="relative">
                            <ProductCard product={product} />
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-white text-[7px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                                - ₹500
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 6. STICKY APP CTA (THE CONVERTER) */}
            <div className="fixed bottom-8 left-4 right-4 z-[60]">
                <div className="bg-slate-950 rounded-[2.5rem] p-3 pl-8 flex items-center justify-between shadow-2xl border border-white/10 overflow-hidden relative">
                    {/* Animated background glow */}
                    <div className="absolute -left-10 top-0 w-32 h-full bg-[#fc2779] blur-[50px] opacity-30 animate-pulse" />

                    <div className="relative">
                        <p className="text-[10px] text-pink-400 font-black uppercase tracking-[0.2em] mb-1">New User Offer</p>
                        <h4 className="text-white font-serif italic text-lg leading-none">Flat ₹500 Off</h4>
                    </div>

                    <button className="h-14 px-8 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#fc2779] hover:text-white transition-all">
                        Download Now
                    </button>
                </div>
            </div>
        </div>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] gap-6">
            <Loader2 className="w-10 h-10 text-[#fc2779] animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">Booting Store</p>
        </div>
    )
}