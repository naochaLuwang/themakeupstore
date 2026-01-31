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
import { NavSearch } from "@/components/nav-search" // Use NavSearch directly
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
        <header className="sticky top-0 z-[100] w-full border-b border-charcoal/5 bg-background-light/90 backdrop-blur-md dark:bg-background-dark/90">
            <div className="max-w-[1440px] mx-auto px-4 md:px-12">
                <div className="h-20 md:h-24 flex items-center justify-between gap-2 md:gap-8">

                    {/* Navigation Links */}
                    <nav className="hidden lg:flex flex-1 items-center gap-10 min-w-0">
                        {[
                            { name: 'Brands', href: '/brands' },
                            { name: 'New Arrivals', href: '/new-arrivals' },
                            { name: 'Shop', href: '/shop' },
                            { name: 'Categories', href: '/categories' }
                        ].map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal whitespace-nowrap dark:text-white hover:text-primary transition-colors relative group"
                            >
                                {item.name}
                                <span className="absolute -bottom-1 left-1/2 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0" />
                            </Link>
                        ))}
                    </nav>

                    {/* Logo Section */}
                    <div className="flex-shrink-0 text-center px-2">
                        <Link href="/" className="flex flex-col items-center">
                            <span className="text-sm md:text-2xl font-daciana font-bold tracking-[0.1em] md:tracking-[0.2em] leading-none text-charcoal dark:text-white uppercase">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[6px] md:text-[7px] font-bold tracking-[0.3em] md:tracking-[0.5em] text-primary uppercase mt-1 md:mt-2 opacity-80">
                                WANGKHEI
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Search & Actions */}
                    <div className="flex flex-1 items-center justify-end gap-2 md:gap-6 min-w-0">
                        <div className="hidden xl:block xl:w-64 2xl:w-80 border-b border-charcoal/10">
                            <NavSearch key="desktop-search" />
                        </div>

                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            {!user ? (
                                <Link href="/login" className="hidden md:block text-[10px] font-bold uppercase tracking-[0.2em]">Login</Link>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="focus:outline-none"><User className="w-5 h-5 hidden md:block" /></button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 mt-4 rounded-none">
                                        <DropdownMenuItem asChild className="cursor-pointer text-[10px] uppercase py-3">
                                            <Link href="/profile">My Profile</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-800 cursor-pointer text-[10px] uppercase py-3">
                                            <form action={signOut} className="w-full">
                                                <button type="submit" className="w-full text-left">Sign Out</button>
                                            </form>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <CartButton />
                            <div className="lg:hidden">
                                <MobileMenu user={user} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                <div className="md:hidden pb-4 px-1">
                    <div className="border-b border-charcoal/10">
                        <NavSearch key="mobile-search" />
                    </div>
                </div>
            </div>
        </header>
    )
}