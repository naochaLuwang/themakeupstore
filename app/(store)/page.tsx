import Link from "next/link";

export default function GatewayPage() {
  return (
    <div className="relative flex h-screen w-full flex-col font-display antialiased overflow-hidden bg-background-light dark:bg-background-dark">



      {/* MAIN SPLIT PANELS */}
      <main className="flex-1 flex flex-col md:flex-row w-full h-full">


        <Panel
          href="/exclusive"
          label="Premium Curation"
          title="Exclusive Edit"
          bgImage="/hero-sub.png" // Replace with your image
        />
        <Panel
          href="/essentials"
          label="Daily Rituals"
          title="Everyday Essentials"
          bgImage="/hero-essential.png" // Replace with your image
        />

        <Panel
          href="/wholesale"
          label="Professional Kits"
          title="Artist Wholesale"
          bgImage="/hero-wholesale.png" // Replace with your image
        />
      </main>


    </div>
  );
}

// Sub-component for the interactive panels
function Panel({ href, label, title, bgImage }: { href: string; label: string; title: string; bgImage: string }) {
  return (
    <Link href={href} className="group relative flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-r-0">
      {/* Background Image with Scale Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%), url('${bgImage}')`
        }}
      />

      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6 text-center z-10">
        <span className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
          {label}
        </span>
        <h2 className="text-white text-4xl md:text-5xl font-serif italic mb-8">
          {title}
        </h2>
        <div className="h-14 px-10 border border-white text-white flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] bg-transparent group-hover:bg-white group-hover:text-charcoal transition-all duration-300">
          Shop Now
        </div>
      </div>
    </Link>
  );
}