"use client"

import { adminConfig } from "@/config/admin"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ShoppingBag as Sparkles, ExternalLink, Search } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useState, useMemo } from "react"

export function AdminSidebar() {
    const supabase = createClient()
    const { isMobile, setOpenMobile } = useSidebar()
    const pathname = usePathname()
    const [search, setSearch] = useState("")

    const navItems = useMemo(() => {
        if (!search.trim()) return adminConfig.navItems
        const q = search.toLowerCase()
        return adminConfig.navItems.filter(item => item.title.toLowerCase().includes(q))
    }, [search])

    const isActive = (href: string) => {
        if (href === "/admin") return pathname === "/admin"
        return pathname === href || pathname.startsWith(href + "/")
    }

    const handleNavClick = () => {
        if (isMobile) setOpenMobile(false)
    }

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Error signing out")
        } else {
            toast.success("Signed out successfully")
            window.location.href = "/login"
        }
    }

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-slate-200 bg-white px-4 py-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-pink-700 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white stroke-[1.5]" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 truncate">The Makeup Store</div>
                            <div className="text-xs font-medium text-slate-500 tracking-normal">Admin Panel</div>
                        </div>
                    </div>
                    <Link
                        href="/"
                        target="_blank"
                        className="flex items-center gap-1.5 text-xs font-semibold tracking-normal text-slate-500 hover:text-sidebar-foreground transition-colors"
                    >
                        Store
                        <ExternalLink className="h-4 w-4 stroke-[1.5]" />
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 stroke-[1.5]" />
                    <input
                        type="text"
                        placeholder="Search menus..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20 transition-colors"
                    />
                </div>
            </SidebarHeader>

            <SidebarContent className="bg-white px-2 py-3">
                <SidebarMenu className={`gap-1 ${isMobile ? "px-0" : "px-0"}`}>
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={active}
                                    className={`h-9 ${isMobile ? "h-11 text-sm" : "h-9 text-[13px]"} font-medium rounded-lg border-l-2 border-l-transparent data-[active=true]:border-l-pink-700 data-[active=true]:bg-pink-50 data-[active=true]:text-pink-700 data-[active=true]:font-semibold transition-colors`}
                                >
                                    <Link href={item.href} onClick={handleNavClick}>
                                        <item.icon className={`h-4 w-4 shrink-0 stroke-[1.5] ${active ? "text-pink-700" : "text-slate-500"}`} />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
                {navItems.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-xs text-slate-500 font-medium">No menus match "{search}"</p>
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-200 bg-white p-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                            <LogOut className="h-4 w-4 shrink-0 stroke-[1.5]" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
