import { createClient } from "@/utils/supabase/server"
import { PromoForm } from "../promo-form" // Adjust path as needed
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewPromoPage() {
    const supabase = await createClient()

    // Fetch necessary data for the form targeting
    const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name')
    ])

    const products = productsRes.data || []
    const categories = categoriesRes.data || []

    return (
        <div className="max-w-4xl mx-auto p-8">
            <header className="mb-12">
                <Link
                    href="/admin/promos"
                    className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to List
                </Link>
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">Create Discount</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-2">
                    Define the rules, constraints, and scope for your new campaign
                </p>
            </header>

            {/* Use the redesigned form here */}
            <PromoForm products={products} categories={categories} />
        </div>
    )
}