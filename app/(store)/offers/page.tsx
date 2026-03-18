"use client"

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Smartphone, Gift, Star, ChevronRight,
    Loader2, Tag, Percent, ArrowRight,
    ShoppingBag, Sparkles
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductCard } from '@/components/store/product-card'

const NYKAA_PINK = '#fc2779';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1596462502278-27bfac4033c8?w=200&q=80';

export default function AppPromotionalOfferPage() {
    const [products, setProducts] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('app-exclusive')

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Active Products
                const { data: prodData, error: prodError } = await supabase
                    .from('products')
                    .select(`*, product_variants (*)`)
                    .eq('status', 'active')
                    .limit(8);

                if (prodError) throw prodError;
                setProducts(prodData || []);

                // 2. Fetch Categories from DB
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .limit(10); // Adjust limit as needed

                if (catError) throw catError;
                setCategories(catData || []);

            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [supabase]);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-[#F4F4F5] text-gray-900 pb-28 font-sans">
            {/* 1. BRAND NAVIGATION HEADER */}
            <header className="sticky top-0 z-50 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-1.5 rounded-md">
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight leading-none uppercase">Daciana</h1>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">App Exclusive Offers</p>
                    </div>
                </div>
                <div className="bg-pink-50 border border-pink-100 text-[#fc2779] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
                    Code: DACIANA500
                </div>
            </header>

            {/* 2. THE HERO BANNER */}
            <section className="px-4 pt-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-md bg-white"
                >
                    <Image
                        src="https://images.unsplash.com/photo-1596462502278-27bfac4033c8?q=80&w=2080&auto=format&fit=crop"
                        fill
                        className="object-cover"
                        alt="App Exclusive Beauty Offers"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-sm flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#fc2779] fill-[#fc2779]" />
                        <span className="text-[10px] font-bold text-gray-900 uppercase">Top Rated</span>
                    </div>

                    <div className="absolute bottom-6 left-5 right-5 text-white">
                        <h2 className="text-3xl font-black leading-tight mb-2 uppercase tracking-wide">
                            Unlock Your <br />
                            <span className="text-[#fc2779]">Beauty Bonus</span>
                        </h2>
                        <p className="text-sm font-medium opacity-90 mb-4 max-w-[250px]">
                            Download the Daciana app for early access to sales and secret discounts.
                        </p>
                        <button className="bg-[#fc2779] text-white w-full py-3.5 rounded-md font-bold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-[#e01b68] transition-colors">
                            <Gift className="w-4 h-4" /> Claim App Reward
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* 3. CATEGORY BUBBLES (Fetched from DB) */}
            <section className="mt-8 bg-white py-6 border-y border-gray-200">
                <div className="px-4 flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-800 uppercase tracking-tight">Shop by Category</h3>
                </div>
                <div className="flex overflow-x-auto gap-4 px-4 pb-2 no-scrollbar">
                    {categories.length > 0 ? (
                        categories.map((category) => (
                            <div key={category.id} className="flex flex-col items-center gap-2 shrink-0 w-20 cursor-pointer group">
                                <div className="w-16 h-16 rounded-full p-[2px] border border-gray-300 group-hover:border-[#fc2779] transition-colors duration-300">
                                    <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-100">
                                        <Image
                                            src={category.image_url || FALLBACK_IMAGE}
                                            fill
                                            alt={category.name}
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                </div>
                                <span className="text-[11px] font-semibold text-gray-700 text-center line-clamp-1">{category.name}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 italic px-4">No categories found.</div>
                    )}
                </div>
            </section>

            {/* 4. OFFER TABS & PRODUCT GRID */}
            <section className="mt-6 px-4">
                <div className="flex border-b border-gray-300 mb-6">
                    <button
                        onClick={() => setActiveTab('app-exclusive')}
                        className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'app-exclusive' ? 'text-[#fc2779]' : 'text-gray-500'}`}
                    >
                        App Only Offers
                        {activeTab === 'app-exclusive' && (
                            <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fc2779]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('trending')}
                        className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'trending' ? 'text-[#fc2779]' : 'text-gray-500'}`}
                    >
                        Trending Now
                        {activeTab === 'trending' && (
                            <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fc2779]" />
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {products.map((product) => (
                        <div key={product.id} className="relative bg-white rounded-md p-2 shadow-sm border border-gray-100 group cursor-pointer">
                            <ProductCard product={product} />

                            <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 uppercase">
                                <Tag className="w-2.5 h-2.5" />
                                -₹500 Off
                            </div>
                        </div>
                    ))}
                </div>

                <button className="w-full mt-6 py-3 border border-gray-300 rounded-md text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-gray-50">
                    View All Products <ArrowRight className="w-4 h-4" />
                </button>
            </section>

            {/* 5. APP DOWNLOAD CTA BTM BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-pink-50 p-2 rounded-md border border-pink-100">
                            <Percent className="w-5 h-5 text-[#fc2779]" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">First App Order</p>
                            <h4 className="text-gray-900 font-black text-sm uppercase">Get Flat ₹500 Off</h4>
                        </div>
                    </div>

                    <button className="bg-black text-white px-5 py-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shrink-0">
                        Get App
                    </button>
                </div>
            </div>
        </div>
    )
}

function LoadingScreen() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
            <Loader2 className="w-8 h-8 text-[#fc2779] animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Loading Daciana...</p>
        </div>
    )
}