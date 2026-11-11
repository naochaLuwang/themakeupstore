import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { OrderNotification } from "@/components/admin/order-notification"
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
        <SidebarProvider className="min-w-0 bg-slate-50">
            <AdminSidebar />
            <SidebarInset className="min-w-0 bg-slate-50">
                {/* Header Bar */}
                <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:h-16 sm:px-6">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                        <h2 className="text-sm font-semibold text-slate-700 truncate">Admin Dashboard</h2>

                        {/* Displaying logged in user name */}
                        <div className="flex items-center gap-3">
                            <OrderNotification />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">
                                    Hello, {profile.full_name?.split(' ')[0] || 'Admin'}
                                </span>
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="min-w-0 flex-1 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto w-full min-w-0 max-w-[1440px]">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
