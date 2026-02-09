// import Link from "next/link";

// export default function GatewayPage() {
//   return (
//     <div className="relative flex h-screen w-auto flex-col font-display antialiased overflow-hidden bg-background-light dark:bg-background-dark">



//       {/* MAIN SPLIT PANELS */}
//       <main className="flex-1 flex flex-col md:flex-row w-full h-full">


//         <Panel
//           href="/exclusive"
//           label="Premium Curation"
//           title="Exclusive Edit"
//           bgImage="/hero-sub.png" // Replace with your image
//         />
//         <Panel
//           href="/essentials"
//           label="Daily Rituals"
//           title="Everyday Essentials"
//           bgImage="/hero-essential.png" // Replace with your image
//         />

//         <Panel
//           href="/wholesale"
//           label="Professional Kits"
//           title="The Makeup Store Wholesale"
//           bgImage="/hero-wholesale.png" // Replace with your image
//         />
//       </main>

//       <section className="px-6 py-20 bg-white max-w-7xl mx-auto w-full">
//         <h2 className="text-3xl font-normal mb-10 tracking-tight text-zinc-900">Curated Selection</h2>

//         {/* The Grid Layout */}
//         <div className="grid grid-cols-2 gap-4">

//           {/* Top Row: Large Skincare Card (Spans 2 columns) */}
//           <Link href="/skincare" className="relative col-span-2 group overflow-hidden rounded-3xl aspect-[4/3] md:aspect-[16/9]">
//             <img src="/skincare-curated.jpg" alt="Skincare" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
//             <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
//             <div className="absolute bottom-10 left-10 text-white">
//               <h3 className="text-4xl font-bold uppercase tracking-tight">Skincare</h3>
//               <p className="text-sm font-medium opacity-90 mt-2">Purity in every drop</p>
//             </div>
//           </Link>

//           {/* Bottom Row: Makeup Card */}
//           <Link href="/makeup" className="relative group overflow-hidden rounded-3xl aspect-square">
//             <img src="/makeup-curated.jpg" alt="Makeup" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
//             <div className="absolute inset-0 bg-black/10" />
//             <div className="absolute bottom-8 left-8 text-white">
//               <h3 className="text-2xl font-bold uppercase tracking-tight">Makeup</h3>
//             </div>
//           </Link>

//           {/* Bottom Row: Tools Card */}
//           <Link href="/tools" className="relative group overflow-hidden rounded-3xl aspect-square">
//             <img src="/tools-curated.jpg" alt="Tools" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
//             <div className="absolute inset-0 bg-black/10" />
//             <div className="absolute bottom-8 left-8 text-white">
//               <h3 className="text-2xl font-bold uppercase tracking-tight">Tools</h3>
//             </div>
//           </Link>

//         </div>
//       </section>


//     </div>
//   );
// }

// // Sub-component for the interactive panels
// function Panel({ href, label, title, bgImage }: { href: string; label: string; title: string; bgImage: string }) {
//   return (
//     <Link href={href} className="group relative flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-r-0">
//       {/* Background Image with Scale Effect */}
//       <div
//         className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110"
//         style={{
//           backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%), url('${bgImage}')`
//         }}
//       />

//       {/* Text Content */}
//       <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6 text-center z-10">
//         <span className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
//           {label}
//         </span>
//         <h2 className="text-white text-4xl md:text-5xl font-serif italic mb-8">
//           {title}
//         </h2>
//         <div className="h-14 px-10 border border-white text-white flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] bg-transparent group-hover:bg-white group-hover:text-black transition-all duration-300">
//           Shop Now
//         </div>
//       </div>
//     </Link>
//   );
// }


// import Link from "next/link";

// export default function GatewayPage() {
//   return (
//     /* FIX: Changed h-screen to min-h-screen and overflow-hidden to overflow-x-hidden to allow vertical scrolling */
//     <div className="relative min-h-screen w-full flex flex-col font-display antialiased overflow-x-hidden bg-background-light dark:bg-background-dark">

//       {/* MAIN SPLIT PANELS */}
//       {/* FIX: Removed flex-1 to allow the main section to sit naturally above the curated section */}
//       <main className="flex flex-col md:flex-row w-full h-screen">
//         <Panel
//           href="/exclusive"
//           label="Premium Curation"
//           title="Exclusive Edit"
//           bgImage="/hero-sub.png"
//         />
//         <Panel
//           href="/essentials"
//           label="Daily Rituals"
//           title="Everyday Essentials"
//           bgImage="/hero-essential.png"
//         />
//         <Panel
//           href="/wholesale"
//           label="Professional Kits"
//           title="The Makeup Store Wholesale"
//           bgImage="/hero-wholesale.png"
//         />
//       </main>

//       {/* CURATED SELECTION */}
//       {/* FIX: Ensured background is explicit and padding is sufficient */}
//       <section className="px-6 py-24 bg-white dark:bg-zinc-950 w-full">
//         <div className="max-w-7xl mx-auto">
//           <h2 className="text-3xl font-normal mb-10 tracking-tight text-zinc-900 dark:text-white">
//             Curated Selection
//           </h2>

//           <div className="grid grid-cols-2 gap-4">
//             {/* Top Row: Large Skincare Card */}
//             <Link
//               href="/skincare"
//               className="relative col-span-2 group overflow-hidden rounded-3xl aspect-[4/3] md:aspect-[21/9]"
//             >
//               <img
//                 src="/skincare-curated.jpg"
//                 alt="Skincare"
//                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
//               />
//               <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
//               <div className="absolute bottom-10 left-10 text-white">
//                 <h3 className="text-4xl font-bold uppercase tracking-tight">Skincare</h3>
//                 <p className="text-sm font-medium opacity-90 mt-2">Purity in every drop</p>
//               </div>
//             </Link>

//             {/* Bottom Row: Makeup Card */}
//             <Link href="/makeup" className="relative group overflow-hidden rounded-3xl aspect-square">
//               <img src="/makeup-curated.jpg" alt="Makeup" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
//               <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
//               <div className="absolute bottom-8 left-8 text-white">
//                 <h3 className="text-2xl font-bold uppercase tracking-tight">Makeup</h3>
//               </div>
//             </Link>

//             {/* Bottom Row: Tools Card */}
//             <Link href="/tools" className="relative group overflow-hidden rounded-3xl aspect-square">
//               <img src="/tools-curated.jpg" alt="Tools" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
//               <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
//               <div className="absolute bottom-8 left-8 text-white">
//                 <h3 className="text-2xl font-bold uppercase tracking-tight">Tools</h3>
//               </div>
//             </Link>
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }

// function Panel({ href, label, title, bgImage }: { href: string; label: string; title: string; bgImage: string }) {
//   return (
//     <Link href={href} className="group relative flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-r-0 h-1/3 md:h-full">
//       <div
//         className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110"
//         style={{
//           backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%), url('${bgImage}')`
//         }}
//       />
//       <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6 text-center z-10">
//         <span className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
//           {label}
//         </span>
//         <h2 className="text-white text-4xl md:text-5xl font-serif italic mb-8">
//           {title}
//         </h2>
//         <div className="h-14 px-10 border border-white text-white flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] bg-transparent group-hover:bg-white group-hover:text-black transition-all duration-300">
//           Shop Now
//         </div>
//       </div>
//     </Link>
//   );
// }
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import JournalMedia from "@/components/JournalMedia";

export default async function GatewayPage() {
  const supabase = await createClient();

  const { data: latestPosts } = await supabase
    .from('journal_entries')
    .select('id, title, featured_media_url, category, excerpt, media_type')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(2);

  return (
    <div className="relative min-h-screen w-full flex flex-col font-display antialiased overflow-x-hidden bg-background-light dark:bg-background-dark">

      {/* 1. MAIN SPLIT PANELS */}
      <main className="flex flex-col md:flex-row w-full h-screen shrink-0">
        <Panel href="/exclusive" label="Premium Curation" title="Exclusive Edit" bgImage="/hero-sub.png" />
        <Panel href="/essentials" label="Daily Rituals" title="Everyday Essentials" bgImage="/hero-essential.png" />
        <Panel href="/wholesale" label="Professional Kits" title="The Makeup Store Wholesale" bgImage="/hero-wholesale.png" />
      </main>

      {/* 2. CURATED SELECTION */}
      <section className="px-6 py-24 bg-white dark:bg-zinc-950 w-full">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-normal mb-10 tracking-tight text-zinc-900 dark:text-white">
            Curated Selection
          </h2>
          <div className="grid grid-cols-2 gap-4 text-white">
            <CuratedCard href="/skincare" title="Skincare" subtitle="Purity in every drop" image="/skincare-curated.jpg" large />
            <CuratedCard href="/makeup" title="Makeup" image="/makeup-curated.jpg" />
            <CuratedCard href="/tools" title="Tools" image="/tools-curated.jpg" />
          </div>
        </div>
      </section>

      {/* 3. THE BEAUTY JOURNAL SECTION */}
      <section className="px-6 py-0 bg-zinc-50 dark:bg-zinc-900 w-full border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-xl mx-auto text-center mb-16 px-4">
          <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-white mb-2 font-serif italic">
            The Makeup Store Journal
          </h2>
          <p className="text-zinc-500 italic font-serif text-sm md:text-base">
            Expert rituals for your best skin yet.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-24 md:space-y-32">
          {latestPosts?.map((post) => (
            <article key={post.id} className="group cursor-pointer px-2">
              <Link href={`/journal/${post.id}`}>
                <div className="relative aspect-[4/5] md:aspect-[16/10] overflow-hidden rounded-lg md:rounded-xl mb-8 bg-zinc-200 shadow-sm">

                  {/* CLIENT COMPONENT FOR MEDIA HANDLING */}
                  <JournalMedia post={post} />

                  {/* Desktop Play Indicator Overlay */}
                  {post.media_type !== 'image' && (
                    <div className="hidden md:block absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 opacity-100 group-hover:opacity-0 transition-opacity">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                    </div>
                  )}
                </div>

                <div className="px-2 md:px-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-3 block">
                    {post.category}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-normal text-zinc-900 dark:text-white mb-4 leading-tight group-hover:underline decoration-1 underline-offset-8 transition-all">
                    {post.title}
                  </h3>
                  <p className="text-zinc-500 text-sm md:text-base leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt || "Explore our latest expert beauty ritual."}
                  </p>
                  <div className="inline-block border-b border-zinc-900 dark:border-white pb-1 text-[10px] font-black uppercase tracking-widest">
                    Read Article
                  </div>
                </div>
              </Link>
            </article>
          ))}

          <div className="text-center pt-10">
            <Link href="/journal" className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-10 py-4 border border-zinc-200 dark:border-zinc-800 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm">
              View All Stories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// HELPER COMPONENTS
function Panel({ href, label, title, bgImage }: { href: string; label: string; title: string; bgImage: string }) {
  return (
    <Link href={href} className="group relative flex-1 overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-r-0 h-1/3 md:h-full">
      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-110" style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%), url('${bgImage}')` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6 text-center z-10">
        <span className="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">{label}</span>
        <h2 className="text-white text-4xl md:text-5xl font-serif italic mb-8">{title}</h2>
        <div className="h-14 px-10 border border-white text-white flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] group-hover:bg-white group-hover:text-black transition-all duration-300">Shop Now</div>
      </div>
    </Link>
  );
}

function CuratedCard({ href, title, subtitle, image, large = false }: { href: string, title: string, subtitle?: string, image: string, large?: boolean }) {
  return (
    <Link href={href} className={`relative group overflow-hidden rounded-3xl ${large ? 'col-span-2 aspect-[4/3] md:aspect-[21/9]' : 'aspect-square'}`}>
      <img src={image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={title} />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
      <div className={`absolute left-8 md:left-10 ${large ? 'bottom-10' : 'bottom-8'}`}>
        <h3 className={`${large ? 'text-4xl' : 'text-2xl'} font-bold uppercase tracking-tight`}>{title}</h3>
        {subtitle && <p className="text-sm font-medium opacity-90 mt-2">{subtitle}</p>}
      </div>
    </Link>
  );
}