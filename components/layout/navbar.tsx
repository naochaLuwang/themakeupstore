import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { User, Search } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { redirect } from "next/navigation"
import { CartButton } from "./cart-button"
import { NavSearch } from "@/components/nav-search"
import { SignInLink } from "./sign-in-link"
import { Suspense } from "react"
import { StoreMenu, StorePrimaryLinks } from "./store-menu"
import { HeaderScroll } from "./header-scroll"
import { WishlistCounter } from "../wishlist-counter"

export default async function Navbar() {
    let user: any = null
    let supabase: any = null
    try {
        supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data?.user || null
    } catch {
        // Invalid session — render navbar without user state
    }

    async function signOut() {
        "use server"
        try {
            const supabase = await createClient()
            await supabase.auth.signOut()
        } catch {}
        redirect("/")
    }

    let initialWishlistCount = 0
    if (user && supabase) {
        const { count } = await supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        initialWishlistCount = count || 0
    }

    return (
        <HeaderScroll>
            <header className="w-full md:border-b md:border-transparent">
                <div className="max-w-[1440px] mx-auto px-3 min-[375px]:px-4 md:px-8 xl:px-12">
                    <div className="h-16 md:h-24 flex items-center justify-between gap-1 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">

                        <div className="hidden min-w-0 items-center md:flex">
                            <StoreMenu />
                            <StorePrimaryLinks />
                        </div>

                        {/* Logo — left on mobile, centered on desktop */}
                        <div className="flex-shrink-0 md:justify-self-center md:px-2">
                            <Link href="/" data-store-logo className="flex flex-col md:items-center gap-0 md:gap-0">
                                <span className="text-xs min-[375px]:text-base md:text-2xl font-daciana font-bold tracking-[0.1em] md:tracking-[0.2em] leading-none text-black md:text-charcoal uppercase">THE MAKEUP STORE</span>
                                <span className="text-[9px] md:text-[7px] font-bold tracking-[0.3em] md:tracking-[0.5em] text-black/50 md:text-primary uppercase mt-0.5 md:mt-2 md:opacity-80">WANGKHEI</span>
                            </Link>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-1 items-center justify-end gap-1 md:gap-4 min-w-0">
                            {/* Desktop search */}
                            <div className="hidden xl:block xl:w-52 min-[1400px]:w-64">
                                <Suspense fallback={<Link href="/search" className="flex min-h-11 items-center text-sm text-slate-600">Search products</Link>}><NavSearch key="desktop-search" /></Suspense>
                            </div>

                            <div className="flex items-center gap-0 min-[375px]:gap-2 md:gap-3 shrink-0">
                                {/* Mobile: Search icon → /search */}
                                <Link
                                    href="/search"
                                    aria-label="Search products"
                                    className="flex h-10 w-10 items-center justify-center xl:hidden hover:text-primary transition-colors"
                                >
                                    <Search className="w-5 h-5 text-black md:text-charcoal" strokeWidth={1.5} />
                                </Link>

                                <div className="md:hidden [&_svg]:text-black">
                                    <WishlistCounter initialCount={initialWishlistCount} userId={user?.id} />
                                </div>

                                <div className="[&_svg]:text-black [&_svg]:md:text-charcoal">
                                    <CartButton />
                                </div>

                                {/* Desktop user menu */}
                                <div className="hidden md:block">
                                    {!user ? (
                                        <SignInLink className="inline-flex min-h-11 items-center px-2 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary" />
                                    ) : (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button aria-label="Open account menu" className="focus:outline-none p-2 text-charcoal hover:text-primary transition-all group">
                                                    <User className="w-[24px] h-[24px] transition-transform group-hover:scale-110" strokeWidth={1.5} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 mt-4 rounded-none border-charcoal/5 shadow-2xl p-2 bg-white dark:bg-zinc-950">
                                                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Account</p>
                                                    <p className="text-[10px] font-bold truncate">{user.email}</p>
                                                </div>
                                                <DropdownMenuItem asChild className="cursor-pointer text-[10px] uppercase py-3 font-bold tracking-widest focus:bg-primary/5">
                                                    <Link href="/profile">My account</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild className="cursor-pointer text-[10px] uppercase py-3 font-bold tracking-widest focus:bg-primary/5">
                                                    <Link href="/rewards">Rewards</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:bg-red-50 cursor-pointer text-[10px] uppercase py-3 font-bold tracking-widest">
                                                    <form action={signOut} className="w-full">
                                                        <button type="submit" className="w-full text-left uppercase font-bold">Sign Out</button>
                                                    </form>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </HeaderScroll>
    )
}
