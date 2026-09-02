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
import { LogOut, Sparkles, ExternalLink, Search } from "lucide-react"
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
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-sm text-sidebar-foreground truncate">The Makeup Store</div>
                            <div className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">Admin Panel</div>
                        </div>
                    </div>
                    <Link
                        href="/"
                        target="_blank"
                        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                    >
                        Store
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search menus..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300/20 transition-all"
                    />
                </div>
            </SidebarHeader>

            <SidebarContent className="py-2">
                <SidebarMenu className={`gap-0.5 ${isMobile ? "px-2" : "px-1"}`}>
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={active}
                                    className={`h-9 ${isMobile ? "h-11 text-sm" : "h-9 text-[13px]"} font-medium rounded-lg data-[active=true]:bg-rose-50 data-[active=true]:text-rose-600 data-[active=true]:font-bold transition-all`}
                                >
                                    <Link href={item.href} onClick={handleNavClick}>
                                        <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-rose-500" : "text-slate-400"}`} />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
                {navItems.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <p className="text-xs text-slate-400 font-medium">No menus match "{search}"</p>
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            className="text-sidebar-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
