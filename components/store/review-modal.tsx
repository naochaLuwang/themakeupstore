"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Star, ArrowLeft, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { ReviewCard } from "./review-card"

interface ReviewModalProps {
    visible: boolean
    productId: string
    onClose: () => void
}

export function ReviewModal({ visible, productId, onClose }: ReviewModalProps) {
    const supabase = createClient()
    const [reviews, setReviews] = useState<any[]>([])
    const [averageRating, setAverageRating] = useState(0)
    const [reviewCount, setReviewCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showSubmitForm, setShowSubmitForm] = useState(false)
    const [rating, setRating] = useState<number | null>(null)
    const [title, setTitle] = useState("")
    const [comment, setComment] = useState("")
    const [hasPurchased, setHasPurchased] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const REVIEWS_PER_PAGE = 8

    useEffect(() => {
        if (!visible) return
        setCurrentPage(0)
        setShowSubmitForm(false)
        setRating(null)
        setTitle("")
        setComment("")
        fetchReviews()
        checkUserAndPurchase()
    }, [visible, productId])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const { data: reviews, error } = await supabase
                .from("product_reviews")
                .select("*")
                .eq("product_id", productId)
                .eq("is_approved", true)
                .order("created_at", { ascending: false })

            if (error) throw error

            if (reviews && reviews.length > 0) {
                const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                setAverageRating(Math.round(avgRating * 10) / 10)
                setReviewCount(reviews.length)
                setReviews(reviews)
            }
        } catch (error) {
            console.error("Error fetching reviews:", error)
        } finally {
            setLoading(false)
        }
    }

    const checkUserAndPurchase = async () => {
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u)
        if (!u?.id) return
        try {
            const { data: userOrders } = await supabase
                .from("order_items")
                .select("order_id")
                .eq("product_id", productId)

            if (userOrders && userOrders.length > 0) {
                setHasPurchased(true)
            }
        } catch (error) {
            console.error("Error checking purchase history:", error)
        }
    }

    const handleSubmitReview = async () => {
        if (!user?.id) return
        if (!rating) return
        if (comment.trim().length < 10) return

        try {
            setSubmitting(true)

            const { data: existingReview } = await supabase
                .from("product_reviews")
                .select("id")
                .eq("product_id", productId)
                .eq("user_id", user.id)

            if (existingReview && existingReview.length > 0) {
                setSubmitting(false)
                return
            }

            const { error } = await supabase.from("product_reviews").insert({
                product_id: productId,
                user_id: user.id,
                user_name: user.user_metadata?.full_name || "Anonymous",
                rating,
                title: title || null,
                comment,
                is_verified: hasPurchased,
                is_approved: false,
            })

            if (error) throw error

            setRating(null)
            setTitle("")
            setComment("")
            setShowSubmitForm(false)
            fetchReviews()
        } catch (error) {
            console.error("Error submitting review:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const paginatedReviews = reviews.slice(
        currentPage * REVIEWS_PER_PAGE,
        (currentPage + 1) * REVIEWS_PER_PAGE
    )
    const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE)

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-100">
                <button onClick={onClose} className="flex items-center gap-1 text-gray-800">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <span className="text-sm font-semibold text-gray-900">Customer Reviews</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Rating Summary */}
                <div className="mx-4 mt-4 p-4 border border-gray-100 rounded-lg bg-gray-50 flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                        <span className="text-2xl font-black text-gray-900">
                            {averageRating > 0 ? averageRating.toFixed(1) : "-"}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-4 h-4 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                />
                            ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                        </p>
                    </div>
                    {user?.id && (
                        <button
                            onClick={() => setShowSubmitForm(!showSubmitForm)}
                            className="border border-[#fc2779] rounded-lg px-3 py-2 flex items-center gap-1 shrink-0"
                        >
                            {showSubmitForm ? (
                                <X className="w-3.5 h-3.5 text-[#fc2779]" />
                            ) : (
                                <Star className="w-3.5 h-3.5 text-[#fc2779]" />
                            )}
                            <span className="text-[11px] font-bold text-[#fc2779]">
                                {showSubmitForm ? "Cancel" : "Write"}
                            </span>
                        </button>
                    )}
                </div>

                {/* Submit Form */}
                {showSubmitForm && (
                    <div className="mx-4 mt-4 p-4 border border-gray-100 rounded-lg">
                        <label className="text-xs font-bold text-gray-700">Rating</label>
                        <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button key={s} onClick={() => setRating(s)} type="button">
                                    <Star
                                        className={`w-7 h-7 ${rating && s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                    />
                                </button>
                            ))}
                        </div>

                        <label className="text-xs font-bold text-gray-700 mt-4 block">Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Summarize your review"
                            maxLength={100}
                            className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
                        />

                        <label className="text-xs font-bold text-gray-700 mt-4 block">Review</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your honest feedback"
                            maxLength={500}
                            rows={4}
                            className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 resize-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 text-right">{comment.length}/500</p>

                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting || !rating || comment.trim().length < 10}
                            className="w-full mt-4 h-11 rounded-lg bg-gray-900 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : "Submit Review"}
                        </button>
                    </div>
                )}

                {/* Reviews List */}
                <div className="px-4 mt-4 pb-8">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-400">No reviews yet. Be the first to review!</p>
                        </div>
                    ) : (
                        <>
                            {paginatedReviews.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-4">
                                    <button
                                        disabled={currentPage === 0}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-40"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-500">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        disabled={currentPage === totalPages - 1}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-40"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
