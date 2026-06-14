"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Search, Heart, ShoppingBag, Rocket, ShieldCheck,
  RotateCcw, MessageCircle, ArrowRight, ChevronRight,
  Sparkles
} from "lucide-react"
import { ProductCard } from "@/components/store/product-card"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

const VALUES = [
  { icon: Rocket, label: "Free Shipping", sub: "Above ₹2,999" },
  { icon: ShieldCheck, label: "100% Authentic", sub: "Guaranteed" },
  { icon: RotateCcw, label: "Easy Returns", sub: "Within 7 days" },
  { icon: MessageCircle, label: "24/7 Support", sub: "We're here" },
]

interface Props {
  banner: any
  categories: any[]
  products: any[]
  forever52Products: any[]
}

export function HomeMobile({ banner, categories, products, forever52Products }: Props) {
  const [mounted, setMounted] = useState(false)
  const recentlyViewed = useRecentlyViewed(s => s.items)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const hero = banner
  const heroImage = hero?.image_url || "/hero-sub.png"

  return (
    <div className="bg-white">
      {/* HERO — pulled up behind the sticky navbar */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="-mt-40"
      >
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
      </motion.div>

      {/* VALUE PROPS */}
      <div className="flex py-4 px-2 mb-7">
        {VALUES.map((v) => (
          <div key={v.label} className="flex-1 flex flex-col items-center gap-0.5">
            <v.icon className="w-[18px] h-[18px] text-[#fc2779]" />
            <span className="text-[10px] font-bold text-slate-800 tracking-tight mt-1">{v.label}</span>
            <span className="text-[8px] text-slate-400">{v.sub}</span>
          </div>
        ))}
      </div>

      {/* FEATURED BRANDS — single row, /brands style */}
      {categories.length > 0 && (
        <Section label="FEATURED" title="Our Brands" href="/brands" linkLabel="View All">
          <div className="flex gap-5 overflow-x-auto px-4 no-scrollbar">
            {categories.slice(0, 14).map((cat: any) => {
              const parentSlug = cat.parent?.slug
              const pathSegment = parentSlug === 'exclusive' || parentSlug === 'essentials' ? parentSlug : 'categories'
              return (
                <Link key={cat.id} href={`/${pathSegment}/${cat.slug}`} className="flex flex-col items-center gap-2 w-[90px] shrink-0 group">
                  <div className="w-[90px] h-[90px] rounded-full p-0.5 bg-gradient-to-br from-[#fc2779] via-pink-300 to-orange-100 group-hover:rotate-6 transition-all duration-700">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-50 flex items-center justify-center">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <span className="text-[10px] font-black text-slate-300">{cat.name[0]}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-[#fc2779] transition-colors text-center leading-tight">{cat.name}</span>
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
            {recentlyViewed.slice(0, 10).map((item: any) => (
              <div key={item.id} className="w-40 shrink-0">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* NEW ARRIVALS */}
      <Section label="NEW THIS WEEK" title="Just Landed" href="/new-arrivals" linkLabel="View All">
        <div className="grid grid-cols-2">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: idx * 0.03 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* FOREVER52 BANNER */}
      <div className="mb-8 px-4">
        <img src="/forever.png" alt="FOREVER52" className="w-full rounded-xl" />
      </div>

      {/* FOREVER52 PRODUCTS */}
      {forever52Products.length > 0 && (
        <Section label="FEATURED BRAND" title="FOREVER52">
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {forever52Products.map((item: any) => (
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
          <h3 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mt-0.5">{title}</h3>
        </div>
        {href && linkLabel && (
          <Link href={href} className="text-[13px] font-bold text-[#fc2779] shrink-0">{linkLabel}</Link>
        )}
      </div>
      {children}
    </div>
  )
}
