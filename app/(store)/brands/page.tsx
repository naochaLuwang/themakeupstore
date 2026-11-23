import { Suspense } from 'react'
import { BrandDirectory } from '@/components/store/brand-directory'
import { readCatalogState } from '@/lib/storefront-catalog'
import { searchStoreCatalog } from '@/lib/storefront-catalog-server'
export const metadata = { title: 'Beauty brands' }
export const dynamic = 'force-dynamic'
export default async function BrandsPage() {
  const result = await searchStoreCatalog(readCatalogState(new URLSearchParams()))
  return <div className="min-h-screen bg-white"><Suspense><BrandDirectory brands={result.facets.brands} categories={result.facets.categories} /></Suspense></div>
}
