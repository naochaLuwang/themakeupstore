"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Star, Loader2, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function WriteReviewForm({ productId, user }: { productId: string, user: any }) {
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const supabase = createClient()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (rating === 0) return toast.error("Please select a star rating")

        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const { error } = await supabase.from("product_reviews").insert({
            product_id: productId,
            user_id: user.id,
            user_name: user.user_metadata?.full_name || "Valued Client",
            rating: rating,
            title: formData.get("title"),
            comment: formData.get("comment"),
            is_verified: true // Assuming logic checks they bought it
        })

        if (error) {
            toast.error("Could not submit review")
        } else {
            toast.success("Thank you for your feedback")
            setIsOpen(false)
            // Ideally, trigger a router refresh here to show the new review
        }
        setLoading(false)
    }

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
            >
                <PenLine className="w-3.5 h-3.5 mr-2" /> Write a Review
            </Button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="transition-transform active:scale-90"
                        >
                            <Star
                                className={`w-6 h-6 ${(hover || rating) >= star ? "fill-primary text-primary" : "text-slate-300"}`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Title</label>
                <Input name="title" required placeholder="e.g. Beautiful texture, highly recommend" className="bg-white border-slate-100 rounded-xl" />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Experience</label>
                <Textarea name="comment" required placeholder="Share your thoughts " className="bg-white border-slate-100 rounded-xl min-h-[100px]" />
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-900 text-white rounded-xl uppercase font-bold text-[10px] tracking-widest h-12"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
                </Button>
                <Button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    className="rounded-xl uppercase font-bold text-[10px] tracking-widest h-12"
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}