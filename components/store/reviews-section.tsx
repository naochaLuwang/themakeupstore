

"use client"

import { useState, useEffect } from "react"
import { Star, CheckCircle2, MessageSquare, Sparkles } from "lucide-react"
import { WriteReviewForm } from "./write-review-form"
import { motion } from "framer-motion"

export function ReviewsSection({
    reviews,
    productId,
    user
}: {
    reviews: any[],
    productId: string,
    user: any
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : 0

    const getPercentage = (star: number) => {
        if (reviews.length === 0) return 0
        const count = reviews.filter(r => r.rating === star).length
        return (count / reviews.length) * 100
    }

    return (
        <section className="py-24 border-t border-pink-50 bg-[#FDFDFD]" id="reviews">
            <div className="container mx-auto px-4 md:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* 1. ANALYTICS COLUMN (Nykaa High-Density) */}
                    <div className="lg:col-span-4 space-y-10">
                        <div className="sticky top-32">
                            <div className="space-y-2 mb-8 text-center lg:text-left">
                                <div className="flex items-center justify-center lg:justify-start gap-2 text-[#fc2779]">
                                    <Sparkles className="w-4 h-4 fill-[#fc2779]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Customer Love</span>
                                </div>
                                <h2 className="text-4xl font-serif italic font-bold text-slate-950 tracking-tight">
                                    Ratings & <span className="text-[#fc2779]">Reviews</span>
                                </h2>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-8">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <span className="text-7xl font-black text-slate-950 tracking-tighter leading-none">{avgRating}</span>
                                    <div className="mt-4 flex flex-col items-center">
                                        <div className="flex gap-1 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-5 h-5 ${i < Math.round(Number(avgRating)) ? "fill-[#fc2779] text-[#fc2779]" : "text-slate-100"}`} />
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Based on {reviews.length} Verified Voices
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bars - Boutique Style */}
                                <div className="space-y-3">
                                    {[5, 4, 3, 2, 1].map((star) => (
                                        <div key={star} className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-slate-400 w-4">{star}★</span>
                                            <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${getPercentage(star)}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-[#fc2779] rounded-full"
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-300 w-8 text-right">
                                                {Math.round(getPercentage(star))}%
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-pink-50">
                                    <p className="text-[11px] font-bold text-slate-500 mb-6 italic leading-relaxed text-center">
                                        Found a shade you love? Share your boutique experience.
                                    </p>
                                    <WriteReviewForm productId={productId} user={user} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. FEED COLUMN (Social Proof) */}
                    <div className="lg:col-span-8">
                        {reviews.length > 0 ? (
                            <div className="space-y-6">
                                {reviews.map((review, idx) => (
                                    <motion.div
                                        key={review.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="bg-white p-8 rounded-[2rem] border border-pink-50 hover:border-[#fc2779]/20 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-500"
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                            <div className="space-y-1">
                                                <div className="flex gap-0.5 mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-[#fc2779] text-[#fc2779]" : "text-slate-100"}`} />
                                                    ))}
                                                </div>
                                                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{review.title}</h4>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                                    {mounted ? new Date(review.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' }) : '---'}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-slate-600 text-[13px] leading-relaxed mb-8 italic font-serif">
                                            "{review.comment}"
                                        </p>

                                        <div className="flex items-center justify-between pt-6 border-t border-pink-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[#fc2779] font-black text-[10px] uppercase">
                                                    {review.user_name?.[0] || 'U'}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                                                        {review.user_name}
                                                    </p>
                                                    {review.is_verified && (
                                                        <div className="flex items-center gap-1 text-[#fc2779]">
                                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Verified Boutique Purchase</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Optional: Feedback for review helpfulness (Common in Beauty UX) */}
                                            <button className="text-[9px] font-black text-slate-300 uppercase hover:text-[#fc2779] transition-colors">
                                                Helpful?
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 bg-white rounded-[3rem] text-center border border-dashed border-pink-200">
                                <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MessageSquare className="w-6 h-6 text-[#fc2779] opacity-40" />
                                </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Be the first to review this selection</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}