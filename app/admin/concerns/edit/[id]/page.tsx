import { createClient } from "@/utils/supabase/server"
import { ConcernForm } from "@/components/admin/concern-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function EditConcernPage({ params }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const [concernResult, productsResult] = await Promise.all([
        supabase
            .from("concerns")
            .select("*, product_concerns(product_id)")
            .eq("id", id)
            .single(),
        supabase
            .from("products")
            .select("id, name, thumbnail_url")
            .order("name", { ascending: true }),
    ])

    if (concernResult.error || !concernResult.data) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/concerns"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Concern</h1>
                    <p className="text-sm text-slate-500">Update concern details and product assignments.</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <ConcernForm
                    products={productsResult.data || []}
                    initialData={concernResult.data as any}
                />
            </div>
        </div>
    )
}
