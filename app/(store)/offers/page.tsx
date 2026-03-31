"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Gift, Star, Tag, Percent, ArrowRight,
    Sparkles, Trophy, ShoppingBag, Heart,
    ChevronDown, PartyPopper, CheckCircle2
} from 'lucide-react'
import { SignatureLoader } from '@/components/store/signature-loader'

import Image from 'next/image'
import Link from 'next/link'

const TIER_CONFIG = {
    '10% OFF': {
        brands: ['Charlotte Tilbury', 'Fenty Beauty', 'Nars', 'PAC', 'Too Faced'],
        title: 'Luxury Access',
        description: 'Elite houses at exceptional value'
    },
    '20% OFF': {
        brands: ['COSRX', 'Forever52', 'Rare Beauty', 'Kylie Cosmetics', 'Huda Beauty', 'MAC', 'Maybelline', 'Minimalist', 'Nykaa', 'TirTir'],
        title: 'Prime Selection',
        description: 'Everyday icons and cult favorites'
    },
    '30% OFF': {
        brands: ['Focallure', 'LA Girl', 'Makeup Revolution', 'Mars', 'Milani', 'Relove'],
        title: 'The Ultimate Tier',
        description: 'Spectacular savings on global favorites'
    }
}

export default function BrandAnniversaryOffersPage() {
    const [brandData, setBrandData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null)
    const [saleStatus, setSaleStatus] = useState<'pre' | 'live' | 'ended'>('pre')
    const supabase = createClient()

    // Sales Window: April 1 - April 5, 2026
    const START_DATE = new Date('2026-04-01T00:00:00').getTime()
    const END_DATE = new Date('2026-04-05T23:59:59').getTime()

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime()
            let target = START_DATE
            let status: 'pre' | 'live' | 'ended' = 'pre'

            if (now >= START_DATE && now <= END_DATE) {
                target = END_DATE
                status = 'live'
            } else if (now > END_DATE) {
                status = 'ended'
            }

            setSaleStatus(status)

            if (status !== 'ended') {
                const distance = target - now
                setTimeLeft({
                    d: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((distance % (1000 * 60)) / 1000)
                })
            } else {
                setTimeLeft(null)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        async function fetchAnniversaryBrands() {
            setLoading(true)
            try {
                // Fetch ALL brands/subcategories to ensure we catch partial matches or different casings
                const { data, error } = await supabase
                    .from('categories')
                    .select('name, slug, image_url, parent:parent_id(slug)')
                    .not('parent_id', 'is', null)

                if (error) throw error
                setBrandData(data || [])
            } catch (err) {
                console.error("Anniversary Brand Fetch Error:", err)
            } finally {
                setTimeout(() => setLoading(false), 1000)
            }
        }
        fetchAnniversaryBrands()
    }, [supabase])

    const getBrandInfo = (brandName: string) => {
        // Try exact match first, then case-insensitive, then partial
        let found = brandData.find(b => b.name === brandName)
        if (!found) found = brandData.find(b => b.name.toLowerCase() === brandName.toLowerCase())
        if (!found) found = brandData.find(b => b.name.toLowerCase().includes(brandName.toLowerCase()))

        if (found) {
            const parentSlug = found.parent?.slug;
            const pathSegment = (parentSlug === 'exclusive' || parentSlug === 'essentials') ? parentSlug : 'categories';
            return {
                image: found.image_url,
                slug: found.slug,
                href: `/${pathSegment}/${found.slug}`
            }
        }
        return {
            image: null,
            slug: null,
            href: `/shop?q=${encodeURIComponent(brandName)}`
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] selection:bg-[#fc2779] selection:text-white antialiased">
            <SignatureLoader loading={loading} text="Celebrating 5 Years" />

            {!loading && (
                <div className="pb-40">
                    {/* 1. ANNIVERSARY HERO */}
                    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-black">
                        <motion.div
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.5 }}
                            transition={{ duration: 2 }}
                            className="absolute inset-0"
                        >
                            {/* <Image
                                src="https://images.unsplash.com/photo-1596462502278-27bfac4033c8?q=80&w=2080&auto=format&fit=crop"
                                fill
                                className="object-cover"
                                alt="5th Anniversary Event"
                                priority
                            /> */}
                        </motion.div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                        <div className="relative text-center px-6 max-w-5xl mx-auto space-y-8">
                            {/* <div className="mb-10">
                                <Breadcrumbs items={[{ label: 'Anniversary Sale', href: '/offers' }]} />
                            </div> */}

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center justify-center gap-4 mb-6"
                            >
                                <div className="h-[2px] w-20 bg-gradient-to-r from-transparent to-[#fc2779]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.6em] text-[#fc2779] shadow-sm">5 Years Of Excellence</span>
                                <div className="h-[2px] w-20 bg-gradient-to-l from-transparent to-[#fc2779]" />
                            </motion.div>

                            <motion.h1
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="text-6xl md:text-[11rem] font-black text-white uppercase tracking-tighter italic leading-[0.8] md:leading-[0.75] mb-6 md:mb-10 drop-shadow-2xl"
                            >
                                THE <span className="text-[#fc2779]">BIG 5</span> <br /> EVENT
                            </motion.h1>

                            {/* SALES COUNTDOWN */}
                            {timeLeft && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex flex-col items-center gap-4 py-4"
                                >
                                    <div className="flex items-center gap-3 bg-[#fc2779] text-white px-6 py-2 rounded-full text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] shadow-xl animate-pulse">
                                        <Sparkles className="w-4 h-4 fill-white" />
                                        {saleStatus === 'pre' ? 'Sales Launching In' : 'Anniversary Sales Ending In'}
                                    </div>

                                    <div className="flex gap-4 md:gap-8 items-center">
                                        {[
                                            { label: 'Days', value: timeLeft.d },
                                            { label: 'Hrs', value: timeLeft.h },
                                            { label: 'Min', value: timeLeft.m },
                                            { label: 'Sec', value: timeLeft.s }
                                        ].map((item, i) => (
                                            <div key={item.label} className="text-center min-w-[60px] md:min-w-[90px]">
                                                <div className="text-3xl md:text-6xl font-black text-white tracking-tighter tabular-nums">
                                                    {String(item.value).padStart(2, '0')}
                                                </div>
                                                <div className="text-[8px] md:text-[10px] font-black text-[#fc2779] uppercase tracking-widest mt-1">
                                                    {item.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {saleStatus === 'ended' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white/10 backdrop-blur-xl px-10 py-4 rounded-full border border-white/20 inline-block"
                                >
                                    <span className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Anniversary Event Closed</span>
                                </motion.div>
                            )}

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.0 }}
                                className="text-zinc-400 text-sm md:text-xl font-medium max-w-2xl mx-auto tracking-wide leading-relaxed px-4 md:px-0 pt-4"
                            >
                                {saleStatus === 'pre'
                                    ? "Prepare for our most monumental event. 5 days of unprecedented beauty benefits across legendary houses."
                                    : "Our 5th Anniversary celebration is LIVE. Explore exclusive tiered benefits from the world's most iconic beauty houses."
                                }
                            </motion.p>

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 1.2 }}
                                className="pt-8 md:pt-12"
                            >
                                <div className="inline-flex flex-wrap justify-center items-center gap-6 md:gap-10 bg-white/5 backdrop-blur-2xl border border-white/10 px-8 md:px-12 py-4 md:py-6 rounded-[2rem] md:rounded-[3rem] shadow-2xl mx-4">
                                    <div className="text-center">
                                        <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Celebratory Tiers</p>
                                        <p className="text-xl md:text-3xl font-black text-[#fc2779]">3 LEVELS</p>
                                    </div>
                                    <div className="w-[1px] h-8 md:h-10 bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Iconic Houses</p>
                                        <p className="text-xl md:text-3xl font-black text-white">22+ BRANDS</p>
                                    </div>
                                    <div className="w-[1px] h-8 md:h-10 bg-white/10 hidden sm:block" />
                                    <div className="text-center hidden sm:block">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-[#fc2779]" />
                                            <p className="text-[8px] md:text-[10px] font-black text-[#fc2779] uppercase tracking-widest">Verified Offers</p>
                                        </div>
                                        <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1 italic">Limited Window</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
                            <ChevronDown className="w-8 h-8 text-white/30" />
                        </div>
                    </section>

                    {/* 2. TIERED BRAND GRIDS */}
                    <div className="max-w-[1400px] mx-auto px-4 md:px-6 -mt-16 md:-mt-24 relative z-10 space-y-24 md:space-y-40">
                        {Object.entries(TIER_CONFIG).map(([tier, config], idx) => (
                            <section key={tier} className="scroll-mt-32">
                                {/* Tier Title Card */}
                                <div className="bg-white rounded-[2.5rem] md:rounded-[5rem] p-8 md:p-20 border border-zinc-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] mb-12 md:mb-20 overflow-hidden">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 text-center md:text-left">
                                        <div className="space-y-4 md:space-y-6 max-w-xl">
                                            <div className="inline-flex items-center gap-3 bg-zinc-50 border border-zinc-100 rounded-full px-4 md:px-5 py-1.5 md:py-2 mx-auto md:mx-0">
                                                <Trophy className="w-3 h-3 md:w-4 md:h-4 text-[#fc2779]" />
                                                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">{config.title}</span>
                                            </div>
                                            <h2 className="text-4xl md:text-8xl font-black text-zinc-950 tracking-tighter uppercase italic leading-[0.9] md:leading-none">
                                                {tier} <br className="hidden md:block" />
                                                <span className="text-zinc-200">ANNIVERSARY</span>
                                            </h2>
                                            <p className="text-zinc-500 font-medium text-sm md:text-lg leading-relaxed">
                                                {config.description}
                                            </p>
                                        </div>

                                        <div className="shrink-0 relative mt-4 md:mt-0">
                                            <div className="absolute inset-0 bg-[#fc2779]/20 blur-[60px] md:blur-[80px] rounded-full scale-150 animate-pulse" />
                                            <div className="relative text-7xl md:text-[12rem] font-black text-[#fc2779] italic tracking-tighter animate-shimmer bg-clip-text">
                                                {tier.split(' ')[0]}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Brand Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-12 px-2 md:px-0">
                                    {config.brands.map((brandName) => {
                                        const info = getBrandInfo(brandName)
                                        return (
                                            <motion.div
                                                key={brandName}
                                                initial={{ opacity: 0, y: 30 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                            >
                                                <Link
                                                    href={info.href}
                                                    className="group flex flex-col items-center gap-6"
                                                >
                                                    <div className="relative w-full aspect-square rounded-[2rem] md:rounded-[3.5rem] overflow-hidden bg-zinc-50 border border-zinc-100 transition-all duration-700 group-hover:shadow-2xl shadow-zinc-200/50 md:group-hover:-translate-y-4">
                                                        {info.image ? (
                                                            <Image
                                                                src={info.image}
                                                                fill
                                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                                                alt={brandName}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                                                                <span className="text-4xl md:text-6xl font-black text-zinc-200 uppercase">{brandName[0]}</span>
                                                            </div>
                                                        )}

                                                        {/* Brand Overlay */}
                                                        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-500">
                                                            <div className="flex items-center justify-center gap-2 md:gap-3">
                                                                <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">Visit House</span>
                                                                <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                                            </div>
                                                        </div>

                                                        {/* Static Discount Tag */}
                                                        <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black text-white text-[8px] md:text-[10px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-lg z-20 flex items-center gap-1 md:gap-2">
                                                            <Tag className="w-2 h-2 md:w-3 md:h-3 text-[#fc2779]" />
                                                            {tier}
                                                        </div>
                                                    </div>

                                                    <div className="text-center space-y-1 md:space-y-2">
                                                        <h3 className="text-sm md:text-xl font-black text-zinc-900 uppercase tracking-tight group-hover:text-[#fc2779] transition-colors duration-300">
                                                            {brandName}
                                                        </h3>
                                                        <div className="h-[1px] md:h-[2px] w-6 md:w-8 bg-zinc-200 mx-auto transition-all duration-500 group-hover:w-12 md:group-hover:w-16 group-hover:bg-[#fc2779]" />
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* Final CTA */}
                    <section className="max-w-6xl mx-auto px-4 md:px-6 mt-32 md:mt-60">
                        <div className="bg-zinc-950 rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-32 text-center text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#fc2779]/20 rounded-full -mr-32 md:-mr-64 -mt-32 md:-mt-64 blur-[80px] md:blur-[120px] animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-white/5 rounded-full -ml-32 md:-ml-64 -mb-32 md:-mb-64 blur-[80px] md:blur-[120px]" />

                            <div className="relative z-10 space-y-8 md:space-y-12">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    whileInView={{ scale: 1 }}
                                    className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto"
                                >
                                    <PartyPopper className="w-6 h-6 md:w-10 md:h-10 text-[#fc2779]" />
                                </motion.div>

                                <div className="space-y-4 md:space-y-6">
                                    <h3 className="text-4xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.9] md:leading-[0.85]">
                                        5 YEARS IS JUST <br />
                                        <span className="text-[#fc2779]">THE BEGINNING.</span>
                                    </h3>
                                    <p className="text-zinc-400 font-medium max-w-xl mx-auto text-sm md:text-lg tracking-wide">
                                        Thank you for being part of our journey. These anniversary benefits are our tribute to you. Limited stock for the celebration window.
                                    </p>
                                </div>

                                <div className="pt-6 md:pt-10">
                                    <Link
                                        href="/shop"
                                        className="inline-flex items-center gap-4 md:gap-6 bg-white text-black px-10 md:px-16 py-5 md:py-7 rounded-full text-[11px] md:text-[13px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-[#fc2779] hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95 group"
                                    >
                                        Full Showcase <Sparkles className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}