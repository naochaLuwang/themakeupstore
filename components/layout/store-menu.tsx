'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'

const browse = [{ label: 'Home', href: '/' }, { label: 'Brands', href: '/brands' }, { label: 'Categories', href: '/categories' }, { label: 'Shop all products', href: '/shop' }, { label: 'New arrivals', href: '/new-arrivals' }, { label: 'Offers', href: '/offers' }]
const account = [{ label: 'My account', href: '/profile' }, { label: 'My orders', href: '/profile/orders' }, { label: 'Wishlist', href: '/wishlist' }]
const help = [{ label: 'Contact us', href: '/contact' }, { label: 'Returns', href: '/legal/return_policy' }, { label: 'Privacy', href: '/legal/privacy_policy' }, { label: 'Terms', href: '/legal/terms_and_conditions' }]
export function StoreMenu() {
  const [openPath, setOpenPath] = useState<string | null>(null)
  const pathname = usePathname()
  const open = openPath === pathname
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null)
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger aria-label="Open navigation menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-800 hover:bg-slate-100 xl:hidden"><Menu className="h-5 w-5" /></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[600] bg-black/40" /><Dialog.Content className="fixed bottom-0 left-0 top-0 z-[610] flex w-[min(90vw,360px)] flex-col bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><Dialog.Title className="text-lg font-bold">Explore the store</Dialog.Title><Dialog.Description className="sr-only">Shopping, account and help links.</Dialog.Description></div><Dialog.Close aria-label="Close navigation menu" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></Dialog.Close></div>
      <nav aria-label="Store menu" className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {[['Shop', browse], ['Account', account], ['Help', help]].map(([label, links]) => <div key={label as string} className="border-b border-slate-100 py-4 last:border-0"><h2 className="mb-2 px-3 text-xs font-semibold text-slate-500">{label as string}</h2>{(links as typeof browse).map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} onClick={() => setOpen(false)} className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${pathname === link.href ? 'bg-pink-50 text-pink-800' : 'text-slate-800 hover:bg-slate-50'}`}>{link.label}</Link>)}</div>)}
      </nav>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}

export function StorePrimaryLinks() {
  const pathname = usePathname()
  const links = [{ label: 'Brands', href: '/brands' }, { label: 'New Arrivals', href: '/new-arrivals' }, { label: 'Shop', href: '/shop' }, { label: 'Categories', href: '/categories' }]
  return <nav aria-label="Primary navigation" className="hidden min-w-0 items-center gap-4 min-[1400px]:gap-8 xl:flex">{links.map(link => {
    const active = pathname === link.href || (link.href === '/brands' && /^\/(exclusive|essentials)\//.test(pathname)) || (link.href === '/categories' && /^\/(categories|category|concern)\//.test(pathname))
    return <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center whitespace-nowrap text-[9px] min-[1400px]:text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${active ? 'text-primary underline underline-offset-8' : 'text-charcoal hover:text-primary'}`}>{link.label}</Link>
  })}</nav>
}
