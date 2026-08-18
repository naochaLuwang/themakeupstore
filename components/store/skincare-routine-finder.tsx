"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronRight, Sparkles, Check, Droplets, Sun, Wind, Moon, Shield } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

type SkinType = "dry" | "oily" | "combination" | "normal" | "sensitive"
type Concern = "acne" | "aging" | "pigmentation" | "dryness" | "dullness" | "redness" | "pores"
type RoutineStep = "cleanser" | "toner" | "serum" | "moisturizer" | "sunscreen" | "eye-care" | "exfoliator"
type Texture = "gel" | "cream" | "lotion" | "oil" | "water-based" | "balm"
type Ingredient = "niacinamide" | "hyaluronic-acid" | "vitamin-c" | "retinol" | "salicylic-acid" | "aha" | "ceramide" | "peptide" | "squalane" | "zinc"

interface SkincareProduct {
    id: string
    name: string
    brand: string
    description: string
    thumbnail_url: string
    slug: string
    categorySlug: string
}

interface RoutineResult {
    step: RoutineStep
    label: string
    order: number
    products: SkincareProduct[]
}

const SKIN_TYPES: { value: SkinType; label: string; icon: any; desc: string }[] = [
    { value: "dry", label: "Dry", icon: Droplets, desc: "Tight, flaky, rough texture" },
    { value: "oily", label: "Oily", icon: Sun, desc: "Shiny, enlarged pores, greasy" },
    { value: "combination", label: "Combination", icon: Wind, desc: "Oily T-zone, dry cheeks" },
    { value: "normal", label: "Normal", icon: Shield, desc: "Balanced, minimal concerns" },
    { value: "sensitive", label: "Sensitive", icon: Moon, desc: "Easily irritated, red, reactive" },
]

const CONCERNS: { value: Concern; label: string }[] = [
    { value: "acne", label: "Acne & Breakouts" },
    { value: "aging", label: "Aging & Wrinkles" },
    { value: "pigmentation", label: "Dark Spots & Pigmentation" },
    { value: "dryness", label: "Dryness & Dehydration" },
    { value: "dullness", label: "Dullness & Uneven Tone" },
    { value: "redness", label: "Redness & Sensitivity" },
    { value: "pores", label: "Large Pores & Blackheads" },
]

const ROUTINE_STEPS: { value: RoutineStep; label: string; order: number }[] = [
    { value: "cleanser", label: "Cleanser", order: 1 },
    { value: "toner", label: "Toner", order: 2 },
    { value: "exfoliator", label: "Exfoliator", order: 3 },
    { value: "serum", label: "Serum", order: 4 },
    { value: "eye-care", label: "Eye Care", order: 5 },
    { value: "moisturizer", label: "Moisturizer", order: 6 },
    { value: "sunscreen", label: "Sunscreen", order: 7 },
]

const TEXTURES: { value: Texture; label: string }[] = [
    { value: "gel", label: "Gel" }, { value: "cream", label: "Cream" }, { value: "lotion", label: "Lotion" },
    { value: "oil", label: "Oil" }, { value: "water-based", label: "Water-Based" }, { value: "balm", label: "Balm" },
]

const INGREDIENTS: { value: Ingredient; label: string; concerns: Concern[] }[] = [
    { value: "niacinamide", label: "Niacinamide", concerns: ["acne", "pigmentation", "dullness", "pores", "redness"] },
    { value: "hyaluronic-acid", label: "Hyaluronic Acid", concerns: ["dryness", "aging"] },
    { value: "vitamin-c", label: "Vitamin C", concerns: ["pigmentation", "dullness", "aging"] },
    { value: "retinol", label: "Retinol", concerns: ["aging", "acne", "dullness", "pores"] },
    { value: "salicylic-acid", label: "Salicylic Acid", concerns: ["acne", "pores"] },
    { value: "aha", label: "AHA / Glycolic Acid", concerns: ["dullness", "pigmentation", "pores"] },
    { value: "ceramide", label: "Ceramides", concerns: ["dryness", "redness"] },
    { value: "peptide", label: "Peptides", concerns: ["aging", "dryness"] },
    { value: "squalane", label: "Squalane", concerns: ["dryness", "redness"] },
    { value: "zinc", label: "Zinc", concerns: ["acne", "redness"] },
]

// Keyword maps for text matching against product name/description
const CONCERN_KEYWORDS: Record<Concern, string[]> = {
    acne: ["acne", "breakout", "blemish", "salicylic", "spot", "pimple", "clog"],
    aging: ["aging", "wrinkle", "fine line", "retinol", "peptide", "firm", "lift", "collagen"],
    pigmentation: ["pigment", "dark spot", "brighten", "vitamin c", "glow", "uneven tone", "hyperpigmentation"],
    dryness: ["dry", "hydrat", "moistur", "dehydrat", "hyaluronic", "squalane", "nourish", "ceramide"],
    dullness: ["dull", "glow", "brighten", "radiance", "vitamin c", "aha", "exfoliat"],
    redness: ["redness", "soothe", "calm", "sensitive", "niacinamide", "ceramide", "barrier"],
    pores: ["pore", "blackhead", "salicylic", "niacinamide", "tighten", "clarify"],
}

const SKIN_TYPE_KEYWORDS: Record<SkinType, string[]> = {
    dry: ["dry", "dry skin", "dehydrat", "nourish", "rich", "cream"],
    oily: ["oily", "oil-control", "matte", "gel", "non-comedogenic", "lightweight", "sebum"],
    combination: ["combination", "balance", "normal"],
    normal: ["normal", "all skin", "daily"],
    sensitive: ["sensitive", "soothe", "calm", "gentle", "fragrance-free", "barrier"],
}

const TEXTURE_KEYWORDS: Record<Texture, string[]> = {
    gel: ["gel", "gel-based"],
    cream: ["cream", "rich cream", "thick"],
    lotion: ["lotion", "lightweight"],
    oil: ["oil", "face oil", "cleansing oil"],
    "water-based": ["water-based", "water", "essence", "mist"],
    balm: ["balm", "cleansing balm"],
}

const ROUTINE_KEYWORDS: Record<RoutineStep, string[]> = {
    cleanser: ["cleanser", "face wash", "wash", "cleansing"],
    toner: ["toner", "tonic", "essence"],
    serum: ["serum", "concentrate", "treatment"],
    moisturizer: ["moisturiser", "moisturizer", "cream", "moisture"],
    sunscreen: ["sunscreen", "spf", "sun protect", "sunblock", "uv"],
    "eye-care": ["eye", "eye cream", "under eye", "eye serum"],
    exfoliator: ["exfoliat", "scrub", "aha", "bha"],
}

interface Props {
    open: boolean
    onClose: () => void
}

function PillSelect<T extends string>({ options, selected, onChange, label }: {
    options: { value: T; label: string; icon?: any; desc?: string }[]
    selected: T | null
    onChange: (v: T) => void
    label?: string
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const Icon = opt.icon
                const active = selected === opt.value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`px-4 py-3 rounded-2xl border-2 text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 text-left ${
                            active
                                ? "border-stone-900 bg-stone-900 text-white shadow-md"
                                : "border-stone-100 text-stone-500 hover:border-stone-300 bg-white"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {Icon && <Icon className={`w-3.5 h-3.5 ${active ? "text-white/70" : "text-stone-400"}`} />}
                            <span>{opt.label}</span>
                        </div>
                        {opt.desc && <span className={`block text-[7px] font-medium lowercase tracking-normal mt-0.5 ${active ? "text-white/50" : "text-stone-400"}`}>{opt.desc}</span>}
                    </button>
                )
            })}
        </div>
    )
}

export default function SkincareRoutineFinder({ open, onClose }: Props) {
    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState<"quiz" | "loading" | "result">("quiz")
    const [skinType, setSkinType] = useState<SkinType | null>(null)
    const [concern, setConcern] = useState<Concern | null>(null)
    const [texture, setTexture] = useState<Texture | null>(null)
    const [ingredient, setIngredient] = useState<Ingredient | null>(null)
    const [results, setResults] = useState<RoutineResult[]>([])

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        if (open) {
            setStep("quiz"); setSkinType(null); setConcern(null); setTexture(null); setIngredient(null); setResults([])
        }
    }, [open])

    const hasAnswers = skinType || concern || texture || ingredient

    const findRoutine = useCallback(async () => {
        setStep("loading")
        const supabase = createClient()

        // Fetch skincare parent categories
        const { data: parents } = await supabase
            .from("categories")
            .select("id, slug, name")
            .in("slug", ["skincare", "face"])

        if (!parents || parents.length === 0) {
            setResults([]);
            setStep("result");
            return
        }

        const parentIds = parents.map((p: any) => p.id)

        // Fetch all subcategories under skincare/face
        const { data: subCats } = await supabase
            .from("categories")
            .select("id, slug, name")
            .in("parent_id", parentIds)

        const allSkincareCats = [...parents, ...(subCats || [])]
        const catSlugMap = new Map(allSkincareCats.map(c => [c.id, c.slug]))
        const catIds = allSkincareCats.map(c => c.id)

        // Fetch products in those categories via junction table
        const { data: junction } = await supabase
            .from("product_categories")
            .select("product_id, category_id")
            .in("category_id", catIds)

        if (!junction || junction.length === 0) {
            setResults([]);
            setStep("result");
            return
        }

        const productIds = [...new Set(junction.map((j: any) => j.product_id))]

        const { data: products } = await supabase
            .from("products")
            .select("id, name, brand, description, thumbnail_url, slug, category_id")
            .in("id", productIds)
            .eq("status", "active")

        if (!products) { setResults([]); setStep("result"); return }

        // Build product → category mapping
        const productCategoryMap = new Map<string, string[]>()
        junction.forEach((j: any) => {
            const existing = productCategoryMap.get(j.product_id) || []
            existing.push(j.category_id)
            productCategoryMap.set(j.product_id, existing)
        })

        // Score each product
        const scored = products.map((p: any) => {
            const text = `${p.name} ${p.description || ""}`.toLowerCase()
            let score = 0
            const matches: string[] = []

            // Match by concern
            if (concern) {
                const concernKeywords = CONCERN_KEYWORDS[concern]
                const concernMatch = concernKeywords.some(kw => text.includes(kw))
                if (concernMatch) { score += 3; matches.push("Targets your concern") }
            }

            // Match by skin type
            if (skinType) {
                const stKeywords = SKIN_TYPE_KEYWORDS[skinType]
                const stMatch = stKeywords.some(kw => text.includes(kw))
                if (stMatch) { score += 2; matches.push("Suitable for your skin type") }
            }

            // Match by texture
            if (texture) {
                const texKeywords = TEXTURE_KEYWORDS[texture]
                const texMatch = texKeywords.some(kw => text.includes(kw))
                if (texMatch) { score += 2; matches.push(`${texture.charAt(0).toUpperCase() + texture.slice(1)} texture`) }
            }

            // Match by ingredient
            if (ingredient) {
                const ingLabel = INGREDIENTS.find(i => i.value === ingredient)?.label.toLowerCase() || ingredient.replace("-", " ")
                if (text.includes(ingLabel)) { score += 3; matches.push("Contains key ingredient") }
            }

            // Determine routine step from category
            const pCatIds = productCategoryMap.get(p.id) || []
            let stepMatch: string | null = null
            for (const cid of pCatIds) {
                const slug = catSlugMap.get(cid) || ""
                if (ROUTINE_KEYWORDS.cleanser.some(kw => slug.includes(kw))) stepMatch = "cleanser"
                else if (ROUTINE_KEYWORDS.toner.some(kw => slug.includes(kw))) stepMatch = "toner"
                else if (ROUTINE_KEYWORDS.exfoliator.some(kw => slug.includes(kw))) stepMatch = "exfoliator"
                else if (ROUTINE_KEYWORDS.serum.some(kw => slug.includes(kw))) stepMatch = "serum"
                else if (ROUTINE_KEYWORDS["eye-care"].some(kw => slug.includes(kw))) stepMatch = "eye-care"
                else if (ROUTINE_KEYWORDS.moisturizer.some(kw => slug.includes(kw))) stepMatch = "moisturizer"
                else if (ROUTINE_KEYWORDS.sunscreen.some(kw => slug.includes(kw))) stepMatch = "sunscreen"
            }

            return {
                product: {
                    id: p.id,
                    name: p.name,
                    brand: p.brand || "",
                    description: p.description || "",
                    thumbnail_url: p.thumbnail_url || "",
                    slug: p.slug,
                    categorySlug: catSlugMap.get(pCatIds[0] || "") || "",
                } as SkincareProduct,
                step: stepMatch as RoutineStep | null,
                score,
                matches,
            }
        })

        // Filter to products that matched a routine step AND have a minimum score
        const valid = scored.filter((s: any) => s.step && s.score >= (hasAnswers ? 1 : 0))
        const grouped = new Map<RoutineStep, SkincareProduct[]>()
        ROUTINE_STEPS.forEach(rs => grouped.set(rs.value, []))

        valid.sort((a: any, b: any) => b.score - a.score)
        valid.forEach((s: any) => {
            const step = s.step as RoutineStep
            const list = grouped.get(step) || []
            if (list.length < 3) list.push(s.product)
            grouped.set(step, list)
        })

        const result: RoutineResult[] = ROUTINE_STEPS
            .filter(rs => (grouped.get(rs.value) || []).length > 0)
            .map(rs => ({
                step: rs.value,
                label: rs.label,
                order: rs.order,
                products: grouped.get(rs.value) || [],
            }))
            .sort((a, b) => a.order - b.order)

        setResults(result)
        setStep("result")
    }, [skinType, concern, texture, ingredient, hasAnswers])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                {step !== "quiz" ? (
                                    <button onClick={() => setStep("quiz")} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                    </button>
                                ) : <Sparkles className="w-4 h-4 text-stone-400" />}
                                <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                                    {step === "quiz" ? "Build Your Routine" : "Your Routine"}
                                </h3>
                            </div>
                            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5">
                            {/* STEP 1: QUESTIONNAIRE */}
                            {step === "quiz" && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-1 flex-1 rounded-full bg-stone-900" />
                                        <div className="h-1 w-6 rounded-full bg-stone-200" />
                                        <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest ml-1">1/2</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-stone-800">Tell us about your skin</p>
                                        <p className="text-[10px] text-stone-400 mt-1">We&apos;ll recommend products tailored to your needs.</p>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3">Your Skin Type</p>
                                        <PillSelect options={SKIN_TYPES} selected={skinType} onChange={setSkinType} />
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3">Primary Concern</p>
                                        <PillSelect options={CONCERNS} selected={concern} onChange={setConcern} />
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3">Texture Preference</p>
                                        <PillSelect options={TEXTURES} selected={texture} onChange={setTexture} />
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3">Key Ingredient (optional)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {INGREDIENTS.map(ing => (
                                                <button key={ing.value} onClick={() => setIngredient(ingredient === ing.value ? null : ing.value)}
                                                    className={`px-3 py-2 rounded-full border text-[8px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                                        ingredient === ing.value ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100 hover:border-stone-300"
                                                    }`}
                                                >
                                                    {ing.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        disabled={!hasAnswers}
                                        onClick={findRoutine}
                                        className="w-full h-12 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        Build My Routine <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* STEP 2: LOADING */}
                            {step === "loading" && (
                                <div className="py-16 text-center space-y-4">
                                    <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-stone-900 animate-spin mx-auto" />
                                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Curating your routine...</p>
                                </div>
                            )}

                            {/* STEP 3: RESULTS */}
                            {step === "result" && (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                                        <Sparkles className="w-5 h-5 text-stone-500 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-stone-800">Routine for {skinType && SKIN_TYPES.find(s => s.value === skinType)?.label} Skin</p>
                                            <p className="text-[9px] text-stone-400">Focus: {CONCERNS.find(c => c.value === concern)?.label}</p>
                                        </div>
                                    </div>

                                    {results.length === 0 && (
                                        <div className="text-center py-8 space-y-3">
                                            <p className="text-xs font-medium text-stone-500">No matching products found</p>
                                            <button onClick={() => setStep("quiz")} className="text-[10px] text-stone-400 underline underline-offset-2">Adjust your preferences</button>
                                        </div>
                                    )}

                                    {results.map(rs => (
                                        <div key={rs.step}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-full bg-stone-900 text-white text-[9px] font-black flex items-center justify-center">{rs.order}</div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">{rs.label}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {rs.products.map(p => (
                                                    <Link key={p.id} href={`/products/${p.id}`} onClick={onClose}
                                                        className="flex items-center gap-3 p-3 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-all active:scale-[0.99]"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                                                            {p.thumbnail_url ? (
                                                                 <img src={p.thumbnail_url} className="w-full h-full object-cover" alt={p.name} loading="lazy" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-stone-300 text-[18px] font-black">{p.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-stone-800 truncate">{p.name}</p>
                                                            {p.brand && <p className="text-[8px] text-stone-400 uppercase tracking-wider">{p.brand}</p>}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={() => setStep("quiz")} className="w-full h-12 rounded-2xl border border-stone-200 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-50 transition-all">
                                        Refine My Routine
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
