

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
    User,
    ShoppingBag,
    Heart,
    MapPin,
    Settings,
    LogOut,
    ChevronRight,
    ShieldCheck,
    Bell
} from "lucide-react"

export default async function ProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    const menuItems = [
        { label: "Orders", href: "/profile/orders", icon: ShoppingBag, detail: "History & Tracking" },
        { label: "Wishlist", href: "/profile/wishlist", icon: Heart, detail: "Your saved items" },
        { label: "Notifications", href: "/profile/notifications", icon: Bell, detail: "Preferences" },
        { label: "Addresses", href: "/profile/addresses", icon: MapPin, detail: "Shipping registry" },
        // { label: "Account Settings", href: "/profile/settings", icon: Settings, detail: "Security & Privacy" },
    ]

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* STICKY HEADER AREA */}
            <header className="px-6 pt-16 pb-8 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                            Welcome Back
                        </p>
                        <h1 className="text-4xl font-serif tracking-tighter uppercase italic leading-none">
                            {profile?.full_name?.split(' ')[0] || 'Member'}
                        </h1>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-zinc-400" />
                        )}
                    </div>
                </div>

                {profile?.is_admin && (
                    <Link href="/admin" className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full w-fit">
                        <ShieldCheck className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Access Admin Panel</span>
                    </Link>
                )}
            </header>

            <main className="px-6 py-8 space-y-10">
                {/* QUICK NAV LIST */}
                <section className="space-y-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">
                        Account Management
                    </h2>

                    <div className="space-y-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="group flex items-center justify-between p-4 -mx-2 rounded-2xl hover:bg-zinc-50 active:bg-zinc-100 active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-zinc-100 transition-colors">
                                        <item.icon className="w-4 h-4 text-slate-900" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">
                                            {item.label}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* SIGN OUT AREA */}
                <section className="pt-6 border-t border-zinc-50">
                    <form action="/auth/signout" method="post">
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-50 hover:bg-red-50 hover:text-red-600 text-zinc-500 transition-all font-black uppercase text-[11px] tracking-widest"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out of Account
                        </button>
                    </form>
                    <p className="mt-8 text-center text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                        THE MAKEUP STORE Member Since {new Date(profile?.created_at).getFullYear()}
                    </p>
                </section>
            </main>
        </div>
    )
}