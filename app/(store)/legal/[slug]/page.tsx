import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function PublicLegalPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const supabase = await createClient()

    const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", slug)
        .single()

    if (!data) notFound()

    return (
        <main className="min-h-screen bg-white py-20 px-4">
            <article className="container mx-auto max-w-2xl">
                <header className="mb-12 text-center">
                    <span className="font-daciana text-primary tracking-[0.4em] uppercase text-[10px] mb-4 block">
                        THE MAKEUP STORE LEGAL
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        {slug.replace(/_/g, ' ')}
                    </h1>
                </header>

                {/* Content area with pre-wrap to preserve line breaks from admin textarea */}
                <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-wrap text-slate-600 leading-relaxed text-sm md:text-base">
                        {data.content}
                    </p>
                </div>
            </article>
        </main>
    )
}