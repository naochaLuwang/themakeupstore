import { createClient } from "@/utils/supabase/server"
import { PromoForm } from "../promo-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function NewPromoPage() {
    const supabase = await createClient()

    const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name')
    ])

    const products = productsRes.data || []
    const categories = categoriesRes.data || []

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/promos"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">New Promo Code</h1>
                    <p className="text-sm text-slate-500">Create a discount code for your customers</p>
                </div>
            </div>

            <PromoForm products={products} categories={categories} />
        </div>
    )
}
