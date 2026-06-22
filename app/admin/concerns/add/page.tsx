import { createClient } from "@/utils/supabase/server"
import { ConcernForm } from "@/components/admin/concern-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function AddConcernPage() {
    const supabase = await createClient()

    const { data: products } = await supabase
        .from("products")
        .select("id, name, thumbnail_url")
        .order("name", { ascending: true })

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
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Create Concern</h1>
                    <p className="text-sm text-slate-500">Add a new skin concern and assign products.</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <ConcernForm products={products || []} />
            </div>
        </div>
    )
}
