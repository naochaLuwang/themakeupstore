import { createClient } from "@/utils/supabase/server"
import ProductForm from "@/components/admin/product-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewProductPage() {
    const supabase = await createClient()

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true })

    let concerns: { id: string; name: string }[] = []
    try {
        const { data } = await supabase.from("concerns").select("id, name").order("name", { ascending: true })
        concerns = data || []
    } catch { /* table not available */ }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/products"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Create Product</h1>
                    <p className="text-sm text-slate-500">New inventory entry</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
                <ProductForm categories={categories || []} concerns={concerns} />
            </div>
        </div>
    )
}