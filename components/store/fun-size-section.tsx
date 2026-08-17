"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Sparkles } from "lucide-react"
import { ProductCard } from "@/components/store/product-card"

interface FunSizeSectionProps {
  products: any[]
}

export function FunSizeSection({ products }: FunSizeSectionProps) {
  return (
    <section className="w-full">
      {/* Outer Card Container */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFF0F4] border border-[#FFE0EA] p-5 sm:p-7 md:p-8 shadow-sm">

        {/* Subtle Decorative Floating Hearts in Background */}
        <div className="absolute top-4 left-1/3 text-pink-300/40 text-lg select-none pointer-events-none animate-pulse">♥</div>
        <div className="absolute top-12 left-1/2 text-pink-300/30 text-sm select-none pointer-events-none">♥</div>
        <div className="absolute bottom-20 right-1/4 text-pink-300/35 text-base select-none pointer-events-none">♥</div>

        {/* Top Banner Row: Left Info + Right Hero Lineup */}
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
              href="/fun-size"
              className="inline-flex items-center gap-1.5 bg-[#fc2779] text-white text-xs sm:text-[13px] font-black uppercase tracking-wider px-6 py-3 rounded-full hover:bg-[#e01567] active:scale-95 transition-all shadow-md shadow-pink-500/15 mt-4"
            >
              SHOP FUN SIZE <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Banner Image + Badge (hidden on mobile) */}
          <div className="relative hidden md:flex flex-1 w-full items-center justify-end min-h-[190px]">
            <div className="relative w-full max-w-[420px] aspect-[16/9] flex items-center justify-center">
              <img
                src="/minis/banner-lineup.jpg"
                alt="Fun size mini beauty products"
                className="w-full h-full object-contain drop-shadow-md rounded-2xl"
              />
            </div>
            <div className="absolute -top-2 right-1 sm:right-4 w-20 h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-[#fc2779] to-[#e01567] text-white flex flex-col items-center justify-center text-center p-1.5 shadow-lg shadow-pink-500/25 rotate-6 hover:rotate-0 transition-transform duration-300 z-20 select-none">
              <span className="text-[11px] font-black tracking-wider leading-tight">MINI</span>
              <span className="text-[9px] font-extrabold uppercase tracking-tight leading-tight">MIGHTY</span>
              <span className="text-[9px] font-extrabold uppercase tracking-tight leading-tight">CUTE!</span>
              <span className="text-xs mt-0.5 leading-none">♥</span>
            </div>
          </div>
        </div>

        {/* Product Cards */}
        <div className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {products.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>

          {/* <div className="flex justify-end mt-4">
            <Link
              href="/fun-size"
              className="text-[#fc2779] hover:text-[#e01567] text-xs sm:text-[13px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div> */}
        </div>

      </div>
    </section>
  )
}
