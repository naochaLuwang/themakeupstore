"use client"

import { adminConfig } from "@/config/admin"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarHeader,
    useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { LogOut, Sparkles, ExternalLink } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export function AdminSidebar() {
    const supabase = createClient()
    const { state } = useSidebar()
    const collapsed = state === "collapsed"

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
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
                {collapsed ? (
                    <div className="flex items-center justify-center">
                        <Link href="/" target="_blank" className="flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-rose-500" />
                        </Link>
                    </div>
                ) : (
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
                            Visit Store
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                )}
            </SidebarHeader>
            <SidebarContent>
                {adminConfig.sidebarGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/40">
                            <span className="inline-block w-3 h-px bg-sidebar-foreground/20 mr-2 align-middle" />
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title} className="data-[active=true]:text-rose-600 data-[active=true]:font-bold">
                                            <Link href={item.href}>
                                                <item.icon className="h-4 w-4 shrink-0" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
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
