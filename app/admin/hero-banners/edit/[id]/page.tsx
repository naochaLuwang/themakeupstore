import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
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
        <div className="max-w-4xl mx-auto p-8">
            <header className="mb-12">
                <Link
                    href="/admin/hero-banners"
                    className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to List
                </Link>
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">Edit Hero Banner</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-2">
                    Update slide content, image, or settings
                </p>
            </header>
            <HeroBannerForm initialData={banner} />
        </div>
    )
}
