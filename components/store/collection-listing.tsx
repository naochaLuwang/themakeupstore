import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Breadcrumbs } from './breadcrumbs'
import { CatalogListing, type CatalogSearchParams } from './catalog-listing'

export async function CollectionListing({ slug, section, searchParams }: {
  slug: string; section: 'category' | 'categories' | 'exclusive' | 'essentials'; searchParams: CatalogSearchParams
}) {
  const db = await createClient()
  const { data: category, error } = await db.from('categories').select('id,name,slug,parent_id,image_url,parent:parent_id(id,name,slug)').eq('is_active', true).eq('slug', slug).maybeSingle()
  if (error) throw new Error('This collection could not be loaded. Please retry.')
  if (!category) notFound()
  const parent = category.parent as unknown as { id: string; name: string; slug: string } | null
  const { data: navigation } = await db.from('categories').select('id,name,slug,image_url').eq('is_active', true)
    .eq('parent_id', category.parent_id || category.id).order('name')
  const concerns = slug === 'skincare' ? (await db.from('concerns').select('id,name,slug,image_url').order('name')).data || [] : []
  const thumbnails = new Map<string, string>()
  if (navigation?.length && ['category', 'categories'].includes(section)) {
    const { data } = await db.from('product_categories').select('category_id,products!inner(thumbnail_url,status)')
      .in('category_id', navigation.map(item => item.id)).eq('products.status', 'active').not('products.thumbnail_url', 'is', null).limit(200)
    for (const row of data || []) {
      const product = row.products as unknown as { thumbnail_url: string | null }
      if (product?.thumbnail_url && !thumbnails.has(row.category_id)) thumbnails.set(row.category_id, product.thumbnail_url)
    }
  }
  const parentHref = parent && ['exclusive', 'essentials'].includes(parent.slug) ? '/' + parent.slug : parent ? '/category/' + parent.slug : '/categories'
  const items = [...(parent ? [{ label: parent.name, href: parentHref }] : []), { label: category.name, href: `/${section}/${slug}` }]
  const extraCategories = section === 'essentials' && slug === 'skincare-accessories' ? ['brushes', 'accessories'] : undefined
  const brandSection = section === 'exclusive' || section === 'essentials'
  return <div className="min-h-screen bg-white">
    <div className={brandSection ? 'border-b border-slate-100 bg-white' : 'bg-white'}>
      <div className={brandSection ? 'mx-auto max-w-7xl px-4 pb-2 pt-4' : 'px-4 pb-2 pt-6'}>
        <div className="hidden md:block"><Breadcrumbs items={items} /></div>
        {!brandSection && <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.4em] text-rose-400">{parent?.name || 'Category'}</p>}
        <h1 className={brandSection ? 'text-xl font-black tracking-tight text-slate-900' : 'text-3xl font-light leading-tight tracking-tight text-slate-900'}>{category.name}</h1>
        {!brandSection && <div className="mt-3 flex items-center gap-2"><div className="h-px w-8 bg-rose-300" /><div className="h-1.5 w-1.5 rounded-full bg-rose-400" /><div className="h-px flex-1 bg-slate-100" /></div>}
        {parent && <Link href={parentHref} className="inline-flex min-h-10 items-center text-[10px] font-semibold text-slate-400 hover:text-rose-500">Shop all {parent.name}</Link>}
      </div>
      {!!navigation?.length && <nav aria-label="Related collections" className={brandSection ? 'mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 pb-3 no-scrollbar' : 'flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-5 no-scrollbar'}>
        {navigation.map(item => {
          const image = thumbnails.get(item.id) || item.image_url
          return <Link key={item.id} href={`/${section === 'category' ? 'categories' : section}/${item.slug}`} aria-current={item.slug === slug ? 'page' : undefined} className="flex shrink-0 snap-start flex-col items-center gap-2">
            <div className={`${brandSection ? 'h-12 w-12 border-2 border-white ring-2' : 'h-20 w-20 shadow-md'} overflow-hidden rounded-full ${item.slug === slug ? 'ring-2 ring-rose-400 ring-offset-2' : brandSection ? 'ring-slate-200' : ''}`}>
              {image ? <Image src={image} alt="" width={80} height={80} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-50 to-slate-100 text-xl font-bold text-rose-300">{item.name[0]}</div>}
            </div>
            <span className={`max-w-24 text-center text-[10px] font-semibold ${item.slug === slug ? 'text-rose-500' : 'text-slate-500'}`}>{item.name}</span>
          </Link>
        })}
      </nav>}
      {!!concerns.length && <nav aria-label="Shop by skincare concern" className="flex gap-4 overflow-x-auto px-4 py-4 no-scrollbar">
        {concerns.map(concern => <Link key={concern.id} href={'/concern/' + concern.slug} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-[10px] font-semibold text-slate-500">
          {concern.image_url && <Image src={concern.image_url} alt="" width={80} height={80} className="h-20 w-20 rounded-full object-cover" />}{concern.name}
        </Link>)}
      </nav>}
    </div>
    <CatalogListing title={category.name} presentation="collection" scope={{ category: slug, extraCategories }} searchParams={searchParams} />
  </div>
}
