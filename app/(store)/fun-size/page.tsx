"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { ProductCard } from "@/components/store/product-card"
import { SignatureLoader } from "@/components/store/signature-loader"

export default function FunSizePage() {
    const [products, setProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [mounted, setMounted] = React.useState(false)
    const supabase = createClient()

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (!mounted) return
        async function getFunSizeProducts() {
            try {
                setLoading(true)
                const { data: category } = await supabase.from("categories").select("id").eq("slug", "fun-size").single()
                if (!category) return

                const { data: junctionData } = await supabase.from("product_categories").select("product_id").eq("category_id", category.id)
                const productIds = junctionData?.map((j: any) => j.product_id) || []

                let query = supabase
                    .from("products")
                    .select("*, product_variants(id, price, stock, discount_type, discount_value, title, image_url)")
                    .eq("status", "active")

                if (productIds.length > 0) {
                    query = query.or(`category_id.eq.${category.id},id.in.(${productIds.join(",")})`)
                } else {
                    query = query.eq("category_id", category.id)
                }

                const { data } = await query
                setProducts(data || [])
            } finally {
                setLoading(false)
            }
        }
        getFunSizeProducts()
    }, [supabase, mounted])

    if (!mounted) return null

    return (
        <div className="bg-white pb-20">
            {/* HERO — pulled up behind the sticky navbar */}
            <div className="-mt-40 animate-fade-in-up">
                <div className="relative w-full h-[540px]">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: "url('/minis/banner-lineup.jpg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#fce4ec]/30 via-[#f8bbd0]/40 to-black/60" />
                    <div className="absolute bottom-14 left-6 right-6 z-10">
                        <p className="text-[11px] font-bold text-[#fc2779] uppercase tracking-[0.4em] mb-1">
                            Big beauty. Tiny packages.
                        </p>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-2">
                            Fun Size
                        </h2>
                        <p className="text-sm text-white/80 leading-relaxed max-w-[280px]">
                            Mini makeup must-haves you'll love!
                        </p>
                    </div>
                </div>
            </div>

            <SignatureLoader loading={loading} text="The Makeup Store / Fun Size" />

            {!loading && (
                <div className="mt-6">
                    <div className="flex items-end justify-between px-4 mb-5">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Pocket Friendly</p>
                            <h3 className="text-[26px] font-light text-slate-900 tracking-tight leading-none mt-0.5">
                                Fun Size {products.length > 0 && <span className="text-[14px] text-slate-400">({products.length})</span>}
                            </h3>
                        </div>
                    </div>

                    {products.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <p className="text-sm text-slate-400">Coming soon.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2">
                            {products.map((product: any, idx: number) => (
                                <div
                                    key={product.id}
                                    className="animate-fade-in-up"
                                    style={{ animationDelay: `${idx * 0.03}s`, animationFillMode: "backwards" }}
                                >
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
