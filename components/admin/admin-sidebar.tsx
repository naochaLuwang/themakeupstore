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
} from "@/components/ui/sidebar"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function AdminSidebar() {
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Error signing out")
        } else {
            toast.success("Signed out successfully")
            router.push("/login")
            router.refresh()
        }
    }

    return (
        <Sidebar>
            <SidebarContent>
                {adminConfig.sidebarGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title}>
                                            <Link href={item.href}>
                                                <item.icon className="h-4 w-4" />
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

            <SidebarFooter className="border-t p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
