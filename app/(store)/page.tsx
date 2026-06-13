import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { HomeMobile } from "./home-mobile";

const BRAND_BLACKLIST = [
  "Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner",
  "Liquid Lipstick", "Blush", "Contour", "Highlighter", "Loose Powder", "Compact",
  "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray",
  "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm",
  "Lip Tint", "Cleansers & Toners", "Moisturisers", "Serum", "Sunscreen",
  "False Eyelashes", "Makeup Brushes", "Makeup remover & wipes", "Sheet Mask",
  "Sponges & Applicators",
]

export default async function GatewayPage() {
  const supabase = await createClient();

  const [{ data: bannerData }, { data: catData }, { data: prodData }] = await Promise.all([
    supabase.from("hero_banners").select("*").eq("is_active", true).order("position").limit(1).maybeSingle(),
    supabase.from("categories").select("id, name, slug, image_url, parent:parent_id(slug)").not("parent_id", "is", null).order("name"),
    supabase.from("products").select("id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)").order("created_at", { ascending: false }).limit(12),
  ]);

  const products = (prodData || []).map(p => ({
    ...p,
    outOfStock: p.has_variants && p.product_variants?.length > 0
      ? p.product_variants.every((v: any) => v.stock != null && Number(v.stock) <= 0)
      : false,
  })).sort((a, b) => (a.outOfStock === b.outOfStock ? 0 : a.outOfStock ? 1 : -1));

  const categories = (catData || []).filter((b: any) =>
    !BRAND_BLACKLIST.some(name => b.name.toLowerCase() === name.toLowerCase())
  )

  return (
    <>
      {/* DESKTOP: 3 split panels (md+) */}
      <main className="hidden md:flex flex-row w-full h-screen shrink-0">
        <Panel href="/exclusive" label="Premium Curation" title="Exclusive Selection" bgImage="/hero-sub.png" />
        <Panel href="/essentials" label="Daily Rituals" title="Everyday Essentials" bgImage="/hero-essential.png" />
        <Panel href="/skincare-accessories" label="Self Care Edit" title="Skin Care & Accessories" bgImage="/hero-skincare.png" />
      </main>

      {/* MOBILE: native-style scrollable feed */}
      <div className="md:hidden">
        <HomeMobile banner={bannerData} categories={categories} products={products} />
      </div>
    </>
  );
}

function Panel({ href, label, title, bgImage }: { href: string; label: string; title: string; bgImage: string }) {
  return (
    <Link href={href} className="group relative flex-1 overflow-hidden h-1/3 md:h-full border-b md:border-b-0 md:border-r border-white/10 last:border-0">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[2s] ease-out group-hover:scale-110"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%), url('${bgImage}')` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-8 text-center z-10">
        <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.5em] mb-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
          {label}
        </span>
        <h2 className="text-white text-4xl md:text-5xl font-serif italic mb-10 tracking-tight leading-tight">
          {title}
        </h2>
        <div className="h-12 px-10 border border-white/30 text-white flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm group-hover:bg-white group-hover:text-black transition-all duration-500">
          Shop Collection
        </div>
      </div>
    </Link>
  );
}
