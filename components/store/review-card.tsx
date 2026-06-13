"use client"

import { useState } from "react"
import { Star, CheckCircle2 } from "lucide-react"

interface ReviewCardProps {
    review: {
        id: string
        user_name: string
        rating: number
        title?: string
        comment: string
        is_verified: boolean
        created_at: string
    }
}

export function ReviewCard({ review }: ReviewCardProps) {
    const [expanded, setExpanded] = useState(false)
    const formattedDate = new Date(review.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
    const isLongComment = review.comment?.length > 150

    return (
        <div className="border border-gray-100 rounded-lg p-3 mb-3 bg-white">
            <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#fc2779] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(review.user_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-800">{review.user_name}</p>
                        {review.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-2.5 h-2.5 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] text-gray-400">{formattedDate}</span>
                    </div>
                </div>
            </div>

            {review.title && (
                <p className="text-xs font-semibold text-gray-800 mt-2">{review.title}</p>
            )}

            <p className={`text-xs text-gray-500 leading-relaxed mt-1 ${expanded ? "" : "line-clamp-3"}`}>
                {review.comment}
            </p>

            {isLongComment && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[#fc2779] text-[11px] font-semibold mt-1"
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}
        </div>
    )
}
