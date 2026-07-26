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

  let bannersRes: any, catDataRes: any, prodDataRes: any, forever52ProdDataRes: any, parentCatDataRes: any, showcaseItemsRes: any, childrenDataRes: any, fentyProdDataRes: any
  try {
    [bannersRes, catDataRes, prodDataRes, forever52ProdDataRes, parentCatDataRes, showcaseItemsRes, childrenDataRes, fentyProdDataRes] = await Promise.all([
      supabase.from("hero_banners").select("image_url, subtitle, title, description, route").eq("is_active", true).order("position").limit(5),
      supabase.from("categories").select("id, name, slug, image_url, parent:parent_id(slug)").not("parent_id", "is", null).order("name"),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").order("created_at", { ascending: false }).limit(50),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("brand", "FOREVER52").limit(20),
      supabase.from("categories").select("id, name, slug, image_url").is("parent_id", null).order("name"),
      supabase.from("showcase_items").select("id, title, subtitle, image_url, link_url").eq("is_active", true).order("position", { ascending: true }),
      supabase.from("categories").select("id, parent_id").not("parent_id", "is", null),
      supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").eq("brand", "Fenty Beauty").not("thumbnail_url", "is", null).order("created_at", { ascending: false }),
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
      {/* MARQUEE */}
      <div className="hidden md:block overflow-hidden mb-4" style={{ background: 'linear-gradient(90deg, #166534, #c084fc)' }}>
        <div className="animate-marquee whitespace-nowrap py-2.5 text-white text-xs font-bold uppercase tracking-[0.15em]">
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
        </div>
      </div>

      {/* DESKTOP — Bento Box */}
      <main className="hidden md:block bg-[#FDFBF7] min-h-screen">
        <div className="max-w-7xl mx-auto px-12 pb-14">
          <div className="grid grid-cols-6 gap-3 auto-rows-[minmax(0,auto)]">

            {/* ROW 1: Fenty Beauty hero (3col) + Cat Face (2col) + New In (1col) */}
            {heroProduct && (() => {
              const v = heroProduct.product_variants?.[0]
              const img = heroProduct.thumbnail_url || v?.image_url || ""
              const productPrice = Number(v?.price || heroProduct.base_price || 0)
              const dt = v?.discount_type || heroProduct.discount_type || "none"
              const dv = Number(v?.discount_value || heroProduct.discount_value || 0)
              const label = dt === "percentage" && dv > 0 ? `${dv}% OFF` : (dt === "fixed" || dt === "amount") && dv > 0 ? `₹${dv} OFF` : ""
              return (
                <Link href={`/products/${heroProduct.id}`} className="col-span-3 row-span-2 relative rounded-3xl overflow-hidden bg-slate-100 group">
                  {img ? (
                    <img src={img} alt={heroProduct.name} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200">
                      <span className="text-6xl font-black text-white/40 tracking-tight">{heroProduct.name[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{heroProduct.brand || "Featured"}</p>
                    <p className="text-white text-lg font-black tracking-tight leading-tight">{heroProduct.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-white text-base font-bold">₹{productPrice.toLocaleString("en-IN")}</span>
                      {label && <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-full">{label}</span>}
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

        {/* Download App */}
        <div className="hidden md:block max-w-7xl mx-auto px-6 pb-16">
          <div className="bg-gray-900 rounded-3xl p-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/10 shrink-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">THE MAKEUP STORE</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className={`w-4 h-4 ${i <= 4 ? "text-amber-400" : "text-gray-600"}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-300">4.8</span>
                  <span className="text-sm text-gray-500">(120+)</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Shop authentic makeup & beauty products on the go.</p>
              </div>
            </div>
            <a
              href="https://play.google.com/store/apps/details?id=com.themakeupstorewangkhei.twa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-3.5 rounded-xl text-sm font-black hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 12.404c0 .602-.074 1.058-.23 1.373-.146.315-.37.572-.674.776-.283.192-.6.324-.953.394-.342.082-.703.12-1.083.12h-4.12v-5.33h3.4c.48 0 .867.027 1.162.092.294.064.554.176.776.332.234.155.413.365.547.634.134.27.214.572.214.914v.695h-1.577v-.634c0-.214-.037-.403-.113-.568-.074-.164-.18-.293-.316-.388-.136-.094-.294-.162-.483-.2-.19-.04-.393-.06-.612-.06h-1.715v5.338h2.14c.262 0 .493-.023.698-.07.204-.048.388-.12.548-.22.172-.1.307-.226.416-.38.107-.154.163-.345.163-.57v-.582h1.576zM5.28 12.546c0 .345-.058.656-.176.934-.116.278-.274.516-.48.717-.203.2-.444.355-.725.466-.28.11-.585.166-.912.166-.31 0-.606-.052-.882-.154-.278-.104-.517-.24-.72-.41-.202-.172-.367-.375-.493-.61-.126-.233-.202-.483-.226-.746h1.423c.018.128.066.248.141.358.076.11.166.204.28.282.113.078.24.14.385.186.144.045.28.068.414.068.163 0 .31-.028.438-.082.128-.055.23-.133.31-.232.08-.1.142-.217.19-.352.05-.134.074-.28.074-.442V9.27h1.59v3.276zM2.475 7.233h1.577v4.81H2.475v-4.81zM21.35 7.59a.527.527 0 01-.528.53.528.528 0 01-.53-.53c0-.294.236-.53.53-.53.292 0 .528.236.528.53zm.344 5.546h-1.578v-4.04H21.35v4.04h.344z"/></svg>
              GET IT ON GOOGLE PLAY
            </a>
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
