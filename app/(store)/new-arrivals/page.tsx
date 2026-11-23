import { CatalogListing, type CatalogSearchParams } from '@/components/store/catalog-listing'
import { Breadcrumbs } from '@/components/store/breadcrumbs'
export const metadata = { title: 'New arrivals' }
export default async function NewArrivalsPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  return <div className="min-h-screen bg-white pt-16"><main className="mx-auto max-w-7xl px-6 pb-20"><Breadcrumbs items={[{ label: 'New Arrivals', href: '/new-arrivals' }]} /><div className="mb-12"><h1 className="text-4xl font-black uppercase tracking-tighter italic">New Arrivals</h1><p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-400">Latest additions to The Makeup Store</p></div><CatalogListing title="New arrivals" presentation="editorial" scope={{ category: 'new-arrivals' }} searchParams={await searchParams} /></main></div>
}
