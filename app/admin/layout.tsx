import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Separator } from "@/components/ui/separator"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Security Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, is_admin, user_type")
        .eq("id", user.id)
        .single()

    const isAdmin = profile?.is_admin || profile?.user_type === 'admin';
    if (!isAdmin) {
        redirect("/")
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                {/* Header Bar */}
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <div className="flex-1 flex justify-between items-center">
                        <h2 className="text-sm font-semibold tracking-tight">Admin Dashboard</h2>

                        {/* Displaying logged in user name */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">
                                Hello, {profile.full_name?.split(' ')[0] || 'Admin'}
                            </span>
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 bg-slate-50/50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}