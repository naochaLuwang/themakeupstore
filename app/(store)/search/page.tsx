import { CatalogListing, type CatalogSearchParams } from '@/components/store/catalog-listing'
export const metadata = { title: 'Search products' }
export default async function SearchPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  return <div className="min-h-screen bg-white"><h1 className="sr-only">Search products</h1><CatalogListing search title="Search products" searchParams={await searchParams} /></div>
}
