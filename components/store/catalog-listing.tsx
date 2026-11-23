import { Suspense } from 'react'
import { CatalogBrowser } from './catalog-browser'
import { readCatalogState, type CatalogScope } from '@/lib/storefront-catalog'
import { searchStoreCatalog } from '@/lib/storefront-catalog-server'

export type CatalogSearchParams = Record<string, string | string[] | undefined>
export async function CatalogListing({ search = false, scope = {}, title, searchParams = {}, presentation }: {
  search?: boolean; scope?: CatalogScope; title: string; searchParams?: CatalogSearchParams; presentation?: 'shop' | 'collection' | 'editorial' | 'fun-size'
}) {
  const params = new URLSearchParams()
  for (const [key, values] of Object.entries(searchParams)) for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) params.append(key, value)
  let initialResult
  try { initialResult = await searchStoreCatalog(readCatalogState(params, search), scope) } catch { /* The client presents a retryable error. */ }
  return <Suspense fallback={<p role="status" className="px-4 py-12 text-center text-sm text-slate-500">Loading products…</p>}>
    <CatalogBrowser search={search} scope={scope} title={title} presentation={presentation} initialResult={initialResult} />
  </Suspense>
}
