"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { Loader2, SearchX, ArrowUpRight } from "lucide-react"
import { Breadcrumbs } from "@/components/store/breadcrumbs"
import { SignatureLoader } from "@/components/store/signature-loader"
import Link from "next/link"

function SearchResultsContent() {
    const searchParams = useSearchParams()
    const query = searchParams.get("q")
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchAll = async () => {
            if (!query) {
                setLoading(false)
                return
            }
            setLoading(true)

            const { data, error } = await supabase
                .from('products')
                .select(`*, product_variants(*)`)
                .ilike('name', `%${query}%`)
                .eq('status', 'active')

            if (!error) setResults(data || [])
            setLoading(false)
        }
        fetchAll()
    }, [query, supabase])

    if (loading) return <SignatureLoader loading={loading} text={`Searching for: ${query}`} />

    return (
        <div className="min-h-screen bg-white">
            <main className="max-w-7xl mx-auto px-6 py-12">
                <Breadcrumbs items={[{ label: 'Search', href: '/search' }]} />
                {/* MINIMALIST HEADER */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse" />
                            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Search Protocol</h1>
                        </div>
                        <p className="text-4xl font-black uppercase tracking-tighter">
                            Results for: <span className="italic text-slate-400">"{query}"</span>
                        </p>
                    </div>

                    <div className="h-px flex-1 bg-slate-100 hidden md:block mx-8 mb-3" />

                    <div className="text-right">
                        <p className="text-2xl font-black tracking-tighter leading-none">
                            {results.length.toString().padStart(2, '0')}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                            Entries Found
                        </p>
                    </div>
                </header>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                        {results.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-32 border-2 border-dashed border-slate-50 rounded-[2rem] flex flex-col items-center text-center px-6">
                        <SearchX className="w-10 h-10 text-slate-200 mb-6 stroke-[1.5]" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-2">Zero Matches Found</h2>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
                            The requested query did not return any indexed entries from our database.
                        </p>
                        <Link
                            href="/shop"
                            className="mt-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-slate-900 pb-1 hover:text-slate-400 hover:border-slate-200 transition-all"
                        >
                            Return to Index <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="p-40 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
            </div>
        }>
            <SearchResultsContent />
        </Suspense>
    )
}