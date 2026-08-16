"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Check, ChevronRight, Sparkles } from "lucide-react"

interface MiniProduct {
  id: string
  brand: string
  name: string
  price: number
  originalPrice?: number
  image: string
  tag?: string
  size?: string
}

const MINI_PRODUCTS: MiniProduct[] = [
  {
    id: "mini-1",
    brand: "NARS",
    name: "Sheer Glow Foundation Mini",
    price: 499,
    originalPrice: 1200,
    image: "/minis/nars-foundation.jpg",
    size: "15ml",
  },
  {
    id: "mini-2",
    brand: "Charlotte Tilbury",
    name: "Pillow Talk Lipstick Mini",
    price: 650,
    originalPrice: 1500,
    image: "/minis/charlotte-pillowtalk.jpg",
    size: "1.5g",
  },
  {
    id: "mini-3",
    brand: "LANEIGE",
    name: "Lip Sleeping Mask Mini",
    price: 399,
    originalPrice: 600,
    image: "/minis/laneige-lip-sleeping-mask.jpg",
    size: "3g",
  },
  {
    id: "mini-4",
    brand: "MAC",
    name: "Fix+ Setting Spray Mini",
    price: 450,
    originalPrice: 1100,
    image: "/minis/mac-fix-plus.jpg",
    size: "30ml",
  },
]

export function FunSizeSection() {
  const [addedIds, setAddedIds] = React.useState<Record<string, boolean>>({})

  const handleQuickAdd = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setAddedIds((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [id]: false }))
    }, 1500)
  }

  return (
    <section className="w-full">
      {/* Outer Card Container */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFF0F4] border border-[#FFE0EA] p-5 sm:p-7 md:p-8 shadow-sm">
        
        {/* Subtle Decorative Floating Hearts in Background */}
        <div className="absolute top-4 left-1/3 text-pink-300/40 text-lg select-none pointer-events-none animate-pulse">♥</div>
        <div className="absolute top-12 left-1/2 text-pink-300/30 text-sm select-none pointer-events-none">♥</div>
        <div className="absolute bottom-20 right-1/4 text-pink-300/35 text-base select-none pointer-events-none">♥</div>

        {/* Top Banner Row: Left Info + Center/Right Hero Lineup + Circular Badge */}
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 pb-6 md:pb-8">
          
          {/* Left Text Content */}
          <div className="flex-1 max-w-md z-10 text-left w-full">
            <span className="inline-block bg-[#fc2779] text-white text-[10px] md:text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
              NEW
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-[42px] font-black text-[#2e1d24] tracking-tight leading-none mt-2.5 flex items-center gap-1.5">
              FUN SIZE <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-slate-900 fill-slate-900 inline-block" />
            </h2>

            <p className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1.5">
              Big beauty. Tiny packages.
            </p>

            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5 leading-relaxed">
              Mini makeup must-haves you&apos;ll love!
            </p>

            <Link
              href="/shop?tag=minis"
              className="inline-flex items-center gap-1.5 bg-[#fc2779] text-white text-xs sm:text-[13px] font-black uppercase tracking-wider px-6 py-3 rounded-full hover:bg-[#e01567] active:scale-95 transition-all shadow-md shadow-pink-500/15 mt-4"
            >
              SHOP FUN SIZE <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right Product Lineup Visual + Circular Cute Badge */}
          <div className="relative flex-1 w-full flex items-center justify-center md:justify-end min-h-[160px] sm:min-h-[190px]">
            
            {/* Cutout / Lineup Image */}
            <div className="relative w-full max-w-[420px] aspect-[16/9] flex items-center justify-center">
              <img
                src="/minis/banner-lineup.jpg"
                alt="Fun size mini beauty products"
                className="w-full h-full object-contain drop-shadow-md rounded-2xl"
              />
            </div>

            {/* Pink Badge: "MINI MIGHTY CUTE! ♥" */}
            <div className="absolute -top-2 right-1 sm:right-4 w-18 h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-[#fc2779] to-[#e01567] text-white flex flex-col items-center justify-center text-center p-1.5 shadow-lg shadow-pink-500/25 rotate-6 hover:rotate-0 transition-transform duration-300 z-20 select-none">
              <span className="text-[10px] sm:text-[11px] font-black tracking-wider leading-tight">MINI</span>
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-tight leading-tight">MIGHTY</span>
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-tight leading-tight">CUTE!</span>
              <span className="text-[10px] sm:text-xs mt-0.5 leading-none">♥</span>
            </div>

          </div>
        </div>

        {/* Product Cards Row / Horizontal Scroll */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {MINI_PRODUCTS.map((prod) => {
              const isAdded = addedIds[prod.id]
              return (
                <div
                  key={prod.id}
                  className="group relative bg-white rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-pink-100/60"
                >
                  {/* Card Top: "MINI" Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#FFE5ED] text-[#fc2779] text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      MINI
                    </span>
                    {prod.size && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {prod.size}
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="relative w-full aspect-square mb-3 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50/50">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Brand & Name */}
                  <div className="min-h-[46px] flex flex-col justify-start">
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      {prod.brand}
                    </p>
                    <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug line-clamp-2 mt-0.5">
                      {prod.name}
                    </h3>
                  </div>

                  {/* Bottom: Price + Quick Add Button */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
                    <div>
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ₹{prod.price.toLocaleString("en-IN")}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-[10px] text-slate-400 line-through ml-1.5 font-medium">
                          ₹{prod.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, prod.id)}
                      aria-label={`Add ${prod.name} to bag`}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
                        isAdded
                          ? "bg-emerald-500 border-emerald-500 text-white scale-110"
                          : "border-slate-200 text-slate-700 hover:border-[#fc2779] hover:bg-[#fc2779] hover:text-white active:scale-90"
                      }`}
                    >
                      {isAdded ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Right: "View All >" Link */}
          <div className="flex justify-end mt-4">
            <Link
              href="/shop?tag=minis"
              className="text-[#fc2779] hover:text-[#e01567] text-xs sm:text-[13px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
