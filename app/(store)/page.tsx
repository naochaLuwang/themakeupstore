
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";


export default async function GatewayPage() {
  const supabase = await createClient();



  return (
    <div className="relative min-h-screen w-full flex flex-col font-display antialiased overflow-x-hidden bg-white">

      {/* 1. MAIN SPLIT PANELS (Remains for high-impact entry) */}
      <main className="flex flex-col md:flex-row w-full h-screen shrink-0">
        <Panel href="/exclusive" label="Premium Curation" title="Exclusive Selection" bgImage="/hero-sub.png" />
        <Panel href="/essentials" label="Daily Rituals" title="Everyday Essentials" bgImage="/hero-essential.png" />
        <Panel href="/skincare-accessories" label="Self Care Edit" title="Skin Care & Accessories" bgImage="/hero-skincare.png" />
      </main>

      {/* 2. REDESIGNED CURATED SELECTION: EDITORIAL GRID */}

    </div>
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

