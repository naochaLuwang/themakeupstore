"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
// import { updateVariantStock } from "@/app/actions/inventory"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function StockInput({ variantId, initialStock }: { variantId: string, initialStock: number }) {
    const [loading, setLoading] = useState(false)

    const handleUpdate = async (newVal: string) => {
        const stockNum = parseInt(newVal)
        if (isNaN(stockNum)) return

        setLoading(true)
        // const res = await updateVariantStock(variantId, stockNum)
        setLoading(false)

        // if (res?.error) {
        //     toast.error("Failed to update stock")
        // } else {
        //     toast.success("Stock updated")
        // }
    }

    return (
        <div className="relative inline-block w-24 ml-auto">
            <Input
                type="number"
                className="h-8 text-right pr-7"
                defaultValue={initialStock}
                onBlur={(e) => handleUpdate(e.target.value)}
                disabled={loading}
            />
            {loading && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-slate-400" />
            )}
        </div>
    )
}