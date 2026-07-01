import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, ShoppingBag, Monitor, ClipboardList, Search } from "lucide-react"

export default async function PosLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, user_type")
        .eq("id", user.id)
        .single()

    if (!profile?.is_admin && profile?.user_type !== "admin") redirect("/")

    const nav = [
        { label: "Counter", href: "/pos", icon: ShoppingBag },
        { label: "Kiosk", href: "/pos/kiosk", icon: Monitor },
        { label: "Orders", href: "/pos/orders", icon: ClipboardList },
        { label: "Track", href: "/pos/track", icon: Search },
    ]

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <header className="h-12 bg-slate-900 text-white flex items-center px-6 gap-1 shrink-0">
                <Link href="/pos" className="text-sm font-black tracking-tight mr-6">POS</Link>
                {nav.map(item => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {item.label}
                        </Link>
                    )
                })}
                <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400">
                    <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
                    <span>{user.email?.split("@")[0]}</span>
                </div>
            </header>
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
