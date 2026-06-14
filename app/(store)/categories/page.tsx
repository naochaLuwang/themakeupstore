"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { ArrowRight, ChevronDown } from "lucide-react"
import { SignatureLoader } from "@/components/store/signature-loader"

const cardTints = [
    { bg: "#FFF0F0", accent: "#FF2D8D" },
    { bg: "#F5F0EB", accent: "#8B7355" },
    { bg: "#F0EEFF", accent: "#7C6FE0" },
    { bg: "#FFF5EB", accent: "#D4764A" },
    { bg: "#F0F7F4", accent: "#2E7D6F" },
    { bg: "#FFF0F5", accent: "#C2185B" },
    { bg: "#F5F0FF", accent: "#6B3FA0" },
    { bg: "#F0F4FF", accent: "#4A90D9" },
    { bg: "#FFF8F0", accent: "#B8860B" },
    { bg: "#F5FFF5", accent: "#4A7C59" },
]

const categoryImageMap: Record<string, string> = {
    face: "face.png", foundation: "face.png", "face-primer": "face.png",
    concealer: "face.png", blush: "face.png", contour: "face.png",
    highlighter: "face.png", compact: "face.png", "loose-powder": "face.png",
    "setting-spray": "face.png",
    lips: "lips.png", lipstick: "lips.png", "lip-liner": "lips.png",
    "liquid-lipstick": "lips.png", "lip-gloss": "lips.png", "lip-balm": "lips.png",
    "lip-tint": "lips.png",
    eyes: "eyes.png", "eye-shadow": "eyes.png", eyeliner: "eyes.png",
    kajal: "eyes.png", mascara: "eyes.png", "eye-brow-enhancers": "eyes.png",
    "false-eyelashes": "eyes.png",
    skincare: "skincare.png", serum: "skincare.png", moisturisers: "skincare.png",
    "cleansers--toners": "skincare.png", sunscreen: "skincare.png",
    "sheet-mask": "skincare.png",
    brushes: "brush.png", "brushes--accessories": "brush.png",
    "makeup-brushes": "brush.png", "makeup-remover--wipes": "brush.png",
}

export default function CategoriesPage() {
    const [allCategories, setAllCategories] = useState<any[]>([])
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchCategories() {
            try {
                const { data, error } = await supabase
                    .from("categories")
                    .select("id, name, slug, parent_id, image_url")
                    .order("name", { ascending: true })
                if (error) throw error
                setAllCategories(data || [])
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchCategories()
    }, [supabase])

    const { parents, childrenMap } = useMemo(() => {
        const excludedSlugs = ["exclusive", "essentials", "new-arrivals"]
        const filtered = allCategories.filter((c) => !excludedSlugs.includes(c.slug))
        const parents: any[] = []
        const childrenMap: Record<string, any[]> = {}
        filtered.forEach((cat) => {
            if (!cat.parent_id) parents.push(cat)
            else {
                if (!childrenMap[cat.parent_id]) childrenMap[cat.parent_id] = []
                childrenMap[cat.parent_id].push(cat)
            }
        })
        return { parents, childrenMap }
    }, [allCategories])

    const getCategoryImage = (slug: string): string | null => {
        const filename = categoryImageMap[slug]
        return filename ? `/categories/${filename}` : null
    }

    return (
        <>
            <SignatureLoader loading={loading} text="The Makeup Store / Categories" />
            {!loading && (
                <div className="min-h-screen bg-white">
                    <div className="max-w-2xl mx-auto px-5 pt-2 pb-24">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-[32px] font-bold text-gray-900 tracking-tight leading-[46px]">
                                Categories
                            </h1>
                            <p className="text-base text-gray-500 mt-1">
                                Discover premium beauty, skincare & makeup
                            </p>
                        </div>

                        {/* Category Cards */}
                        {parents.length > 0 ? (
                            <div className="space-y-[18px]">
                                {parents.map((parent, idx) => {
                                    const tint = cardTints[idx % cardTints.length]
                                    const children = childrenMap[parent.id] || []
                                    const isExpanded = expandedId === parent.id
                                    const bgImage = getCategoryImage(parent.slug)
                                    const numStr = (idx + 1).toString().padStart(2, "0")

                                    return (
                                        <div key={parent.id}>
                                            <button
                                                onClick={() =>
                                                    setExpandedId(isExpanded ? null : parent.id)
                                                }
                                                className="w-full text-left rounded-[26px] min-h-[180px] overflow-hidden relative border-0 outline-none"
                                                style={{
                                                    borderBottomLeftRadius: isExpanded ? 0 : 26,
                                                    borderBottomRightRadius: isExpanded ? 0 : 26,
                                                }}
                                            >
                                                {/* Backdrop image */}
                                                {bgImage && (
                                                    <img
                                                        src={bgImage}
                                                        alt=""
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        style={{
                                                            backgroundColor: tint.bg,
                                                            borderRadius: 26,
                                                        }}
                                                    />
                                                )}
                                                {/* Tint overlay */}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        backgroundColor: tint.bg,
                                                        opacity: 0.55,
                                                        borderRadius: 26,
                                                    }}
                                                />
                                                {/* Content */}
                                                <div className="relative z-10 p-6 min-h-[180px] flex flex-col justify-between">
                                                    <div>
                                                        <span
                                                            className="text-xs font-medium"
                                                            style={{ color: tint.accent + "60" }}
                                                        >
                                                            {numStr}
                                                        </span>
                                                        <h2 className="text-[22px] font-semibold text-gray-900 -tracking-[0.3px] mt-1">
                                                            {parent.name}
                                                        </h2>
                                                        <p
                                                            className="text-sm font-medium mt-1.5"
                                                            style={{ color: tint.accent }}
                                                        >
                                                            {children.length}{" "}
                                                            {children.length === 1
                                                                ? "category"
                                                                : "categories"}
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <div
                                                            className="w-11 h-11 rounded-full flex items-center justify-center"
                                                            style={{ backgroundColor: "#111" }}
                                                        >
                                                            <ArrowRight className="w-[18px] h-[18px] text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Expanded sub-list */}
                                            {isExpanded && children.length > 0 && (
                                                <div
                                                    className="rounded-b-[26px] -mt-[14px] pt-5 pb-3 shadow-md"
                                                    style={{
                                                        backgroundColor: tint.bg + "D4",
                                                        boxShadow:
                                                            "0 4px 12px rgba(0,0,0,0.06)",
                                                    }}
                                                >
                                                    <div className="h-px mx-6 bg-white/70" />
                                                    <div className="px-5 pt-[18px] pb-[14px] space-y-2.5">
                                                        {children.map((child: any) => (
                                                            <Link
                                                                key={child.id}
                                                                href={`/categories/${child.slug}`}
                                                                className="flex items-center gap-3.5 h-16 rounded-[18px] px-[18px] hover:brightness-95 transition-all"
                                                                style={{
                                                                    backgroundColor:
                                                                        tint.accent + "0D",
                                                                }}
                                                            >
                                                                <div
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                                                    style={{
                                                                        backgroundColor:
                                                                            tint.accent + "20",
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="w-2 h-2 rounded-full opacity-60"
                                                                        style={{
                                                                            backgroundColor:
                                                                                tint.accent,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="flex-1 text-base font-medium text-gray-900 -tracking-[0.2px]">
                                                                    {child.name}
                                                                </span>
                                                                <ChevronDown
                                                                    className="w-4 h-4 opacity-50 -rotate-90 shrink-0"
                                                                    style={{
                                                                        color: tint.accent,
                                                                    }}
                                                                />
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    )
}
