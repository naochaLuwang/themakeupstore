"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"

interface Props {
    initialSubcategories: any[];
    initialProducts: any[];
}

export default function EssentialsClient({ initialSubcategories, initialProducts }: Props) {
    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
            {/* TOP PROGRESS LINE */}
            <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                className="fixed top-0 left-0 right-0 h-[2px] bg-[#fc2779] z-50"
            />

            <main className="max-w-6xl mx-auto px-6 pt-10">
                {/* BRANDED HERO */}
                <header className="mb-16 space-y-4">
                    <div className="flex items-center gap-2 text-[#fc2779]">
                        <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">The Daily Edit</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif italic text-slate-950 leading-tight">
                        Beauty <span className="text-[#fc2779]">Essentials</span>
                    </h1>
                </header>

                {/* NYKAA-STYLE STORY BUBBLES */}
                <section className="mb-5">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Discover Rituals</h2>
                        <span className="text-[10px] font-bold text-[#fc2779] uppercase">Upto 30% Off</span>
                    </div>

                    <div className="flex overflow-x-auto gap-8 md:gap-12 no-scrollbar pb-4 -mx-6 px-6">
                        {initialSubcategories.map((cat) => (
                            <Link key={cat.id} href={`/essentials/${cat.slug}`} className="group flex flex-col items-center gap-4 shrink-0">
                                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full p-[2px] bg-gradient-to-tr from-[#fc2779] via-pink-400 to-orange-200 group-hover:rotate-12 transition-all duration-500">
                                    <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden relative shadow-lg bg-white">
                                        <Image
                                            src={cat.image_url || '/placeholder.png'}
                                            fill
                                            priority // Loads these bubbles immediately
                                            sizes="(max-width: 768px) 80px, 112px"
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            alt={cat.name}
                                        />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tighter text-slate-800 block">{cat.name}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* PRODUCT GRID */}
                <section className="pt-10">
                    <div className="flex items-center justify-between mb-0 border-t border-x border-pink-50 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#fc2779]" />
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Hand Picked Selection</h2>
                        </div>
                        <span className="text-[10px] font-black text-[#fc2779] uppercase">{initialProducts.length} Results</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-pink-50 bg-white">
                        {initialProducts.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }} // Staggered entry
                                className="relative bg-white"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}