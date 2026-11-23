import { CatalogListing, type CatalogSearchParams } from '@/components/store/catalog-listing'
import { createClient } from '@/utils/supabase/server'
import SkincareAccessoriesClient from './skincare-accessories-client'
export const metadata = { title: 'Skincare and accessories' }
export default async function SkincareAccessoriesPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const db = await createClient()
  const { data: parents } = await db.from('categories').select('id').eq('is_active', true).in('slug', ['skincare', 'accessories'])
  const { data: subcategories } = parents?.length ? await db.from('categories').select('id,name,slug').eq('is_active', true).in('parent_id', parents.map(parent => parent.id)).order('name') : { data: [] }
  return <SkincareAccessoriesClient initialSubcategories={subcategories || []}><CatalogListing title="Skincare and accessories" presentation="editorial" scope={{ category: 'skincare', extraCategories: ['accessories'] }} searchParams={await searchParams} /></SkincareAccessoriesClient>
}
