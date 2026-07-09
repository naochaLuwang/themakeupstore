import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { HomeMobile } from "./home-mobile"
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

  let bannersRes: any, catDataRes: any, prodDataRes: any, forever52ProdDataRes: any, parentCatDataRes: any, showcaseItemsRes: any, childrenDataRes: any, heroProductDataRes: any
  try {
    [bannersRes, catDataRes, prodDataRes, forever52ProdDataRes, parentCatDataRes, showcaseItemsRes, childrenDataRes, heroProductDataRes] = await Promise.all([
      supabase.from("hero_banners").select("image_url, subtitle, title, description, route").eq("is_active", true).order("position").limit(5),
      supabase.from("categories").select("id, name, slug, image_url, parent:parent_id(slug)").not("parent_id", "is", null).order("name"),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").order("created_at", { ascending: false }).limit(50),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("brand", "FOREVER52").limit(20),
      supabase.from("categories").select("id, name, slug, image_url").is("parent_id", null).order("name"),
      supabase.from("showcase_items").select("id, title, subtitle, image_url, link_url").eq("is_active", true).order("position", { ascending: true }),
      supabase.from("categories").select("id, parent_id").not("parent_id", "is", null),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("id", "e12ac9bb-564e-474c-ac80-e3ebdd281401").maybeSingle(),
    ])
  } catch {
    bannersRes = { data: null }
    catDataRes = { data: null }
    prodDataRes = { data: null }
    forever52ProdDataRes = { data: null }
    parentCatDataRes = { data: null }
    showcaseItemsRes = { data: null }
    childrenDataRes = { data: null }
    heroProductDataRes = { data: null }
  }
  const banners = bannersRes.data
  const catData = catDataRes.data
  const prodData = prodDataRes.data
  const forever52ProdData = forever52ProdDataRes.data
  const parentCatData = parentCatDataRes.data
  const showcaseItems = showcaseItemsRes.data
  const childrenData = childrenDataRes.data
  const heroProductData = heroProductDataRes.data

  const inStockProducts = (prodData || []).filter((p: any) => {
    const variants = p.product_variants || []
    return variants.length === 0 || variants.some((v: any) => Number(v.stock) > 0)
  }).slice(0, 12)

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

  const heroProd = heroProductData || inStockProducts.find((p: any) => p.thumbnail_url || p.product_variants?.[0]?.image_url)

  const faceCat = parents.find((c: any) => c.name.toLowerCase() === "face")
  const lipsCat = parents.find((c: any) => c.name.toLowerCase() === "lips")
  const skincareCat = parents.find((c: any) => c.name.toLowerCase() === "skincare")
  const tileThumb = (cat: any) => (shelfProducts[cat.id] || [])[0] || cat.image_url || ""
  const otherCats = parents.filter((c: any) => {
    const n = c.name.toLowerCase()
    return n !== "face" && n !== "lips" && n !== "skincare"
  })
  const displayCats = [faceCat, lipsCat, ...otherCats].filter(Boolean).slice(0, 9) as any[]

  const price = (p: any) => {
    const v = p.product_variants?.[0]
    if (v?.price) return Number(v.price)
    return Number(p.base_price) || 0
  }

  const discountLabel = (p: any) => {
    const v = p.product_variants?.[0]
    const dt = v?.discount_type || p.discount_type || "none"
    const dv = Number(v?.discount_value || p.discount_value || 0)
    if (dt === "percentage" && dv > 0) return `${dv}% OFF`
    if ((dt === "fixed" || dt === "amount") && dv > 0) return `₹${dv} OFF`
    return ""
  }

  return (
    <>
      {/* MARQUEE */}
      <div className="hidden md:block overflow-hidden mb-4" style={{ background: 'linear-gradient(90deg, #166534, #c084fc)' }}>
        <div className="animate-marquee whitespace-nowrap py-2.5 text-white text-xs font-bold uppercase tracking-[0.15em]">
          <span className="mx-6">MID YEAR SALE IS LIVE ! FREE SHIPPING ON ALL ORDERS ABOVE ₹2999</span>
          <span className="mx-6">MID YEAR SALE IS LIVE ! FREE SHIPPING ON ALL ORDERS ABOVE ₹2999</span>
          <span className="mx-6">MID YEAR SALE IS LIVE ! FREE SHIPPING ON ALL ORDERS ABOVE ₹2999</span>
        </div>
      </div>

      {/* DESKTOP — Bento Box */}
      <main className="hidden md:block bg-[#FDFBF7] min-h-screen">
        <div className="max-w-7xl mx-auto px-12 pb-14">
          <div className="grid grid-cols-6 gap-3 auto-rows-[minmax(0,auto)]">

            {/* ROW 1: Hero (3col) + Cat Face (2col) + New In (1col) */}
            {heroProd && (() => {
              const img = heroProd.thumbnail_url || heroProd.product_variants?.[0]?.image_url || ""
              return (
                <Link href={`/products/${heroProd.id}`} className="col-span-3 row-span-2 relative rounded-3xl overflow-hidden bg-slate-100 group">
                  {img ? (
                    <img src={img} alt={heroProd.name} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200">
                      <span className="text-6xl font-black text-white/40 tracking-tight">{heroProd.name[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{heroProd.brand || "Featured"}</p>
                    <p className="text-white text-lg font-black tracking-tight leading-tight">{heroProd.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-white text-base font-bold">₹{price(heroProd).toLocaleString("en-IN")}</span>
                      {discountLabel(heroProd) && (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full">{discountLabel(heroProd)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })()}

            {displayCats[0] && (
              <Link href={`/category/${displayCats[0].slug}`} className="col-span-2 row-span-1 relative rounded-2xl overflow-hidden bg-slate-100 group aspect-[2/1]">
                {tileThumb(displayCats[0]) ? (
                  <img src={tileThumb(displayCats[0])} alt={displayCats[0].name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-7xl font-black text-slate-300">{displayCats[0].name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm font-black tracking-tight">{displayCats[0].name}</p>
                </div>
              </Link>
            )}

            <div className="col-span-1 row-span-1 rounded-2xl bg-pink-500 flex flex-col items-center justify-center p-4">
              <p className="text-[8px] text-white/40 font-bold uppercase tracking-[0.25em] mb-1.5">Fresh</p>
              <p className="text-white text-xl font-black tracking-tight leading-[0.9] text-center">New<br />In</p>
            </div>

            {/* ROW 2: Lips + Skincare + Prod 1 (under Face + New In) */}
            {displayCats[1] && (
              <Link href={`/category/${displayCats[1].slug}`} className="col-span-1 row-span-1 relative rounded-2xl overflow-hidden bg-slate-100 group">
                {tileThumb(displayCats[1]) ? (
                  <img src={tileThumb(displayCats[1])} alt={displayCats[1].name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-5xl font-black text-slate-300">{displayCats[1].name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-[10px] font-black tracking-tight">{displayCats[1].name}</p>
                </div>
              </Link>
            )}

            {skincareCat && (
              <Link href={`/category/${skincareCat.slug}`} className="col-span-1 row-span-1 relative rounded-2xl overflow-hidden bg-slate-100 group">
                {tileThumb(skincareCat) ? (
                  <img src={tileThumb(skincareCat)} alt={skincareCat.name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-5xl font-black text-slate-300">{skincareCat.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-[10px] font-black tracking-tight">{skincareCat.name}</p>
                </div>
              </Link>
            )}

            {inStockProducts[1] && (
              <div className="col-span-1 row-span-1"><ProductCard product={inStockProducts[1]} /></div>
            )}

            {/* ROW 3: Brands */}
            {allBrands.length > 0 && (
              <div className="col-span-6 row-span-1 rounded-2xl bg-white border border-slate-100 overflow-hidden">
                <div className="px-9 py-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[8px] font-black text-pink-500 uppercase tracking-[0.3em]">Brands We Love</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    {allBrands.map((brand: any) => (
                      <Link key={brand} href={`/search?q=${encodeURIComponent(String(brand))}`} className="group">
                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-wider">{brand as string}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROW 4: Shop by Cat + 4 category tiles */}
            <div className="col-span-2 row-span-1 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 p-6 flex flex-col justify-center">
              <span className="text-[8px] font-black text-pink-400 uppercase tracking-[0.3em] mb-1">Browse</span>
              <span className="text-lg font-black tracking-tight text-slate-900 leading-tight">Shop by<br />Category</span>
              <Link href="/categories" className="mt-2 text-[8px] font-bold text-pink-400 uppercase tracking-[0.2em] border-b border-pink-200 pb-0.5 self-start hover:text-pink-600 transition-colors">View All →</Link>
            </div>

            {displayCats.slice(2, 6).map((cat: any) => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="col-span-1 row-span-1 relative rounded-2xl overflow-hidden bg-slate-100 group">
                {tileThumb(cat) ? (
                  <img src={tileThumb(cat)} alt={cat.name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-5xl font-black text-slate-300">{cat.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-[10px] font-black tracking-tight">{cat.name}</p>
                </div>
              </Link>
            ))}

            {/* ROW 5: 3 wider category tiles */}
            {displayCats.slice(6, 9).map((cat: any) => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="col-span-2 row-span-1 relative rounded-2xl overflow-hidden bg-slate-100 group aspect-[2/0.8]">
                {tileThumb(cat) ? (
                  <img src={tileThumb(cat)} alt={cat.name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-6xl font-black text-slate-300">{cat.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm font-black tracking-tight">{cat.name}</p>
                </div>
              </Link>
            ))}

            {/* ROW 6: FOREVER52 */}
            {forever52Products.length > 0 && (
              <>
                <div className="col-span-2 row-span-1 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 flex flex-col justify-center">
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">K-Beauty</span>
                  <span className="text-xl font-black tracking-tight text-emerald-900">FOREVER52</span>
                  <span className="text-[10px] text-emerald-600/70 mt-1">Up to {Math.max(...forever52Products.slice(0, 8).map((p: any) => p._discountPct || 0))}% off</span>
                  <Link href="/search?q=FOREVER52" className="mt-2 text-[8px] font-bold text-emerald-700 uppercase tracking-[0.2em] border-b border-emerald-300 pb-0.5 self-start hover:text-emerald-900 transition-colors">Shop All →</Link>
                </div>
                {forever52Products.slice(0, 4).map((product: any) => (
                  <div key={product.id} className="col-span-1 row-span-1"><ProductCard product={product} /></div>
                ))}
              </>
            )}

            {/* ROW 7: Products */}
            {inStockProducts.slice(2, 12).map((product: any) => (
              <div key={product.id} className="col-span-1 row-span-1"><ProductCard product={product} /></div>
            ))}

            {/* ROW 8: Deals + Value Props */}
            <div className="col-span-2 row-span-1 rounded-2xl bg-pink-50 flex flex-col items-center justify-center p-6">
              <span className="text-2xl font-black tracking-tight text-pink-600 leading-[0.9] text-center">Best<br />Deals</span>
              <Link href="/offers" className="mt-1.5 text-[8px] font-bold text-pink-400 uppercase tracking-[0.2em] border-b border-pink-200 pb-0.5 hover:text-pink-600 transition-colors">View All</Link>
            </div>
            {[
              { label: "Free Shipping", desc: "Above ₹2,999" },
              { label: "Easy Returns", desc: "14 days" },
            ].map((item) => (
              <div key={item.label} className="col-span-2 row-span-1 rounded-2xl bg-slate-50 flex flex-col items-center justify-center p-6">
                <p className="text-sm font-black text-slate-800 tracking-tight text-center">{item.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            ))}

          </div>
        </div>
      </main>

      {/* MOBILE: native-style scrollable feed */}
      <div className="md:hidden">
        <HomeMobile banner={banners?.[0] || null} categories={categories} products={inStockProducts} forever52Products={forever52Products} parentCategories={parentCatData || []} shelfProducts={shelfProducts} showcaseItems={showcaseItems || []} />
      </div>
    </>
  )
}
