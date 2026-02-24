"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// --- CONFIGURATION ---
const EXCLUDED_SLUGS = ['test', 'uncategorized', 'hidden'];

// Date Logic (IST timezone conversion might be needed depending on your server)
const SALE_START_DATE = new Date("2026-02-26T00:00:00").getTime();
const SALE_END_DATE = new Date("2026-03-05T23:59:59").getTime();

// Custom Labels for Categories. Add your category slugs here.
const CATEGORY_DISCOUNT_LABELS: Record<string, string> = {
    'makeup': 'Up to 40% Off',
    'skincare': 'Up to 30% Off',
    'fragrance': 'Flat 20% Off',
    'haircare': 'Up to 50% Off'
};
const DEFAULT_DISCOUNT_LABEL = 'Up to 30% Off';

export default function HoliOffersPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [discountedProducts, setDiscountedProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchHoliData() {
            setLoading(true);
            try {
                // 1. Fetch products that are actually on discount for the scroller
                const { data: prodData } = await supabase
                    .from('products')
                    .select('id, name, category_id, base_price, discount_value, discount_type, thumbnail_url, brand')
                    .neq('discount_type', 'none')
                    .eq('status', 'active')
                    .limit(12);

                // 2. Fetch ALL valid categories (We want all of them, regardless of product count)
                const { data: catData } = await supabase
                    .from('categories')
                    .select('*')
                    .not('slug', 'in', `(${EXCLUDED_SLUGS.join(',')})`);

                if (catData) {
                    // Map the custom discount label based on the category slug
                    const processedCats = catData.map(cat => ({
                        ...cat,
                        displayDiscount: CATEGORY_DISCOUNT_LABELS[cat.slug] || DEFAULT_DISCOUNT_LABEL
                    }));
                    setCategories(processedCats);
                }

                if (prodData) {
                    setDiscountedProducts(prodData);
                }
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchHoliData();
    }, [supabase]);

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
            <div className="w-10 h-10 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest">Curating Beauty...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pb-20 overflow-hidden">

            {/* EDITORIAL HERO BANNER */}
            <section className="relative w-full py-16 md:py-24 bg-gradient-to-r from-pink-500 via-rose-400 to-orange-300 overflow-hidden flex flex-col items-center justify-center text-center px-4">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-yellow-300/30 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 space-y-6 max-w-3xl"
                >
                    <span className="inline-block bg-white text-pink-600 font-bold text-[10px] md:text-xs px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                        The Grand Beauty Sale
                    </span>
                    <h1 className="text-5xl md:text-8xl font-serif italic text-white leading-tight drop-shadow-lg">
                        Holi Color Splash
                    </h1>
                    <p className="text-white/90 text-sm md:text-xl font-medium tracking-wide pb-4">
                        Explore the Biggest Price Drops of the Season
                    </p>

                    <div className="flex justify-center">
                        <CountdownTimer start={SALE_START_DATE} end={SALE_END_DATE} />
                    </div>
                </motion.div>
            </section>

            <main className="max-w-7xl mx-auto pl-4 pr-0 md:px-6 lg:px-8 mt-12 space-y-12 md:space-y-16">

                {/* HORIZONTAL PRODUCT SCROLL */}
                {discountedProducts.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6 pr-4 md:pr-0">
                            <h2 className="text-2xl font-serif text-slate-900">Crazy Price Drops</h2>
                            <Link href="/shop" className="text-sm font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar pr-4 md:pr-0">
                            {discountedProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </section>
                )}

                {/* EDITORIAL CATEGORY BANNERS - NATIVE APP STYLE SCROLL */}
                <section>
                    <div className="flex items-center justify-between mb-6 pr-4 md:pr-0 text-center md:text-left">
                        <h2 className="text-2xl font-serif text-slate-900">Shop By Category</h2>
                    </div>

                    {/* Flex on mobile (horizontal scroll), Grid on desktop */}
                    <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-6 snap-x no-scrollbar pr-4 md:pr-0">
                        {categories.map((cat, idx) => (
                            <CategoryBanner key={cat.id} cat={cat} index={idx} />
                        ))}
                    </div>
                </section>

            </main>
        </div>
    )
}

// --- SUB-COMPONENTS ---

function CategoryBanner({ cat, index }: any) {
    return (
        <Link
            href={`/category/${cat.slug}`}
            className="snap-start shrink-0 w-[240px] md:w-full block"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative h-[180px] md:h-[260px] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 cursor-pointer"
            >
                <div className="absolute inset-0">
                    {cat.image_url ? (
                        <Image src={cat.image_url} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-1000" />
                    ) : (
                        <div className="w-full h-full bg-pink-50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 flex flex-col justify-end text-left text-white">
                    {/* Hardcoded/Mapped Custom Label */}
                    <span className="bg-[#fc2779] text-white text-[9px] md:text-[11px] font-black px-2 py-1 md:px-3 md:py-1.5 rounded-sm w-fit mb-2 md:mb-3 uppercase tracking-widest shadow-md">
                        {cat.displayDiscount}
                    </span>
                    <h3 className="text-xl md:text-3xl font-serif mb-1 md:mb-2 leading-tight">{cat.name}</h3>
                    <p className="text-[10px] md:text-xs font-semibold opacity-90 flex items-center gap-1 group-hover:text-pink-300 transition-colors">
                        Explore <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                    </p>
                </div>
            </motion.div>
        </Link>
    )
}

function ProductCard({ product }: any) {
    const originalPrice = product.base_price || 0;
    const discount = product.discount_value || 0;
    let salePrice = originalPrice;

    if (product.discount_type === 'percentage') {
        salePrice = originalPrice - (originalPrice * (discount / 100));
    } else if (product.discount_type === 'amount') {
        salePrice = originalPrice - discount;
    }

    return (
        <div className="snap-start shrink-0 w-40 md:w-56 group bg-white p-3 rounded-xl border border-slate-100 hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
            {discount > 0 && (
                <div className="absolute top-2 left-2 z-10 bg-[#fc2779] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    {product.discount_type === 'percentage' ? `${discount}% OFF` : `₹${discount} OFF`}
                </div>
            )}

            <div className="relative aspect-[4/5] rounded-lg bg-slate-50 overflow-hidden mb-3">
                <Image src={product.thumbnail_url || '/placeholder.png'} alt={product.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
            </div>

            <div className="flex flex-col flex-grow text-center px-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{product.brand || 'Premium'}</h4>
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-tight mb-3 flex-grow">{product.name}</p>

                <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-base md:text-lg font-black text-slate-900">₹{Math.round(salePrice)}</span>
                    {salePrice < originalPrice && (
                        <span className="text-xs text-slate-400 line-through">₹{originalPrice}</span>
                    )}
                </div>
            </div>

            <Link href={`/products/${product.id}`} className="mt-auto">
                <button className="w-full py-2.5 bg-pink-50 border border-pink-100 text-[#fc2779] rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#fc2779] hover:text-white transition-colors flex items-center justify-center gap-2">
                    <ShoppingBag className="w-3 h-3 md:w-4 md:h-4" /> Add to Bag
                </button>
            </Link>
        </div>
    )
}

function CountdownTimer({ start, end }: { start: number, end: number }) {
    const [timeLeft, setTimeLeft] = useState({ Days: 0, Hrs: 0, Mins: 0, Secs: 0 });
    const [status, setStatus] = useState<"upcoming" | "live" | "ended">("upcoming");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();

            // Determine phase
            if (now > end) {
                setStatus("ended");
                clearInterval(interval);
                return;
            }

            const isLive = now >= start;
            setStatus(isLive ? "live" : "upcoming");

            // Calculate distance to next event
            const target = isLive ? end : start;
            const d = target - now;

            setTimeLeft({
                Days: Math.floor(d / (86400000)),
                Hrs: Math.floor((d % 86400000) / 3600000),
                Mins: Math.floor((d % 3600000) / 60000),
                Secs: Math.floor((d % 60000) / 1000)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [start, end]);

    if (status === "ended") {
        return <div className="text-white font-bold tracking-widest uppercase bg-black/40 px-6 py-2 rounded-full">Sale Ended</div>
    }

    return (
        <div className="flex flex-col items-center">
            <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 drop-shadow-md">
                {status === "upcoming" ? "Sale Starts In:" : "Ends In:"}
            </span>
            <div className="flex gap-2 md:gap-4 bg-white/20 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-white/30 shadow-xl">
                {Object.entries(timeLeft).map(([label, val], idx) => (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center min-w-[35px] md:min-w-[60px]">
                            <span className="text-2xl md:text-4xl font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-md">
                                {String(val).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] md:text-[10px] font-bold text-yellow-300 uppercase tracking-widest mt-1 md:mt-2">{label}</span>
                        </div>
                        {idx < 3 && <span className="text-xl md:text-4xl font-black text-white/50 pb-3 md:pb-3">:</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}