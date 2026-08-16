import Link from "next/link"
import { ProductCard } from "@/components/store/product-card"
import { FunSizeSection } from "@/components/store/fun-size-section"
import { ArrowRight, TrendingUp, Truck, ShieldCheck, Package, Headphones } from "lucide-react"

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
}

export function HomeDesktop({ banner, categories, products, forever52Products, parentCategories, shelfProducts }: Props) {
  const hero = banner
  const heroImage = "/web-home.webp"
  const featuredProduct = products[0]

  return (
    <div className="bg-white min-h-screen">
      {/* HERO BANNER — wide format from web-home.webp */}
      <div className="relative w-full aspect-[2.4/1] -mt-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center pl-20 max-w-[1600px] mx-auto">
          <span className="inline-block bg-[#fc2779] text-white text-xs font-black uppercase tracking-[0.25em] px-4 py-2 rounded-full mb-5 self-start">
            NEW COLLECTION
          </span>
          <h1 className="text-7xl font-black text-white uppercase tracking-tight leading-[0.95]">
            THE MAKEUP
            <br />
            <span className="text-[#fc2779]">STORE</span>
          </h1>
          <p className="text-white/80 text-base font-medium mt-4 max-w-md leading-relaxed">
            Luxury Makeup, Skin Care from the worlds most coveted brand
          </p>
          <Link
            href={hero?.route || "/exclusive"}
            className="inline-flex items-center gap-2 bg-[#fc2779] text-white text-sm font-black uppercase tracking-wider px-10 py-4 rounded-full hover:bg-[#e01567] transition-all shadow-2xl mt-6 self-start"
          >
            Shop Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* SHIPPING BANNER */}
      <div className="bg-gradient-to-r from-[#fc2779]/5 via-[#fc2779]/10 to-[#fc2779]/5 py-4">
        <div className="flex items-center justify-center gap-3">
          <Truck className="w-5 h-5 text-[#fc2779]" />
          <p className="text-[#fc2779] font-bold text-sm tracking-wide">
            FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST
          </p>
        </div>
      </div>

      {/* VALUE PROPS */}
      <div className="flex gap-12 py-8 mb-16 max-w-[1600px] mx-auto px-16">
        {VALUES.map((v) => (
          <div key={v.label} className="flex-1 flex flex-col items-center gap-1">
            <v.icon className="w-7 h-7 text-[#fc2779]" />
            <span className="text-sm font-bold text-slate-800 tracking-tight mt-2">{v.label}</span>
            <span className="text-xs text-slate-400">{v.sub}</span>
          </div>
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto px-16">
        {/* CATEGORY HORIZONTAL SCROLL */}
        {categories.length > 0 && (
          <div className="mb-20 bg-[#FFF8F0] rounded-3xl p-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-light text-[#fc2779] uppercase tracking-wider mb-1">FEATURED</p>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900">Our Brands</h2>
              </div>
              <Link href="/brands" className="text-sm font-semibold text-[#fc2779] hover:text-[#e01567] transition-colors">
                View All →
              </Link>
            </div>
            <div className="flex gap-8 overflow-x-auto pb-4 no-scrollbar">
              {categories.slice(0, 14).map((cat) => {
                const parentSlug = Array.isArray(cat.parent) ? cat.parent[0]?.slug : cat.parent?.slug
                const pathSegment = parentSlug === 'exclusive' || parentSlug === 'essentials' ? parentSlug : 'categories'
                return (
                  <Link key={cat.id} href={`/${pathSegment}/${cat.slug}`} className="flex-shrink-0 group">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-white mb-3 group-hover:shadow-lg transition-all duration-300">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-slate-300">{cat.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors text-center">{cat.name}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* SHOP BY CATEGORY — torn-edge cards inspired by mobile */}
        {parentCategories.filter((cat) => cat.slug !== "essentials" && cat.slug !== "exclusive").length > 0 && (
          <div className="mb-20">
            <p className="text-5xl font-light text-slate-900 tracking-tight leading-none mb-10">Let's find what's right for you</p>
            <div className="grid grid-cols-6 gap-4">
              {parentCategories.filter((cat) => cat.slug !== "essentials" && cat.slug !== "exclusive").map((cat) => {
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
                    href={`/category/${cat.slug}`}
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
                          <span className="text-4xl font-bold text-slate-400">{cat.name[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Torn edge shadow */}
                    <div className="absolute inset-0" style={{ clipPath: zigzag }}>
                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Color block content */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8">
                      <p className="text-white text-base font-black tracking-tight leading-tight">{cat.name}</p>
                      <p className="text-[9px] text-white/50 font-semibold uppercase tracking-[0.15em] mt-1">Explore</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* FUN SIZE MINIS SECTION */}
        <div className="mb-20">
          <FunSizeSection />
        </div>

        {/* NEW ARRIVALS — 5 products in grid */}
        {products.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NEW THIS WEEK</p>
                <h2 className="text-4xl font-light tracking-tight text-slate-900">Just Landed</h2>
              </div>
              <Link href="/new-arrivals" className="text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-6">
              {products.slice(0, 5).map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEATURED PRODUCT + 4 SMALL PRODUCTS */}
        {featuredProduct && products.length > 5 && (
          <div className="mb-20">
            <div className="grid grid-cols-5 gap-5">
              {/* Large featured product — spans 3 cols */}
              <Link href={`/products/${featuredProduct.id}`} className="col-span-3 group relative rounded-2xl overflow-hidden bg-slate-100 aspect-[3/4]">
                {featuredProduct.thumbnail_url || featuredProduct.product_variants?.[0]?.image_url ? (
                  <img 
                    src={featuredProduct.thumbnail_url || featuredProduct.product_variants?.[0]?.image_url || ""} 
                    alt={featuredProduct.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-6xl font-black text-slate-300">{featuredProduct.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
                    <TrendingUp className="w-2.5 h-2.5 inline mr-1" />
                    Trending
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{featuredProduct.name}</h3>
                  <p className="text-white/70 text-xs mb-2">{featuredProduct.brand}</p>
                  <div className="inline-flex items-center gap-2 text-white">
                    <span className="text-base font-bold">
                      ₹{Number(featuredProduct.product_variants?.[0]?.price || featuredProduct.base_price || 0).toLocaleString("en-IN")}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* 2x2 grid of small products — spans 2 cols */}
              <div className="col-span-2 grid grid-cols-2 gap-5">
                {products.slice(5, 9).map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOREVER52 HORIZONTAL SCROLL CAROUSEL */}
        {forever52Products.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">FEATURED BRAND</p>
                <h2 className="text-4xl font-light tracking-tight text-slate-900">FOREVER52</h2>
              </div>
              <Link href="/search?q=FOREVER52" className="text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors">
                Shop All →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {forever52Products.slice(0, 10).map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[240px]">
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Download App Banner */}
      <div className="max-w-[1600px] mx-auto px-16 pb-20">
        <div className="bg-[#FFF8F0] rounded-3xl p-12 shadow-sm relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#fc2779]/5 pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-[#fc2779]/5 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-12">
            <div className="flex items-center gap-10">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-white shadow-md ring-1 ring-slate-100 shrink-0">
                <img src="/app-icon.svg" alt="THE MAKEUP STORE app" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-light text-[#fc2779] uppercase tracking-wider mb-2">GET THE APP</p>
                <h2 className="text-4xl font-light tracking-tight text-slate-900 mb-3">THE MAKEUP STORE</h2>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1,2,3,4].map(i => (
                      <svg key={i} className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-800">4.8</span>
                  <span className="text-sm text-slate-400">(120+ reviews)</span>
                </div>
                <p className="text-sm text-slate-500 max-w-md">Shop authentic makeup & beauty products on the go.</p>
                <a
                  href="https://play.google.com/store/apps/details?id=com.themakeupstorewangkhei.twa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-[#fc2779] text-white px-8 py-4 rounded-full text-sm font-black uppercase tracking-wider hover:bg-[#e01567] transition-all shadow-lg hover:shadow-xl mt-6"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.67l2.96 2.96c.5.5.5 1.3 0 1.8l-2.96 2.96-3.54-3.54 3.54-3.54zM5.12 3.62l9.54 9.54-3.54 3.54L3 8.58l2.12-2.12c.48-.48 1.26-.48 1.74 0l.26.26z"/>
                  </svg>
                  GET IT ON GOOGLE PLAY
                </a>
              </div>
            </div>

            {/* Real app screenshots */}
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              <div className="w-52 rounded-2xl overflow-hidden shadow-lg border border-white/60 rotate-[-3deg] hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/dUduLnu0oAOEczx7g_NLasJ1UVt4XCnliixkXV3kEPZLlWuCAE5jZW8YBlT2ZlvNd_Tl-tHBBNv1hmlcMSTN-CM=w1052-h592-rw" alt="App screenshot 1" className="w-full h-full object-cover" />
              </div>
              <div className="w-52 rounded-2xl overflow-hidden shadow-lg border border-white/60 rotate-[2deg] mt-10 hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/zSDjHhn7ehIOhfurwYupa8n9QplLtAZphaYIUWiXsAkqlWv1TgLqlAcsoj222s5HN46nIXMfCVJgDnz_pxcH8A=w1052-h592-rw" alt="App screenshot 2" className="w-full h-full object-cover" />
              </div>
              <div className="w-52 rounded-2xl overflow-hidden shadow-lg border border-white/60 rotate-[-2deg] -mt-10 hover:rotate-0 transition-transform duration-300">
                <img src="https://play-lh.googleusercontent.com/Lvi1yQXDNiW5PfcKXNd3VCaBiXN-J40OIl601C3_c_k7fZ_rckau1CmRBLHopnyzH1xe-fEbkdAwSHKr8D1eKQ=w1052-h592-rw" alt="App screenshot 3" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
