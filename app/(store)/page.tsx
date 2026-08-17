import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { HomeMobile } from "./home-mobile"
import { HomeDesktop } from "./home-desktop"
import { ProductCard } from "@/components/store/product-card"

export const metadata: Metadata = {
    title: "Home",
    description: "Shop authentic makeup and beauty products at THE MAKEUP STORE WANGKHEI in Imphal.",
}

const BRAND_BLACKLIST = [
  "Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner",
  "Liquid Lipstick", "Blush", "Bronzer & Contour", "Highlighter & Illuminator", "Loose Powder", "Compact",
  "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray",
  "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm",
  "Lip Tint", "Cleansers & Toners", "Moisturisers", "Serum", "Sunscreen",
  "False Eyelashes", "Makeup Brushes", "Makeup remover & wipes", "Sheet Mask",
  "Sponges & Applicators",
]

export default async function GatewayPage() {
  const supabase = await createClient()

  let bannersRes: any, catDataRes: any, prodDataRes: any, forever52ProdDataRes: any, parentCatDataRes: any, showcaseItemsRes: any, childrenDataRes: any, fentyProdDataRes: any
  try {
    [bannersRes, catDataRes, prodDataRes, forever52ProdDataRes, parentCatDataRes, showcaseItemsRes, childrenDataRes, fentyProdDataRes] = await Promise.all([
      supabase.from("hero_banners").select("image_url, subtitle, title, description, route").eq("is_active", true).order("position").limit(5),
      supabase.from("categories").select("id, name, slug, image_url, parent:parent_id(slug)").not("parent_id", "is", null).order("name"),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, tag, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").order("created_at", { ascending: false }).limit(50),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, tag, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("brand", "FOREVER52").limit(20),
      supabase.from("categories").select("id, name, slug, image_url").is("parent_id", null).order("name"),
      supabase.from("showcase_items").select("id, title, subtitle, image_url, link_url").eq("is_active", true).order("position", { ascending: true }),
      supabase.from("categories").select("id, parent_id").not("parent_id", "is", null),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, tag, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("brand", "Fenty Beauty").not("thumbnail_url", "is", null).order("created_at", { ascending: false }),
    ])
  } catch {
    bannersRes = { data: null }
    catDataRes = { data: null }
    prodDataRes = { data: null }
    forever52ProdDataRes = { data: null }
    parentCatDataRes = { data: null }
    showcaseItemsRes = { data: null }
    childrenDataRes = { data: null }
    fentyProdDataRes = { data: null }
  }
  const banners = bannersRes.data
  const catData = catDataRes.data
  const prodData = prodDataRes.data
  const forever52ProdData = forever52ProdDataRes.data
  const parentCatData = parentCatDataRes.data
  const showcaseItems = showcaseItemsRes.data
  const childrenData = childrenDataRes.data
  const fentyProducts = (fentyProdDataRes.data || []).filter((p: any) => {
    const variants = p.product_variants || []
    return variants.length === 0 || variants.some((v: any) => Number(v.stock) > 0)
  })

  const inStockProducts = (prodData || []).filter((p: any) => {
    const variants = p.product_variants || []
    return variants.length === 0 || variants.some((v: any) => Number(v.stock) > 0)
  }).slice(0, 12)

  const heroProduct = fentyProducts[0] || inStockProducts.find((p: any) => p.thumbnail_url || p.product_variants?.[0]?.image_url)

  const categories = (catData || []).filter((b: any) =>
    !BRAND_BLACKLIST.some(name => b.name.toLowerCase() === name.toLowerCase())
  )

  const forever52Products = (forever52ProdData || []).filter((p: any) => {
    const variants = p.product_variants || []
    return variants.length === 0 || variants.some((v: any) => Number(v.stock) > 0)
  }).map((p: any) => {
    const discountPct = Math.max(0, ...(p.product_variants || []).map((v: any) => {
      const base = Number(v.price) || 0
      if (base <= 0) return 0
      const dt = v.discount_type || p.discount_type || "none"
      const dv = Number(v.discount_value || p.discount_value || 0)
      if (dt === "percentage" && dv > 0) return dv
      if ((dt === "fixed" || dt === "amount") && dv > 0) return Math.round((dv / base) * 100)
      return 0
    }))
    return { ...p, outOfStock: false, _discountPct: discountPct }
  }).sort((a: any, b: any) => b._discountPct - a._discountPct)

  const parents = (parentCatData || []).filter((c: any) => c.slug !== "essentials" && c.slug !== "exclusive")
  const parentIds = parents.map((c: any) => c.id)

  // Build cat → product thumbnail map (same as mobile)
  const childMap: Record<string, string[]> = {}
  ;(childrenData || []).forEach((c: any) => {
    if (parentIds.includes(c.parent_id)) {
      if (!childMap[c.parent_id]) childMap[c.parent_id] = []
      childMap[c.parent_id].push(c.id)
    }
  })
  const allCatIds = [...parentIds, ...Object.values(childMap).flat()]
  let shelfProducts: Record<string, string[]> = {}
  if (allCatIds.length > 0) {
    const { data: pcData } = await supabase
      .from("product_categories")
      .select("category_id, products(thumbnail_url)")
      .in("category_id", allCatIds)
      .limit(500)
    const byCat: Record<string, string[]> = {}
    ;(pcData as any[] | null)?.forEach(r => {
      const cid = r.category_id
      const products = Array.isArray(r.products) ? r.products : r.products ? [r.products] : []
      for (const p of products) {
        const thumb = p?.thumbnail_url
        if (thumb) {
          if (!byCat[cid]) byCat[cid] = []
          if (!byCat[cid].includes(thumb)) byCat[cid].push(thumb)
        }
      }
    })
    parentIds.forEach((pid: any) => {
      const thumbs = [...(byCat[pid] || [])]
      for (const cid of (childMap[pid] || [])) {
        if (thumbs.length >= 3) break
        ;(byCat[cid] || []).forEach((t: any) => { if (!thumbs.includes(t)) thumbs.push(t) })
      }
      if (thumbs.length > 0) shelfProducts[pid] = thumbs.slice(0, 3)
    })
    const missing = parents.filter((c: any) => !shelfProducts[c.id])
    if (missing.length > 0) {
      const { data: fallback } = await supabase
        .from("product_categories")
        .select("category_id, products(thumbnail_url)")
        .in("category_id", missing.map((c: any) => c.id))
        .limit(100)
      const fb: Record<string, string[]> = {}
      ;(fallback as any[] | null)?.forEach(r => {
        const products = Array.isArray(r.products) ? r.products : r.products ? [r.products] : []
        for (const p of products) {
          const thumb = p?.thumbnail_url
          if (thumb) {
            if (!fb[r.category_id]) fb[r.category_id] = []
            if (!fb[r.category_id].includes(thumb)) fb[r.category_id].push(thumb)
          }
        }
      })
      missing.forEach((c: any) => {
        if (fb[c.id]?.length) shelfProducts[c.id] = fb[c.id].slice(0, 3)
      })
    }
  }

  const allBrands: string[] = [...new Set((prodData || []).map((p: any) => p.brand).filter(Boolean))].slice(0, 12) as string[]

  const faceCat = parents.find((c: any) => c.name.toLowerCase() === "face")
  const lipsCat = parents.find((c: any) => c.name.toLowerCase() === "lips")
  const skincareCat = parents.find((c: any) => c.name.toLowerCase() === "skincare")
  const tileThumb = (cat: any) => (shelfProducts[cat.id] || [])[0] || cat.image_url || ""
  const otherCats = parents.filter((c: any) => {
    const n = c.name.toLowerCase()
    return n !== "face" && n !== "lips" && n !== "skincare"
  })
  const displayCats = [faceCat, lipsCat, ...otherCats].filter(Boolean).slice(0, 9) as any[]

  return (
    <>
      {/* DESKTOP: mobile-like scrollable feed */}
      <div className="hidden md:block">
        <HomeDesktop banner={banners?.[0] || null} categories={categories} products={inStockProducts} forever52Products={forever52Products} parentCategories={parentCatData || []} shelfProducts={shelfProducts} />
      </div>

      {/* MOBILE: native-style scrollable feed */}
      <div className="md:hidden">
        <HomeMobile banner={banners?.[0] || null} categories={categories} products={inStockProducts} forever52Products={forever52Products} parentCategories={parentCatData || []} shelfProducts={shelfProducts} showcaseItems={showcaseItems || []} />
      </div>
    </>
  )
}
