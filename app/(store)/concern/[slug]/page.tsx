"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"

interface Concern {
    id: string
    name: string
    slug: string
    image_url: string | null
}

interface ProductVariant {
    id: string
    price: number
    stock: number
    hex_code: string | null
    discount_type: string
    discount_value: number
    title: string
    image_url: string | null
}

interface StoreProduct {
    id: string
    name: string
    slug: string
    base_price: number | null
    thumbnail_url: string | null
    brand: string
    discount_type: string
    discount_value: number
    has_variants: boolean
    status: string
    product_variants: ProductVariant[]
    created_at: string
}

export default function ConcernPage() {
    const { slug } = useParams<{ slug: string }>()
    const router = useRouter()
    const supabase = createClient()

    const [concern, setConcern] = useState<Concern | null>(null)
    const [products, setProducts] = useState<StoreProduct[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!slug) return
        ;(async () => {
            setLoading(true)
            try {
                const { data: concernData } = await supabase
                    .from("concerns")
                    .select("*")
                    .eq("slug", slug)
                    .single()

                if (!concernData) {
                    setLoading(false)
                    return
                }
                setConcern(concernData)

                const { data: junctions } = await supabase
                    .from("product_concerns")
                    .select("product_id")
                    .eq("concern_id", concernData.id)

                const productIds = junctions?.map((j: { product_id: string }) => j.product_id) || []

                if (productIds.length > 0) {
                    const { data: productsData } = await supabase
                        .from("products")
                        .select("*, product_variants(*)")
                        .eq("status", "active")
                        .in("id", productIds)
                        .order("created_at", { ascending: false })

                    setProducts(productsData || [])
                } else {
                    setProducts([])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        })()
    }, [slug])

    return (
        <div className="min-h-screen bg-white">
            {/* Sticky nav */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3 px-4 h-14">
                    <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5 text-slate-800" />
                    </button>
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.4em]">Skin Concern</span>
                </div>
            </div>

            {/* Hero */}
            {concern && (
                <div className="px-4 pt-4 pb-6">
                    <div className="flex items-center gap-6">
                        {concern.image_url && (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-md">
                                <Image src={concern.image_url} alt={concern.name} width={96} height={96} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-light text-slate-900 tracking-tight leading-tight">{concern.name}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="h-px w-6 bg-rose-300" />
                                <div className="w-1 h-1 rounded-full bg-rose-400" />
                                <span className="text-xs text-slate-400 font-medium">{products.length} product{products.length !== 1 ? "s" : ""}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1">
                {loading ? (
                    <div className="flex flex-col items-center pt-16 px-6">
                        <div className="w-8 h-8 border-2 border-slate-300 border-t-rose-400 rounded-full animate-spin" />
                        <p className="text-sm text-slate-400 mt-4">Loading...</p>
                    </div>
                ) : !concern ? (
                    <div className="flex flex-col items-center pt-16 px-6">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <span className="text-2xl font-light text-slate-300">?</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">Concern not found</p>
                        <p className="text-xs text-slate-400 mt-1">This concern may have been removed</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center pt-16 px-6">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <span className="text-2xl font-light text-slate-300">0</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">No products found</p>
                        <p className="text-xs text-slate-400 mt-1">No products are currently linked to this concern</p>
                    </div>
                ) : (
                    <>
                        <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-4 bg-rose-300 rounded-full" />
                                <span className="text-xs font-semibold text-slate-700">Results</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
                            {products.map((product, idx) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
