import { createClient } from "@/utils/supabase/server"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export async function LowStockList() {
    const supabase = await createClient()

    const { data: lowStockItems } = await supabase
        .from("product_variants")
        .select(`
            id,
            title,
            stock,
            product_id,
            products (name)
        `)
        .lt("stock", 10)
        .order("stock", { ascending: true })
        .limit(6)

    return (
        <div className="rounded-2xl border bg-white p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Inventory Alerts
                </h3>
                <Link
                    href="/admin/products"
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                    View All <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="space-y-6">
                {!lowStockItems || lowStockItems.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 italic text-sm">
                        All products are well-stocked.
                    </div>
                ) : (
                    lowStockItems.map((item: any) => {
                        const stockPercentage = (item.stock / 10) * 100
                        return (
                            <div key={item.id} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">{item.products?.name}</p>
                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-semibold ${item.stock <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                                            {item.stock} left
                                        </span>
                                    </div>
                                </div>
                                <Progress
                                    value={stockPercentage}
                                    className="h-1.5"
                                    indicatorClassName={item.stock <= 2 ? "bg-red-600" : "bg-amber-500"}
                                />
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}