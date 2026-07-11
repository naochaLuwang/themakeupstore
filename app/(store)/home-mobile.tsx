"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

import {
  Search, Heart, ShoppingBag, Rocket, ShieldCheck,
  RotateCcw, MessageCircle, ArrowRight, X,
} from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { KylieBanner } from "@/components/store/kylie-banner"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

const VALUES = [
  { icon: Rocket, label: "Free Shipping", sub: "Above ₹2,999" },
  { icon: ShieldCheck, label: "100% Authentic", sub: "Guaranteed" },
  { icon: RotateCcw, label: "Easy Returns", sub: "Within 3 days" },
  { icon: MessageCircle, label: "24/7 Support", sub: "We're here" },
]

interface CategoryItem {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent?: { slug: string } | { slug: string }[] | null
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
  product_variants: ProductVariant[]
}

interface ConcernItem {
  id: string
  name: string
  slug: string
  image_url: string | null
}

interface BannerItem {
  id: string
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  route: string | null
}

interface ShowcaseItem {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  link_url: string | null
}

interface Props {
  banner: BannerItem | null
  categories: CategoryItem[]
  products: ProductItem[]
  forever52Products: ProductItem[]
  parentCategories: CategoryItem[]
  shelfProducts: Record<string, string[]>
  showcaseItems: ShowcaseItem[]
}

export function HomeMobile({ banner, categories, products, forever52Products, parentCategories, shelfProducts, showcaseItems }: Props) {
  const [mounted, setMounted] = useState(false)
  const [showDiorPopup, setShowDiorPopup] = useState(false)
  const [showAppBanner, setShowAppBanner] = useState(false)
  const recentlyViewed = useRecentlyViewed(s => s.items)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const seen = sessionStorage.getItem("dior-launch-seen")
    if (!seen) setShowDiorPopup(true)
  }, [])

  useEffect(() => {
    const hidden = localStorage.getItem("app-banner-hidden")
    if (!hidden) setShowAppBanner(true)
  }, [])

  const dismissAppBanner = () => {
    localStorage.setItem("app-banner-hidden", "1")
    setShowAppBanner(false)
  }

  const dismissDiorPopup = () => {
    sessionStorage.setItem("dior-launch-seen", "1")
    setShowDiorPopup(false)
  }

  if (!mounted) return null

  const hero = banner
  const heroImage = hero?.image_url || "/hero-sub.webp"

  return (
    <div className="bg-white">
      {/* HERO — pulled up behind the sticky navbar */}
      <div className="-mt-40 animate-fade-in-up">
        <div className="relative w-full h-[540px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${heroImage}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/55" />
          <div className="absolute bottom-14 left-6 right-6">
            {hero && (
              <span className="inline-block bg-[#fc2779] text-white text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full mb-3">
                NEW COLLECTION
              </span>
            )}
            {hero?.subtitle && (
              <p className="text-[11px] font-bold text-white/75 uppercase tracking-[0.4em] mb-1">
                {hero.subtitle}
              </p>
            )}
            <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-2">
              {hero?.title || "THE MAKEUP STORE"}
            </h2>
            {hero?.description && (
              <p className="text-sm text-white/80 leading-relaxed mb-5">
                {hero.description}
              </p>
            )}
            <Link
              href={hero?.route || "/exclusive"}
              className="inline-flex items-center gap-2 bg-white text-[#fc2779] text-[13px] font-black uppercase tracking-wider px-6 py-3 rounded-full"
            >
              Shop Now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* MONSOON MARQUEE */}
      <div className="overflow-hidden" style={{ background: 'linear-gradient(90deg, #166534, #c084fc)' }}>
        <div className="animate-marquee whitespace-nowrap py-2.5 text-white text-xs font-bold uppercase tracking-[0.15em]">
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
          <span className="mx-6">FREE SHIPPING ABOVE ₹2999 — IMPHAL EAST & WEST DISTRICT</span>
        </div>
      </div>

      {/* VALUE PROPS */}
      <div className="flex py-4 px-2 mb-4">
        {VALUES.map((v) => (
          <div key={v.label} className="flex-1 flex flex-col items-center gap-0.5">
            <v.icon className="w-[18px] h-[18px] text-[#fc2779]" />
            <span className="text-[10px] font-bold text-slate-800 tracking-tight mt-1">{v.label}</span>
            <span className="text-[8px] text-slate-400">{v.sub}</span>
          </div>
        ))}
      </div>

      {/* OUR BRANDS */}
      {categories.length > 0 && (
        <Section label="FEATURED" title="Our Brands" href="/brands" linkLabel="View All">
          <div className="flex gap-4 overflow-x-auto pl-6 pr-4 no-scrollbar">
            {categories.slice(0, 14).map((cat) => {
              const parentSlug = Array.isArray(cat.parent) ? cat.parent[0]?.slug : cat.parent?.slug
              const pathSegment = parentSlug === 'exclusive' || parentSlug === 'essentials' ? parentSlug : 'categories'
              return (
                <Link key={cat.id} href={`/${pathSegment}/${cat.slug}`} className="flex flex-col items-center gap-2 w-[76px] shrink-0 group">
                  <div className="w-[76px] h-[76px] rounded-full overflow-hidden shadow-sm ring-1 ring-slate-100 group-hover:shadow-md group-hover:ring-slate-200 transition-all duration-300">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                        <span className="text-base font-bold text-slate-300">{cat.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 group-hover:text-rose-500 transition-colors text-center leading-tight">{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      {/* RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && (
        <Section label="CONTINUE SHOPPING" title="Recently Viewed">
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {recentlyViewed.slice(0, 10).map((item) => (
              <div key={item.id} className="w-40 shrink-0">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SHOP BY CATEGORY — 3-column grid */}
      {parentCategories.filter((cat) => cat.slug !== "essentials" && cat.slug !== "exclusive").length > 0 && (
        <div className="px-4 mb-10">
          <p className="text-[26px] font-light text-slate-900 tracking-tight leading-none mb-4">Let's find whats right for you</p>
          <div className="grid grid-cols-3 gap-3">
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
                  className="relative rounded-2xl overflow-hidden bg-rose-500 aspect-[4/5] group active:scale-[0.97] transition-all duration-200 shadow-sm"
                >
                  {/* Torn image section */}
                  <div className="absolute inset-0" style={{ clipPath: zigzag }}>
                    {thumbs[0] || cat.image_url ? (
                      <img src={thumbs[0] || cat.image_url || ""} alt={cat.name || "Category"} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-400">{cat.name[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Torn edge shadow */}
                  <div className="absolute inset-0" style={{ clipPath: zigzag }}>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  {/* Color block content */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6">
                    <p className="text-white text-[11px] font-black tracking-tight leading-tight">{cat.name}</p>
                    <p className="text-[7px] text-white/50 font-semibold uppercase tracking-[0.15em] mt-0.5">Explore</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* NEW ARRIVALS */}
      {products.length > 0 && (
        <Section label="NEW THIS WEEK" title="Just Landed" href="/new-arrivals" linkLabel="View All">
          <div className="grid grid-cols-2">
            {products.map((product, idx) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.03}s`, animationFillMode: "backwards" }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* STEAL THE SHOW */}
      {showcaseItems.length > 0 && (
        <div className="mx-3 mb-10 rounded-2xl bg-white shadow-[0_-4px_20px_-3px_rgba(0,0,0,0.08)]">
          <div className="pt-6 pb-3 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">STEAL THE SHOW</p>
            <h3 className="text-[26px] font-light text-slate-900 tracking-tight leading-none mt-0.5">Editor's Pick</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-6">
            {showcaseItems.map((item) => {
              return item.link_url ? (
                <Link key={item.id} href={item.link_url} className="group">
                  <div className="rounded-2xl overflow-hidden bg-slate-50 aspect-[4/5]">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                </Link>
              ) : (
                <div key={item.id} className="group">
                  <div className="rounded-2xl overflow-hidden bg-slate-50 aspect-[4/5]">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FOREVER52 PRODUCTS */}
      {forever52Products.length > 0 && (
        <Section label="FEATURED BRAND" title="FOREVER52">
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {forever52Products.map((item) => (
              <div key={item.id} className="w-40 shrink-0">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FOOTER */}
      <div className="pt-6 pb-20 px-4 flex flex-col items-center">
        <Link
          href="/shop"
          className="flex items-center justify-center gap-2 bg-[#fc2779] text-white text-[13px] font-black uppercase tracking-wider px-24 py-3.5 rounded-md mb-6"
        >
          SHOP ALL <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="w-10 h-px bg-[#fc2779] mb-4" />
        <div className="flex justify-evenly w-full">
          {VALUES.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-0">
              <div className="w-[72px] h-[72px] rounded-full bg-[#fc2779]/10 flex items-center justify-center mb-2">
                <v.icon className="w-9 h-9 text-[#fc2779]" />
              </div>
              <span className="text-[10px] font-bold text-slate-800">{v.label.split(" ")[0]}</span>
              <span className="text-[10px] font-medium text-slate-800">{v.label.split(" ").slice(1).join(" ")}</span>
              <span className="text-[9px] text-slate-400">{v.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Download App Banner */}
      {showAppBanner && (
        <div className="fixed bottom-14 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-900 shrink-0 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black tracking-tight text-gray-900 truncate">THE MAKEUP STORE</p>
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1,2,3,4].map(i => (
                  <svg key={i} className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <span className="text-[10px] font-bold text-gray-500">4.8</span>
            </div>
          </div>
          <a
            href="https://play.google.com/store/apps/details?id=com.themakeupstorewangkhei.twa"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 h-9 px-5 bg-gray-900 text-white rounded-lg text-[11px] font-black flex items-center tracking-wider hover:bg-gray-800 transition-colors"
          >
            GET
          </a>
          <button onClick={dismissAppBanner} className="shrink-0 w-8 h-8 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Dior Launch Popup */}
      {showDiorPopup && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={dismissDiorPopup} />
          <div className="relative w-full h-[50vh] animate-slide-up mb-[4.5rem] px-4">
            <img src="/dior.webp" alt="Dior" className="w-full h-full object-cover rounded-t-3xl" />
            <button onClick={dismissDiorPopup} className="absolute top-4 right-8 z-10 rounded-full h-8 w-8 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, title, href, linkLabel, children }: {
  label: string; title: string; href?: string; linkLabel?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <div className="flex items-end justify-between px-4 mb-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{label}</p>
          <h3 className="text-[26px] font-light text-slate-900 tracking-tight leading-none mt-0.5">{title}</h3>
        </div>
        {href && linkLabel && (
          <Link href={href} className="text-[13px] font-bold text-[#fc2779] shrink-0">{linkLabel}</Link>
        )}
      </div>
      {children}
    </div>
  )
}
