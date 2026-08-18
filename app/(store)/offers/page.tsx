"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ProductCard } from '@/components/store/product-card'

const EDITS = [
  { id: 'lips', title: 'The Lip Edit', subtitle: 'Stains, glosses, and lipsticks that define the season', gradient: 'from-rose-900 via-rose-800 to-pink-900', accent: '#f43f5e', explore: '/search?q=lip' },
  { id: 'face', title: 'The Face Edit', subtitle: 'Complexion-perfecting bases, blushes, and bronzers', gradient: 'from-amber-800 via-amber-700 to-orange-900', accent: '#d97706', explore: '/search?q=face' },
  { id: 'skin', title: 'The Skin Edit', subtitle: 'Serums, moisturisers, and treatments for the ritual', gradient: 'from-emerald-900 via-emerald-800 to-teal-900', accent: '#059669', explore: '/search?q=skincare' },
  { id: 'eyes', title: 'The Eye Edit', subtitle: 'Shadow, liner, and brow definers', gradient: 'from-indigo-900 via-indigo-800 to-violet-900', accent: '#6366f1', explore: '/search?q=eye' },
  { id: 'tools', title: 'The Tool Edit', subtitle: 'Brushes, sponges, and essentials for the application', gradient: 'from-stone-800 via-stone-700 to-zinc-900', accent: '#78716c', explore: '/search?q=tools+brushes' },
]

const CATEGORY_MAP: Record<string, string[]> = {
  lips: ['Lipstick', 'Lip Gloss', 'Lip Liner', 'Liquid Lipstick', 'Lip Balm', 'Lip Tint'],
  face: ['Foundation', 'Concealer', 'Face Primer', 'Blush', 'Bronzer & Contour', 'Highlighter & Illuminator', 'Compact', 'Loose Powder'],
  skin: ['Skincare', 'Cleansers & Toners', 'Moisturisers', 'Serum', 'Sunscreen', 'Sheet Mask'],
  eyes: ['Eye shadow', 'Eyeliner', 'Mascara', 'Eye Brow Enhancers', 'False Eyelashes', 'Kajal'],
  tools: ['Tools & Brushes', 'Makeup Brushes', 'Sponges & Applicators', 'Makeup Remover'],
}

export default function MidYearSalePage() {
  const [sections, setSections] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: cats } = await supabase
          .from('categories')
          .select('id, name, slug')

        if (!cats) { setLoading(false); return }

        const sectionProducts: Record<string, any[]> = {}

        for (const [key, names] of Object.entries(CATEGORY_MAP)) {
          const matched = cats.filter((c: any) =>
            names.some((n: any) => c.name.toLowerCase() === n.toLowerCase())
          )
          if (matched.length === 0) continue

          const { data: pc } = await supabase
            .from('product_categories')
            .select('products(id, name, slug, base_price, thumbnail_url, brand, tag, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url))')
            .in('category_id', matched.map((c: any) => c.id))
            .limit(40)

          const seen = new Set<string>()
          const prods: any[] = []
          for (const row of (pc || []) as any[]) {
            const p = row.products
            if (p && p.id && !seen.has(p.id)) {
              seen.add(p.id)
              prods.push(p)
            }
          }

          if (prods.length > 0) sectionProducts[key] = prods.slice(0, 4)
        }

        setSections(sectionProducts)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#fc2779] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] antialiased">

      {/* COVER — Full-screen hero */}
      <section className="relative min-h-[70vh] md:h-screen flex items-center justify-center bg-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fc2779]/5 via-black to-black" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#fc2779]/5 rounded-full blur-[120px]" />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto space-y-8">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">July 1 – July 31</p>
            <div className="w-12 h-px bg-[#fc2779] mx-auto my-6" />
          </div>
          <h1 className="text-5xl md:text-[12rem] font-black text-white tracking-tight leading-[0.85] uppercase">
            Mid<span className="md:hidden"> </span>Year
            <span className="block text-[#fc2779] text-3xl md:text-7xl font-bold tracking-[0.15em] md:tracking-[0.3em] mt-2">Sale</span>
          </h1>
          <p className="text-white/30 text-sm md:text-base max-w-md mx-auto font-light tracking-wide leading-relaxed">
            A curated edit of the season&apos;s most compelling beauty — across lips, face, skin, eyes, and tools.
          </p>
          <div className="h-10 w-px bg-white/10 mx-auto animate-pulse" />
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <ArrowRight className="w-5 h-5 text-white/20 rotate-90 animate-bounce" />
        </div>
      </section>

      {/* LOOKBOOK SECTIONS */}
      {EDITS.filter(e => sections[e.id]?.length).map((edit, idx) => (
        <section key={edit.id} className="relative">
          {/* Editorial Image Block */}
          <div className={`relative h-[40vh] md:h-[70vh] bg-gradient-to-br ${edit.gradient} flex items-end`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 px-6 md:px-16 pb-12 md:pb-20 max-w-4xl">
              <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.5em] mb-4">
                0{idx + 1}
              </p>
              <div className="w-16 h-px bg-white/30 mb-6" />
              <h2 className="text-4xl md:text-7xl font-black text-white tracking-tight leading-[0.95]">
                {edit.title}
              </h2>
              <p className="text-white/40 text-sm md:text-base mt-3 max-w-lg font-light tracking-wide">
                {edit.subtitle}
              </p>
            </div>
            {/* Decorative accent */}
            <div
              className="absolute bottom-0 right-0 w-1/3 h-1/2 opacity-10"
              style={{
                background: `radial-gradient(ellipse at center, ${edit.accent} 0%, transparent 70%)`,
              }}
            />
          </div>

          {/* Product Row */}
          <div className="max-w-7xl mx-auto px-4 md:px-10 -mt-20 md:-mt-28 relative z-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {sections[edit.id]?.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="flex justify-center mt-5">
              <Link
                href={edit.explore}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#fc2779] bg-white hover:bg-[#fc2779] hover:text-white px-5 py-2.5 rounded-full transition-all border border-slate-200 shadow-sm"
              >
                Explore More <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Spacer */}
          <div className="h-20 md:h-32" />
        </section>
      ))}

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20 md:pb-32">
        <div className="relative rounded-3xl bg-[#1A1A1A] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#fc2779]/5 rounded-full -mr-48 -mt-48 blur-[100px]" />
          <div className="relative z-10 px-8 py-16 md:py-24 text-center">
            <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              The full collection
            </h3>
            <p className="text-sm text-white/30 mt-3 max-w-md mx-auto font-light">
              Discover every product from our Mid Year Sale.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#fc2779] text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#e0226b] transition-all mt-6 shadow-lg shadow-[#fc2779]/20"
            >
              Browse Everything <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
