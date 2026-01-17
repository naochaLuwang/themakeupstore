


import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { LogOut, User, Search, ShoppingBag, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    async function signOut() {
        "use server"
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect("/")
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-charcoal/5 bg-background-light/90 backdrop-blur-md dark:bg-background-dark/90">
            <div className="max-w-[1440px] mx-auto px-6 md:px-12">
                <div className="h-24 flex items-center justify-between gap-8">

                    {/* LEFT: Navigation Links (Desktop) */}
                    <nav className="hidden lg:flex flex-1 items-center gap-10">
                        {['Brands', 'New Arrivals', 'Shop', 'Concierge'].map((item) => (
                            <Link
                                key={item}
                                href={item === 'Shop' ? '/shop' : '#'}
                                className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal dark:text-white hover:text-primary transition-colors relative group"
                            >
                                {item}
                                <span className="absolute -bottom-1 left-1/2 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0" />
                            </Link>
                        ))}
                    </nav>

                    {/* CENTER: Logo Section */}
                    <div className="flex-none text-center">
                        <Link href="/" className="flex flex-col items-center group">
                            <span className="text-xl md:text-2xl  font-daciana font-bold tracking-[0.2em] leading-none text-charcoal dark:text-white uppercase transition-colors">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[7px] font-bold tracking-[0.5em] text-primary uppercase mt-2 opacity-80">
                                WANGKHEI
                            </span>
                        </Link>
                    </div>

                    {/* RIGHT: Search & Actions */}
                    <div className="flex flex-1 items-center justify-end gap-2 md:gap-6">

                        {/* Desktop Search Bar - Refined Style */}
                        <div className="hidden xl:block w-48 group border-b border-charcoal/10 hover:border-primary transition-all">
                            <div className="flex items-center">
                                <NavSearch />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* User Menu */}
                            {!user ? (
                                <Link
                                    href="/login"
                                    className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.2em] hover:text-primary transition-colors"
                                >
                                    Login
                                </Link>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-center hover:text-primary transition-colors focus:outline-none group">
                                            <User
                                                className="w-5 h-5 stroke-[1.5px] text-charcoal dark:text-white group-hover:text-primary transition-colors"
                                            />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 mt-4 rounded-none border-charcoal/5 bg-background-light shadow-2xl">
                                        <div className="px-4 py-4 border-b border-charcoal/5">
                                            <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest">Signed in as</p>
                                            <p className="text-[11px] font-semibold text-charcoal truncate">{user.email}</p>
                                        </div>
                                        <DropdownMenuItem asChild className="cursor-pointer text-[10px] uppercase tracking-widest py-3 focus:bg-zinc-50">
                                            <Link href="/profile">My Profile</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-800 focus:text-red-800 focus:bg-red-50 cursor-pointer text-[10px] uppercase tracking-widest py-3">
                                            <form action={signOut} className="w-full">
                                                <button className="flex items-center w-full">
                                                    Sign Out
                                                </button>
                                            </form>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Cart Icon - Custom Style */}
                            <CartButton />

                            {/* Mobile Menu Trigger */}
                            <div className="lg:hidden">
                                <MobileMenu user={user} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* MOBILE SEARCH BAR */}
                <div className="md:hidden pb-6">
                    <div className="border-b border-charcoal/10">
                        <NavSearch />
                    </div>
                </div>
            </div>
        </header>
    )
}