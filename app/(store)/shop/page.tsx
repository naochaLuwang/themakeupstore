import { CatalogListing, type CatalogSearchParams } from '@/components/store/catalog-listing'
export const metadata = { title: 'Shop all products', description: 'Browse makeup, skincare and beauty products.' }
export default async function ShopPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  return <div className="min-h-screen bg-white"><h1 className="sr-only">Shop all products</h1><CatalogListing title="Shop all products" presentation="shop" searchParams={await searchParams} /></div>
}
