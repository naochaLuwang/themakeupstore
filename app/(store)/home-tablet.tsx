"use client"

import Link from "next/link"
import { ProductCard } from "@/components/store/product-card"
import { FunSizeSection } from "@/components/store/fun-size-section"
import { ArrowRight, TrendingUp, Truck, ShieldCheck, Package, Headphones } from "lucide-react"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

const VALUES = [
  { icon: Truck, label: "Free Shipping", sub: "Above ₹2,999" },
  { icon: ShieldCheck, label: "100% Authentic", sub: "Guaranteed" },
  { icon: Package, label: "Easy Returns", sub: "Within 3 days" },
  { icon: Headphones, label: "24/7 Support", sub: "We're here" },
]

interface CategoryItem {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent?: { slug: string } | { slug: string }[] | null
}

interface ProductItem {
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
  outOfStock?: boolean
  product_variants: any[]
}

interface BannerItem {
  id: string
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  route: string | null
}

interface Props {
  banner: BannerItem | null
  categories: CategoryItem[]
  products: ProductItem[]
  forever52Products: ProductItem[]
  parentCategories: CategoryItem[]
  shelfProducts: Record<string, string[]>
  funSizeProducts: ProductItem[]
}

export function HomeTablet({ banner, categories, products, forever52Products, parentCategories, shelfProducts, funSizeProducts }: Props) {
  const hero = banner
  const heroImage = "/web-home.webp"
  const featuredProduct = products[0]
  const recentlyViewed = useRecentlyViewed(s => s.items)

  return (
    <div className="bg-white min-h-screen">
      {/* HERO BANNER — tablet optimized aspect ratio */}
      <div className="relative w-full aspect-[2/1] -mt-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center pl-12 max-w-[1000px] mx-auto">
          <span className="inline-block bg-[#fc2779] text-white text-xs font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4 self-start">
            NEW COLLECTION
          </span>
          <h1 className="text-5xl font-black text-white uppercase tracking-tight leading-[0.95]">
            THE MAKEUP
            <br />
            <span className="text-[#fc2779]">STORE</span>
          </h1>
          <p className="text-white/80 text-sm font-medium mt-3 max-w-md leading-relaxed">
            Luxury Makeup, Skin Care from the worlds most coveted brand
          </p>
          <Link
            href={hero?.route || "/exclusive"}
            className="inline-flex items-center gap-2 bg-[#fc2779] text-white text-sm font-black uppercase tracking-wider px-8 py-3 rounded-full hover:bg-[#e01567] transition-all shadow-xl mt-4 self-start"
          >
            Shop Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* SHIPPING BANNER */}
      <div className="bg-gradient-to-r from-[#fc2779]/5 via-[#fc2779]/10 to-[#fc2779]/5 py-3">
        <div className="flex items-center justify-center gap-2">
          <Truck className="w-4 h-4 text-[#fc2779]" />
          <p className="text-[#fc2779] font-bold text-xs tracking-wide">
            FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST
          </p>
        </div>
      </div>

      {/* VALUE PROPS — compact for tablet */}
      <div className="flex gap-6 py-6 mb-12 max-w-[1000px] mx-auto px-8">
        {VALUES.map((v) => (
          <div key={v.label} className="flex-1 flex flex-col items-center gap-1">
            <v.icon className="w-5 h-5 text-[#fc2779]" />
            <span className="text-xs font-bold text-slate-800 tracking-tight mt-1">{v.label}</span>
            <span className="text-[9px] text-slate-400">{v.sub}</span>
          </div>
        ))}
      </div>

      <div className="max-w-[1000px] mx-auto px-8">
        {/* CATEGORY HORIZONTAL SCROLL — 4 columns for tablet */}
        {categories.length > 0 && (
          <div className="mb-16 bg-[#FFF8F0] rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-light text-[#fc2779] uppercase tracking-wider mb-1">FEATURED</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Our Brands</h2>
              </div>
              <Link href="/brands" className="text-sm font-semibold text-[#fc2779] hover:text-[#e01567] transition-colors">
                View All →
              </Link>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
              {categories.slice(0, 12).map((cat) => {
                const parentSlug = Array.isArray(cat.parent) ? cat.parent[0]?.slug : cat.parent?.slug
                const pathSegment = parentSlug === 'exclusive' || parentSlug === 'essentials' ? parentSlug : 'categories'
                return (
                  <Link key={cat.id} href={`/${pathSegment}/${cat.slug}`} className="flex-shrink-0 group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-white mb-2 group-hover:shadow-md transition-all duration-300">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-300">{cat.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors text-center">{cat.name}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* RECENTLY VIEWED — horizontal scroll */}
        {recentlyViewed.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CONTINUE SHOPPING</p>
                <h2 className="text-3xl font-light tracking-tight text-slate-900">Recently Viewed</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {recentlyViewed.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex-shrink-0 w-[180px]">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOP BY CATEGORY — 3-column grid for tablet */}
        {parentCategories.filter((cat) => cat.slug !== "essentials" && cat.slug !== "exclusive").length > 0 && (
          <div className="mb-16">
            <p className="text-4xl font-light text-slate-900 tracking-tight leading-none mb-8">Let's find what's right for you</p>
            <div className="grid grid-cols-3 gap-4">
              {parentCategories.filter((cat) => cat.slug !== "essentials" && cat.slug !== "exclusive").slice(0, 9).map((cat) => {
                const thumbs = shelfProducts[cat.id] || []
                const zigzag = `polygon(
                  0% 0%, 100% 0%,
                  100% 68%, 94% 69%, 88% 66%, 82% 70%,
                  76% 65%, 70% 69%, 64% 64%, 58% 68%,
                  52% 63%, 46% 67%, 40% 62%, 34% 66%,
                  28% 61%, 22% 65%, 16% 60%, 10% 64%,
                  4% 59%, 0% 62%
                )`
                return (
                  <Link
                    key={cat.id}
                    href={cat.slug === "fun-size" ? "/fun-size" : `/category/${cat.slug}`}
                    className="relative rounded-2xl overflow-hidden bg-rose-500 aspect-[4/5] group hover:shadow-xl transition-all duration-200"
                  >
                    {/* Torn image section */}
                    <div className="absolute inset-0" style={{ clipPath: zigzag }}>
                      {thumbs[0] || cat.image_url ? (
                        <img 
                          src={thumbs[0] || cat.image_url || ""} 
                          alt={cat.name || "Category"} 
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <span className="text-3xl font-bold text-slate-400">{cat.name[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Torn edge shadow */}
                    <div className="absolute inset-0" style={{ clipPath: zigzag }}>
                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Color block content */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-6">
                      <p className="text-white text-sm font-black tracking-tight leading-tight">{cat.name}</p>
                      <p className="text-[8px] text-white/50 font-semibold uppercase tracking-[0.15em] mt-0.5">Explore</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* FUN SIZE MINIS SECTION */}
        {funSizeProducts.length > 0 && (
          <div className="mb-16">
            <FunSizeSection products={funSizeProducts.slice(0, 8)} />
          </div>
        )}

        {/* NEW ARRIVALS — 4 products in grid for tablet */}
        {products.length > 0 && (
          <div className="mb-16">
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NEW THIS WEEK</p>
              <h2 className="text-3xl font-light tracking-tight text-slate-900">Just Landed</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {products.slice(0, 4).map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEATURED PRODUCT + 3 SMALL PRODUCTS — optimized for tablet width */}
        {featuredProduct && products.length > 4 && (
          <div className="mb-16">
            <div className="grid grid-cols-4 gap-4">
              {/* Large featured product — spans 2 cols for tablet */}
              <Link href={`/products/${featuredProduct.id}`} className="col-span-2 group relative rounded-2xl overflow-hidden bg-slate-100 aspect-[3/4]">
                {featuredProduct.thumbnail_url || featuredProduct.product_variants?.[0]?.image_url ? (
                  <img 
                    src={featuredProduct.thumbnail_url || featuredProduct.product_variants?.[0]?.image_url || ""} 
                    alt={featuredProduct.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-5xl font-black text-slate-300">{featuredProduct.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2">
                    <TrendingUp className="w-2.5 h-2.5 inline mr-1" />
                    Trending
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{featuredProduct.name}</h3>
                  <p className="text-white/70 text-[10px] mb-1">{featuredProduct.brand}</p>
                  <div className="inline-flex items-center gap-2 text-white">
                    <span className="text-sm font-bold">
                      ₹{Number(featuredProduct.product_variants?.[0]?.price || featuredProduct.base_price || 0).toLocaleString("en-IN")}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* 2 small products — spans 2 cols for tablet */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {products.slice(4, 6).map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KIKO MILANO HORIZONTAL SCROLL CAROUSEL */}
        {forever52Products.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">FEATURED BRAND</p>
                <h2 className="text-3xl font-light tracking-tight text-slate-900">KIKO MILANO</h2>
              </div>
              <Link href="/search?q=kiko-milano" className="text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors">
                Shop All →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {forever52Products.slice(0, 8).map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[180px]">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Download App Banner — tablet optimized */}
      <div className="max-w-[1000px] mx-auto px-8 pb-16">
        <div className="bg-[#FFF8F0] rounded-2xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#fc2779]/5 pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-[#fc2779]/5 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-8 flex-wrap">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-md ring-1 ring-slate-100 shrink-0">
                <img src="/app-icon.svg" alt="THE MAKEUP STORE app" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-light text-[#fc2779] uppercase tracking-wider mb-1">GET THE APP</p>
                <h2 className="text-3xl font-light tracking-tight text-slate-900 mb-2">THE MAKEUP STORE</h2>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[1,2,3,4].map(i => (
                      <svg key={i} className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-800">4.8</span>
                  <span className="text-sm text-slate-400">(120+ reviews)</span>
                </div>
                <p className="text-sm text-slate-500 max-w-xs">Shop authentic makeup & beauty products on the go.</p>
                <a
                  href="https://play.google.com/store/apps/details?id=com.themakeupstorewangkhei.twa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#fc2779] text-white px-6 py-3 rounded-full text-sm font-black uppercase tracking-wider hover:bg-[#e01567] transition-all shadow-lg hover:shadow-xl mt-4"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.67l2.96 2.96c.5.5.5 1.3 0 1.8l-2.96 2.96-3.54-3.54 3.54-3.54zM5.12 3.62l9.54 9.54-3.54 3.54L3 8.58l2.12-2.12c.48-.48 1.26-.48 1.74 0l.26.26z"/>
                  </svg>
                  GET IT ON GOOGLE PLAY
                </a>
              </div>
            </div>

            {/* App screenshots — hidden on tablet, only show on desktop */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="w-40 rounded-xl overflow-hidden shadow-lg border border-white/60 rotate-[-3deg] hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/dUduLnu0oAOEczx7g_NLasJ1UVt4XCnliixkXV3kEPZLlWuCAE5jZW8YBlT2ZlvNd_Tl-tHBBNv1hmlcMSTN-CM=w1052-h592-rw" alt="App screenshot 1" className="w-full h-full object-cover" />
              </div>
              <div className="w-40 rounded-xl overflow-hidden shadow-lg border border-white/60 rotate-[2deg] mt-6 hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/zSDjHhn7ehIOhfurwYupa8n9QplLtAZphaYIUWiXsAkqlWv1TgLqlAcsoj222s5HN46nIXMfCVJgDnz_pxcH8A=w1052-h592-rw" alt="App screenshot 2" className="w-full h-full object-cover" />
              </div>
              <div className="w-40 rounded-xl overflow-hidden shadow-lg border border-white/60 rotate-[-2deg] -mt-6 hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/Lvi1yQXDNiW5PfcKXNd3VCaBiXN-J40OIl601C3_c_k7fZ_rckau1CmRBLHopnyzH1xe-fEbkdAwSHKr8D1eKQ=w1052-h592-rw" alt="App screenshot 3" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}