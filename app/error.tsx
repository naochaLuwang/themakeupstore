"use client"

import { useEffect } from "react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error for your own tracking
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
            <h2 className="text-2xl font-serif italic text-slate-900 mb-4">
                Connection Interrupted
            </h2>
            <p className="text-slate-500 text-sm max-w-xs mb-8">
                We're having trouble connecting to the Maison servers. This usually happens on weak networks.
            </p>
            <button
                onClick={() => reset()}
                className="px-8 py-3 bg-[#fc2779] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg"
            >
                Try Again
            </button>
        </div>
    )
}