import { Suspense } from 'react'
import { BrandDirectory } from '@/components/store/brand-directory'
import { readStoreCategories } from '@/lib/storefront-catalog-server'
export const metadata = { title: 'Beauty brands' }
export const dynamic = 'force-dynamic'
export default async function BrandsPage() {
  const categories = await readStoreCategories()
  return <div className="min-h-screen bg-white"><Suspense><BrandDirectory categories={categories} /></Suspense></div>
}
