'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { ArrowLeft } from 'lucide-react'
import { readBrowseOrigin } from '@/lib/storefront-navigation'
import { Breadcrumbs } from './breadcrumbs'

const subscribeOrigin = (listener: () => void) => {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

export function ProductNavigation({ name, category }: { name: string; category?: { slug: string; name: string } | null }) {
  const snapshot = useSyncExternalStore(subscribeOrigin, () => JSON.stringify(readBrowseOrigin()), () => 'null')
  const origin = JSON.parse(snapshot) as ReturnType<typeof readBrowseOrigin>
  const href = category ? '/categories/' + category.slug : '/shop'
  return <div className="mx-auto max-w-7xl px-4 pt-3">
    <Link href={origin?.href || href} scroll={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 hover:text-pink-700"><ArrowLeft className="h-4 w-4" />{origin ? 'Back to ' + origin.title : category ? 'Back to ' + category.name : 'Back to shop'}</Link>
    <div className="hidden md:block"><Breadcrumbs items={[...(category ? [{ label: category.name, href }] : [{ label: 'Shop', href: '/shop' }]), { label: name, href: '#' }]} /></div>
  </div>
}
