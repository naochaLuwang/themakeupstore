import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { HeroBannerForm } from "../../hero-banner-form"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditHeroBannerPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: banner } = await supabase
        .from("hero_banners")
        .select("*")
        .eq("id", id)
        .single()

    if (!banner) notFound()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/hero-banners"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Hero Banner</h1>
                    <p className="text-sm text-slate-500">Update slide content, image, or settings</p>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm max-w-2xl">
                <HeroBannerForm initialData={banner} />
            </div>
        </div>
    )
}
