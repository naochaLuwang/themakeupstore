import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { CatalogListing, type CatalogSearchParams } from '@/components/store/catalog-listing'
import { Breadcrumbs } from '@/components/store/breadcrumbs'
export default async function ConcernPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogSearchParams> }) {
  const { slug } = await params
  const db = await createClient()
  const { data, error } = await db.from('concerns').select('id,name,slug,image_url').eq('slug', slug).maybeSingle()
  if (error) throw new Error('This collection could not be loaded. Please retry.')
  if (!data) notFound()
  return <div className="min-h-screen bg-white"><div className="border-b border-slate-100 bg-white"><div className="flex h-14 items-center gap-3 px-4"><Link href="/category/skincare" aria-label="All skincare" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-50"><ArrowLeft className="h-5 w-5 text-slate-800" /></Link><span className="text-[9px] font-bold uppercase tracking-[0.4em] text-rose-400">Skin Concern</span></div></div><div className="px-4 pb-6 pt-4"><div className="hidden md:block"><Breadcrumbs items={[{ label: 'Skincare', href: '/category/skincare' }, { label: data.name, href: '/concern/' + slug }]} /></div><div className="flex items-center gap-6">{data.image_url && <Image src={data.image_url} alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-md" />}<div className="min-w-0 flex-1"><h1 className="text-2xl font-light leading-tight tracking-tight text-slate-900">{data.name}</h1><div className="mt-2 flex items-center gap-2"><div className="h-px w-6 bg-rose-300" /><div className="h-1 w-1 rounded-full bg-rose-400" /></div></div></div></div><CatalogListing title={data.name} presentation="collection" scope={{ concern: slug }} searchParams={await searchParams} /></div>
}
