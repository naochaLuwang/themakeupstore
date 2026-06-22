import { createClient } from "@/utils/supabase/server"
import DemandPageClient from "./demand-client"
import { startOfDay, subDays, endOfDay, parseISO } from "date-fns"

export default async function DemandIntelligencePage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const { from, to } = await searchParams
    const supabase = await createClient()

    const now = new Date()
    const end = to ? endOfDay(parseISO(to)) : endOfDay(now)
    const start = from ? startOfDay(parseISO(from)) : startOfDay(subDays(now, 30))

    const { data: notifications } = await supabase
        .from("back_in_stock_notifications")
        .select(`
            *,
            products(name, brand, thumbnail_url),
            product_variants(title, stock, hex_code)
        `)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })

    // Both notified and non-notified for the period
    const allData = notifications || []

    return (
        <div className="space-y-6">
            <DemandPageClient
                initialData={allData as any[]}
                searchParams={{ from, to }}
            />
        </div>
    )
}
