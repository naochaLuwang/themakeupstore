import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { User } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { redirect } from "next/navigation"
import { CartButton } from "./cart-button"
import { NavSearch } from "@/components/nav-search"
import { MobileMenu } from "../mobile-menu"
// Import the new component

export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    async function signOut() {
        "use server"
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect("/")
    }

    // Initial fetch for SSR
    let initialWishlistCount = 0
    if (user) {
        const { count } = await supabase
            .from('wishlist')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
        initialWishlistCount = count || 0
    }

    return (
        <header className="sticky top-0 z-[100] w-full border-b border-charcoal/5 bg-background-light/90 backdrop-blur-md dark:bg-background-dark/90 transition-all">
            <div className="max-w-[1440px] mx-auto px-4 md:px-12">
                <div className="h-20 md:h-24 flex items-center justify-between gap-4 md:gap-8">

                    {/* Navigation */}
                    <nav className="hidden lg:flex flex-1 items-center gap-10 min-w-0">
                        {[{ name: 'Brands', href: '/brands' }, { name: 'New Arrivals', href: '/new-arrivals' }, { name: 'Shop', href: '/shop' }, { name: 'Categories', href: '/categories' }].map((item) => (
                            <Link key={item.name} href={item.href} className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal dark:text-white hover:text-primary transition-colors relative group">
                                {item.name}
                                <span className="absolute -bottom-1 left-1/2 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0" />
                            </Link>
                        ))}
                    </nav>

                    {/* Logo */}
                    <div className="flex-shrink-0 text-center px-2">
                        <Link href="/" className="flex flex-col items-center group">
                            <span className="text-sm md:text-2xl font-daciana font-bold tracking-[0.1em] md:tracking-[0.2em] leading-none text-charcoal dark:text-white uppercase">THE MAKEUP STORE</span>
                            <span className="text-[9px] md:text-[7px] font-bold tracking-[0.3em] md:tracking-[0.5em] text-primary uppercase mt-1 md:mt-2 opacity-80">WANGKHEI</span>
                        </Link>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-1 items-center justify-end gap-2 md:gap-4 min-w-0">
                        <div className="hidden xl:block xl:w-64 border-b border-charcoal/10 focus-within:border-primary transition-colors mr-2">
                            <NavSearch key="desktop-search" />
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">

                            {/* REALTIME WISHLIST COUNTER */}
                            {/* <WishlistCounter initialCount={initialWishlistCount} userId={user?.id} /> */}

                            <CartButton />

                            {/* USER PROFILE - Hidden on Mobile */}
                            <div className="hidden md:block">
                                {!user ? (
                                    <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] px-2 hover:text-primary">Login</Link>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="focus:outline-none p-2 text-charcoal dark:text-white hover:text-primary transition-all group">
                                                <User className="w-[24px] h-[24px] transition-transform group-hover:scale-110" strokeWidth={1.5} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 mt-4 rounded-none border-charcoal/5 shadow-2xl p-2 bg-white dark:bg-zinc-950">
                                            <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Account</p>
                                                <p className="text-[10px] font-bold truncate">{user.email}</p>
                                            </div>
                                            <DropdownMenuItem asChild className="cursor-pointer text-[10px] uppercase py-3 font-bold tracking-widest focus:bg-primary/5">
                                                <Link href="/profile">Dashboard</Link>
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

                            <div className="lg:hidden">
                                <MobileMenu user={user} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:hidden pb-4 px-1">
                    <div >
                        <NavSearch key="mobile-search" />
                    </div>
                </div>
            </div>
        </header>
    )
}
