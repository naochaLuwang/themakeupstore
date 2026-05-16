"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Sparkles, LayoutGrid } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { motion } from "framer-motion"

interface Props {
    category: {
        id: string
        name: string
        slug: string
        parent_id: string
    }
    siblings: Array<{
        name: string
        slug: string
        image_url: string | null
    }>
    products: any[]
    parentSlug: string
}

export default function EssentialCategoryClient({
    category,
    siblings,
    products,
    parentSlug,
}: Props) {
    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20">
            {/* Sticky Nav */}
            <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-pink-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Link
                            href={`/${parentSlug}`}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#fc2779]"
                        >
                            {parentSlug.charAt(0).toUpperCase() + parentSlug.slice(1)}
                        </Link>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#fc2779]">
                            {category.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar touch-pan-x pb-2">
                        {siblings.map((sib) => {
                            const isActive = sib.slug === category.slug
                            return (
                                <Link
                                    key={sib.slug}
                                    href={`/${parentSlug}/${sib.slug}`}
                                    className="flex flex-col items-center gap-2 shrink-0 group"
                                >
                                    <div
                                        className={`w-14 h-14 rounded-full p-[2px] transition-all duration-500 ${
                                            isActive ? "bg-[#fc2779]" : "bg-slate-100 group-hover:bg-pink-200"
                                        }`}
                                    >
                                        <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                                            {sib.image_url ? (
                                                <img src={sib.image_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase">
                                                    {sib.name[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${
                                            isActive ? "text-[#fc2779]" : "text-slate-500"
                                        }`}
                                    >
                                        {sib.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </nav>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <main className="max-w-7xl mx-auto px-6 pt-12">
                    <header className="mb-16">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[#fc2779]">
                                    <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                        Essential Selection
                                    </span>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-serif italic text-slate-950 leading-none tracking-tighter">
                                    {category.name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm">
                                <LayoutGrid className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {products.length} Products
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 w-24 bg-[#fc2779] rounded-full mt-8 opacity-80" />
                    </header>

                    {products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="hover:-translate-y-1 transition-all duration-500"
                                >
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-40 text-center border-2 border-dashed border-pink-100 rounded-[3.5rem] bg-white shadow-inner">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                                Catalogue Restocking Soon
                            </p>
                        </div>
                    )}
                </main>
            </motion.div>
        </div>
    )
}