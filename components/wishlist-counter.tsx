"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Heart } from "lucide-react"
import Link from "next/link"

export function WishlistCounter({ initialCount, userId }: { initialCount: number, userId: string | undefined }) {
    const [count, setCount] = useState(initialCount)
    const supabase = createClient()

    const updateCount = useCallback(async () => {
        if (!userId) return
        const { count: freshCount } = await supabase
            .from('wishlist')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        setCount(freshCount || 0)
    }, [userId, supabase])

    useEffect(() => {
        window.addEventListener("wishlist-updated", updateCount)
        return () => window.removeEventListener("wishlist-updated", updateCount)
    }, [updateCount])

    return (
        <Link href="/profile/wishlist" className="relative p-2 flex items-center">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            {count > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {count}
                </span>
            )}
        </Link>
    )
}