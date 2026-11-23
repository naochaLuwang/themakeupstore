import { NextResponse } from 'next/server'
import { readCatalogState } from '@/lib/storefront-catalog'
import { searchStoreCatalog } from '@/lib/storefront-catalog-server'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const state = readCatalogState(params, params.get('mode') !== 'browse')
  try {
    const result = await searchStoreCatalog(state, {
      category: params.get('scope')?.slice(0, 100), extraCategories: params.getAll('extra').slice(0, 5),
      concern: params.get('concern')?.slice(0, 100),
    }, params.get('suggest') === '1' ? 5 : undefined)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
  } catch {
    return NextResponse.json({ error: 'Products could not be loaded. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
