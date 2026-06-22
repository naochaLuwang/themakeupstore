"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function OrdersError({ reset }: { reset: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2">Orders error</h2>
            <p className="text-sm text-slate-500 max-w-md mb-6">Failed to load orders.</p>
            <Button onClick={() => reset()} className="rounded-xl h-11 px-6 bg-slate-900 text-white text-sm font-semibold">
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
        </div>
    )
}
