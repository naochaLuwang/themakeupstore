"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Sparkles, ChevronRight } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { Breadcrumbs } from "@/components/store/breadcrumbs"
import SkincareRoutineFinder from "@/components/store/skincare-routine-finder"

interface Props {
    initialSubcategories: any[];
    initialProducts: any[];
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
}

export default function SkincareAccessoriesClient({
    initialSubcategories,
    initialProducts,
    hasMore,
    loadingMore,
    onLoadMore
}: Props) {
    const [routineOpen, setRoutineOpen] = React.useState(false)
    const sentinelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => entries[0].isIntersecting && onLoadMore(),
            { threshold: 0.1, rootMargin: "200px" }
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            {/* Subtle Progress Bar */}
            <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="fixed top-0 left-0 right-0 h-[1px] bg-stone-400/50 z-50"
            />

            <main>
                {/* Hero Section - Full Bleed Editorial */}
                <section className="relative h-[70vh] min-h-[500px] bg-stone-900 overflow-hidden">
                    <div className="absolute inset-0">
                        <Image
                            src="/hero-skincare.png"
                            fill
                            className="object-cover opacity-60"
                            alt="Skincare & Accessories"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 via-stone-900/50 to-stone-900/90" />
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 pb-20 md:pb-28">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className="space-y-6"
                        >
                            <Breadcrumbs
                                items={[
                                    { label: "Collections", href: "/" },
                                    { label: "Skin & Accessories", href: "/skincare-accessories" },
                                ]}
                            />

                            <div className="flex items-center gap-3">
                                <div className="h-[1px] w-12 bg-stone-400/60" />
                                <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-stone-300/80">
                                    Curated Essentials
                                </span>
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif italic text-white leading-[0.95] tracking-tight max-w-3xl">
                                The Art of
                                <br />
                                <span className="text-stone-300/90">Daily Ritual</span>
                            </h1>

                            <p className="text-stone-300/70 text-sm md:text-base font-light max-w-lg leading-relaxed tracking-wide">
                                Premium skincare and curated accessories for those who appreciate
                                the beauty of a well-cared-for self.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Browse by Category - Compact Initials */}
                {initialSubcategories.length > 0 && (
                    <section className="py-6 bg-white">
                        <div className="max-w-7xl mx-auto px-6">
                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-stone-400">
                                    Browse by Category
                                </span>
                                <span className="text-[9px] font-medium text-stone-400">
                                    {initialSubcategories.length}
                                </span>
                            </div>

                            <div className="flex overflow-x-auto gap-3 no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
                                {initialSubcategories.map((cat, i) => (
                                    <motion.div
                                        key={cat.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={`/categories/${cat.slug}`}
                                            className="group flex flex-col items-center gap-2 shrink-0 w-[76px]"
                                        >
                                            <div className="w-[72px] h-[72px] rounded-full bg-stone-800 flex items-center justify-center transition-all duration-300 group-hover:bg-stone-600">
                                                <span className="text-white text-lg font-serif italic font-medium">
                                                    {cat.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-medium uppercase tracking-tight text-stone-600 truncate max-w-[76px]">
                                                {cat.name}
                                            </span>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="h-[1px] bg-stone-100 mt-6" />
                        </div>
                    </section>
                )}

                {/* Editorial Statement */}
                <section className="py-24 md:py-32 bg-stone-50">
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-16 bg-stone-300" />
                                <Sparkles className="w-4 h-4 text-stone-400" />
                                <div className="h-[1px] w-16 bg-stone-300" />
                            </div>

                            <blockquote className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-stone-800 leading-tight">
                                &ldquo;The best investment you can make is in yourself —
                                because when you feel good, you do great things.&rdquo;
                            </blockquote>

                            <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-400 mt-8">
                                Our Philosophy
                            </p>
                        </motion.div>

                        {/* Build Your Routine CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="mt-12"
                        >
                            <button
                                onClick={() => setRoutineOpen(true)}
                                className="inline-flex items-center gap-3 px-8 h-14 rounded-full bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 active:scale-[0.97] transition-all shadow-xl"
                            >
                                <Sparkles className="w-4 h-4" />
                                Build Your Skincare Routine
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <p className="text-[9px] text-stone-400 mt-3 tracking-wide">
                                Answer a few questions and we&apos;ll curate a routine tailored to your skin.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Products Grid */}
                <section className="pb-24 md:pb-32 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="pt-20 pb-12 flex items-end justify-between border-b border-stone-100">
                            <div>
                                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-stone-400 block mb-3">
                                    The Collection
                                </span>
                                <h2 className="text-2xl md:text-3xl font-serif italic text-stone-900">
                                    All Selections
                                </h2>
                            </div>
                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
                                {initialProducts.length} Pieces
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 pt-12">
                            {initialProducts.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>

                        <div
                            ref={sentinelRef}
                            className="mt-20 py-16 flex flex-col items-center"
                        >
                            {hasMore ? (
                                <div className="flex flex-col items-center gap-5">
                                    <div className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                                    </div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-stone-400">
                                        {loadingMore ? "Discovering more..." : "Scroll for more"}
                                    </span>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <div className="h-[1px] w-12 bg-stone-200" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                        <div className="h-[1px] w-12 bg-stone-200" />
                                    </div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-stone-300">
                                        End of Collection
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <SkincareRoutineFinder
                open={routineOpen}
                onClose={() => setRoutineOpen(false)}
            />
        </div>
    );
}
