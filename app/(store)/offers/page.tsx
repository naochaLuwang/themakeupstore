"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap, ChevronRight, Loader2, Flame, ArrowRight, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductCard } from '@/components/store/product-card'

const SALE_END_DATE = new Date("2026-03-05T23:59:59").getTime();
const SALE_START_DATE = new Date("2026-03-02T00:00:00").getTime();

// --- DYNAMIC CONTENT MAPPING ---
// You can change these strings to anything: "BOGO", "Save ₹500", "New", etc.
const CATEGORY_META: Record<string, { label: string, color: string }> = {
    'mac-cosmetics': { label: 'Upto 40% Off', color: 'text-[#fc2779]' },
    'default': { label: 'Upto 30% Off', color: 'text-[#fc2779]' },
};

export default function HoliOffersPage() {
    const [sections, setSections] = useState<{ exclusive: any[], essentials: any[] }>({ exclusive: [], essentials: [] })
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [liveViewers, setLiveViewers] = useState(142) // UI-only social proof

    const supabase = createClient()

    useEffect(() => {
        // Social proof simulation
        const interval = setInterval(() => {
            setLiveViewers(prev => prev + (Math.random() > 0.5 ? 1 : -1))
        }, 5000)

        async function fetchData() {
            setLoading(true);
            try {
                const { data: catData } = await supabase.from('categories').select('*');
                if (catData) {
                    const exclusiveParent = catData.find(c => c.slug.toLowerCase() === 'exclusive');
                    const essentialsParent = catData.find(c => c.slug.toLowerCase() === 'essentials');
                    setSections({
                        exclusive: catData.filter(c => c.parent_id === exclusiveParent?.id),
                        essentials: catData.filter(c => c.parent_id === essentialsParent?.id)
                    });
                }
                const { data: prodData } = await supabase
                    .from('products')
                    .select(`*, product_variants (*)`)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(12);
                setProducts(prodData || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchData();
        return () => clearInterval(interval);
    }, [supabase]);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-950 pb-20 overflow-hidden font-sans">

            {/* 1. HERO WITH LIVE BADGE */}
            <section className="px-4 pt-6">
                <div className="relative h-[280px] md:h-[450px] w-full rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-white group">
                    <Image
                        src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=2070&auto=format&fit=crop"
                        fill className="object-cover contrast-[1.1] brightness-[0.8] group-hover:scale-105 transition-transform duration-[5s]" alt="Yaoshang Edit" priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Live Social Proof Badge */}
                    <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{liveViewers} Shopping Now</span>
                    </div>

                    <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16 space-y-4 max-w-xl">
                        <div className="flex items-center gap-2 bg-[#fc2779] px-4 py-1.5 rounded-full w-fit shadow-lg shadow-pink-500/40">
                            <Flame className="w-3.5 h-3.5 text-white fill-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">The Yaoshang Edit '26</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-serif italic text-white leading-[0.85] tracking-tighter">
                            Pure <br /> <span className="text-yellow-300">Pigments</span>
                        </h1>
                        <p className="text-[10px] md:text-sm font-medium text-white/60 max-w-xs leading-relaxed uppercase tracking-widest">
                            Curated luxury for the festival of colors.
                        </p>
                    </div>
                </div>
            </section>

            <main className="mt-12 space-y-16">

                {/* 2. THE EXCLUSIVE EDIT */}
                {sections.exclusive.length > 0 && (
                    <section className="px-5">
                        <div className="flex items-end justify-between mb-8">
                            <div className="space-y-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fc2779]">Luxury Edit</h2>
                                <h3 className="text-2xl font-serif italic">The Exclusive Splash</h3>
                            </div>
                            <Link href="/exclusive" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 group">
                                View All <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="flex overflow-x-auto gap-10 no-scrollbar pb-4 -mx-5 px-5">
                            {sections.exclusive.map((cat) => (
                                <CategoryStoryItem key={cat.id} cat={cat} basePath="exclusive" />
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. YAOSHANG FLASH BAR */}
                <section className="px-5">
                    <div className="relative group rounded-[2.2rem] p-[1.5px] overflow-hidden shadow-2xl shadow-pink-500/10">
                        {/* 1. DYNAMIC AURORA BORDER - Changes intensity based on sale state */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#fc2779] via-[#7001fa] to-[#ffda79] animate-gradient-x opacity-80" />

                        {/* 2. MAIN PILL BODY */}
                        <div className="relative bg-white/95 backdrop-blur-3xl rounded-[2.1rem] py-3 px-5 md:px-8 flex flex-row items-center justify-between gap-3">

                            {/* Left: Branding & Status Logic */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="relative">
                                    {/* Pulsing Glow only when Live */}
                                    <div className={`absolute inset-0 rounded-xl blur-lg transition-opacity duration-1000 ${new Date().getTime() >= SALE_START_DATE ? 'bg-pink-500 opacity-30 animate-pulse' : 'bg-slate-200 opacity-0'}`} />

                                    <div className="relative w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6">
                                        {new Date().getTime() >= SALE_START_DATE ? (
                                            <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                                        ) : (
                                            <Sparkles className="w-5 h-5 text-pink-400" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${new Date().getTime() >= SALE_START_DATE ? 'bg-pink-500 animate-ping' : 'bg-slate-300'}`} />
                                        <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${new Date().getTime() >= SALE_START_DATE ? 'text-[#fc2779]' : 'text-slate-400'}`}>
                                            {new Date().getTime() >= SALE_START_DATE ? 'Live Now' : 'Coming Soon'}
                                        </p>
                                    </div>
                                    <h3 className="text-sm md:text-lg font-serif italic font-bold text-slate-900 leading-none tracking-tighter">
                                        Yaoshang <span className="text-[#fc2779]">Drop</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Middle: The Dynamic Countdown Housing */}
                            <div className="flex-1 flex justify-center">
                                <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-[1.2rem] shadow-inner transition-all group-hover:bg-white">
                                    <SaleCountdown start={SALE_START_DATE} end={SALE_END_DATE} />
                                </div>
                            </div>

                            {/* Right: Smart Link */}
                            <Link
                                href={new Date().getTime() >= SALE_START_DATE ? "/shop" : "#waitlist"}
                                className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-90 shadow-lg ${new Date().getTime() >= SALE_START_DATE ? 'bg-slate-950 text-white hover:bg-[#fc2779]' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 4. ESSENTIALS */}
                {sections.essentials.length > 0 && (
                    <section className="px-5">
                        <div className="flex items-end justify-between mb-8">
                            <div className="space-y-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Daily Rituals</h2>
                                <h3 className="text-2xl font-serif italic">Essential Curations</h3>
                            </div>
                        </div>
                        <div className="flex overflow-x-auto gap-10 no-scrollbar pb-4 -mx-5 px-5">
                            {sections.essentials.map((cat) => (
                                <CategoryStoryItem key={cat.id} cat={cat} basePath="essentials" />
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. PRODUCT GRID */}
                <section className="px-5 space-y-10 pt-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
                        <div className="space-y-2">
                            <span className="text-[9px] font-black text-[#fc2779] uppercase tracking-[0.5em] px-3 py-1 bg-pink-50 rounded-full">New Arrivals</span>
                            <h2 className="text-4xl md:text-6xl font-serif italic text-slate-900 tracking-tighter">Handpicked Favorites</h2>
                        </div>
                        <Link href="/shop" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 px-6 py-3 rounded-full hover:bg-slate-900 hover:text-white transition-all">
                            View Full Catalog <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-12 gap-y-16">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}

function CategoryStoryItem({ cat, basePath }: { cat: any, basePath: string }) {
    const meta = CATEGORY_META[cat.slug.toLowerCase()] || CATEGORY_META.default;

    return (
        <Link
            href={`/${basePath}/${cat.slug}`}
            className="group flex flex-col items-center gap-4 shrink-0 active:scale-95 transition-transform"
        >
            {/* The Gradient Ring */}
            <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#fc2779] via-pink-400 to-orange-300 group-hover:shadow-[0_0_20px_rgba(252,39,121,0.3)] transition-all duration-500">
                <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden relative shadow-inner bg-slate-50">
                    <Image
                        src={cat.image_url || '/placeholder.png'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={cat.name}
                    />
                </div>

                {/* Visual UX: Live indicator for top-tier deals */}
                {meta.label.includes('BOGO') && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse z-10" />
                )}
            </div>

            <div className="text-center space-y-1.5">
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-tighter text-slate-800 block leading-none">
                    {cat.name}
                </span>

                {/* Dynamic Offer Pill */}
                <div className={`text-[9px] md:text-[10px] font-bold uppercase italic tracking-tighter px-2.5 py-1 rounded-full bg-white shadow-sm border border-slate-100 ${meta.color}`}>
                    {meta.label}
                </div>
            </div>
        </Link>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-6">
            <div className="relative">
                <Loader2 className="w-12 h-12 text-[#fc2779] animate-spin" />
                <div className="absolute inset-0 bg-[#fc2779]/10 rounded-full animate-ping" />
            </div>
            <p className="text-[10px] font-black text-[#fc2779] uppercase tracking-[0.8em] animate-pulse">Curating Splash</p>
        </div>
    )
}
function SaleCountdown({ start, end }: { start: number, end: number }) {
    const [timeLeft, setTimeLeft] = useState<any>(null);
    const [status, setStatus] = useState<'Upcoming' | 'Live' | 'Ended'>('Upcoming');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();

            if (now < start) {
                setStatus('Upcoming');
                updateTime(start - now);
            } else if (now >= start && now < end) {
                setStatus('Live');
                updateTime(end - now);
            } else {
                setStatus('Ended');
                clearInterval(timer);
            }
        }, 1000);

        const updateTime = (diff: number) => {
            setTimeLeft({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000)
            });
        };

        return () => clearInterval(timer);
    }, [start, end]);

    if (status === 'Ended' || !timeLeft) return <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Splash Ended</span>;

    return (
        <div className="flex items-center gap-3">
            {/* Phase Label */}
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">
                {status === 'Upcoming' ? 'Starts In' : 'Ends In'}
            </span>

            <div className="flex items-center gap-2 md:gap-3">
                {timeLeft.d > 0 && <TimeUnit value={timeLeft.d} label="D" />}
                <TimeUnit value={timeLeft.h} label="H" />
                <span className="text-slate-200 font-light">:</span>
                <TimeUnit value={timeLeft.m} label="M" />
                <span className="text-slate-200 font-light">:</span>
                <TimeUnit value={timeLeft.s} label="S" />
            </div>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div className="flex flex-col items-center min-w-[18px]">
            <span className="text-xs md:text-sm font-black text-slate-900 tabular-nums leading-none">
                {String(value).padStart(2, '0')}
            </span>
            <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{label}</span>
        </div>
    );
}