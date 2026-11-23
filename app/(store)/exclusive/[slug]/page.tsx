import { CollectionListing } from '@/components/store/collection-listing'
import type { CatalogSearchParams } from '@/components/store/catalog-listing'

export default async function CollectionPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<CatalogSearchParams>
}) {
  const { slug } = await params
  return <CollectionListing slug={slug} section="exclusive" searchParams={await searchParams} />
}
