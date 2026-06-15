import { createClient } from "@/utils/supabase/server"
import { EditCategoryForm } from "@/components/admin/edit-category-form"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: category } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single()

    if (!category) notFound()

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/categories"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Category</h1>
                    <p className="text-sm text-slate-500">Update category: {category.name}</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <EditCategoryForm initialData={category} categories={categories || []} />
            </div>
        </div>
    )
}