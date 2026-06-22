"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Admin error:", error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2">
                Something went wrong
            </h2>
            <p className="text-sm text-slate-500 max-w-md mb-8">
                {error.message || "An unexpected error occurred in the admin panel."}
            </p>
            <Button
                onClick={() => reset()}
                className="rounded-xl h-11 px-6 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
            </Button>
        </div>
    )
}
