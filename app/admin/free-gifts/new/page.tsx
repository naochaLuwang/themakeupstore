import { createClient } from "@/utils/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { FreeGiftForm } from "../free-gift-form"

export default async function AdminFreeGiftNewPage() {
    const supabase = await createClient()
    const [productsRes, giftProductsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        (async () => { try { return await supabase.from('gift_products').select('id, name').eq('is_active', true).order('name') } catch { return { data: [] } } })(),
        supabase.from('categories').select('id, name').order('name'),
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/free-gifts" className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">New Free Gift Rule</h1>
                    <p className="text-sm text-slate-500">Set up an automatic free gift promotion</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <FreeGiftForm products={productsRes.data || []} giftProducts={giftProductsRes.data || []} categories={categoriesRes.data || []} />
            </div>
        </div>
    )
}
