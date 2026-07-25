"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Search, SearchX } from "lucide-react"
import { SignatureLoader } from "@/components/store/signature-loader"

const BLACKLISTED_NAMES = ["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick", "Blush", "Bronzer & Contour", "Highlighter & Illuminator", "Loose Powder", "Compact", "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray", "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm", "Lip Tint", "Cleansers & Toners", "Moisturisers", "Serum", "Sunscreen", "False Eyelashes", "Makeup Brushes", "Makeup remover & wipes", "Sheet Mask", "Sponges & Applicators", "Lenses"]

function BrandCard({ item }: { item: any }) {
    const parentSlug = item.parent?.slug
    const pathSegment = parentSlug === "exclusive" || parentSlug === "essentials" ? parentSlug : "categories"

    return (
        <Link
            href={`/${pathSegment}/${item.slug}`}
            className="flex items-center justify-center rounded border border-gray-200 mx-0.5 hover:border-gray-300 transition-colors aspect-square"
        >
            {item.image_url ? (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-4/5 h-4/5 object-contain"
                />
            ) : (
                <span className="text-2xl font-light text-gray-400 tracking-widest">
                    {item.name[0]}
                </span>
            )}
        </Link>
    )
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchBrands() {
            try {
                const { data, error } = await supabase
                    .from("categories")
                    .select("id, name, slug, image_url, parent_id, parent:parent_id (slug)")
                    .not("parent_id", "is", null)
                    .order("name", { ascending: true })

                if (error) throw error
                setBrands(data || [])
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchBrands()
    }, [supabase])

    const filteredBrands = brands.filter((b) => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase())
        const isNotBlacklisted = !BLACKLISTED_NAMES.some(
            (name) => b.name.toLowerCase() === name.toLowerCase()
        )
        return matchesSearch && isNotBlacklisted
    })

    const exclusiveBrands = filteredBrands.filter((b) =>
        b.parent?.slug?.toLowerCase().includes("exclusive")
    )
    const essentialBrands = filteredBrands.filter(
        (b) => !b.parent?.slug?.toLowerCase().includes("exclusive")
    )

    return (
        <>
            <SignatureLoader loading={loading} text="The Makeup Store / Brands" />
            {!loading && (
                <div className="min-h-screen bg-white">
                    <div className="max-w-6xl mx-auto px-5 pt-2 pb-20">
                        {/* Title */}
                        <div className="mb-7">
                            <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">
                                BRANDS
                            </h1>
                            <p className="text-sm text-gray-400 mt-1">
                                {filteredBrands.length} brands on The Makeup Store
                            </p>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2.5 bg-slate-100 rounded-lg px-3.5 h-11 mb-7 border border-gray-100">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search brands..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                            />
                            {searchQuery.length > 0 && (
                                <button onClick={() => setSearchQuery("")}>
                                    <SearchX className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>

                        {/* Exclusive Section */}
                        {exclusiveBrands.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-xs font-bold tracking-widest text-[#fc2779]">
                                        EXCLUSIVE
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className="grid grid-cols-3 gap-y-2">
                                    {exclusiveBrands.map((item) => (
                                        <BrandCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Essentials Section */}
                        {essentialBrands.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-xs font-bold tracking-widest text-gray-800">
                                        ESSENTIALS
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className="grid grid-cols-3 gap-y-2">
                                    {essentialBrands.map((item) => (
                                        <BrandCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {filteredBrands.length === 0 && (
                            <div className="flex flex-col items-center mt-[100px]">
                                <SearchX className="w-12 h-12 text-gray-300" />
                                <p className="mt-4 text-base font-semibold text-gray-700">
                                    No brands found
                                </p>
                                <p className="mt-1.5 text-sm text-gray-400">
                                    Try a different search term
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
