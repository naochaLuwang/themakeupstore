import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MapPin, Home, Briefcase, Map, Edit2, Trash2, ArrowLeft } from "lucide-react"
import { AddressForm } from "@/components/store/address-form"

export default async function AddressBookPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: addresses } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })

    return (
        <div className="min-h-screen bg-white pb-32">
            <header className="px-6 pt-16 pb-8 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <Link href="/profile" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 hover:text-black transition-colors">
                    <ArrowLeft className="w-3 h-3" /> Back to Account
                </Link>
                <h1 className="text-4xl font-serif tracking-tighter uppercase italic leading-none">
                    Destinations
                </h1>
            </header>

            <main className="px-6 py-10 max-w-2xl mx-auto space-y-16">

                {/* SECTION: SAVED ADDRESSES */}
                <section className="space-y-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saved Addresses</h2>

                    {addresses && addresses.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {addresses.map((addr) => (
                                <div key={addr.id} className="group relative border border-zinc-100 rounded-[2rem] p-6 hover:border-slate-900 transition-all duration-500">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                {addr.label === 'Work' ? <Briefcase className="w-4 h-4" /> : addr.label === 'Home' ? <Home className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                                            </div>
                                            {addr.is_default && (
                                                <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{addr.full_name}</h3>
                                        <p className="text-[11px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                            {addr.street}<br />
                                            {addr.city}, {addr.state} — {addr.pincode}
                                        </p>
                                        <p className="pt-2 text-[10px] font-bold text-slate-400 tracking-widest">{addr.phone}</p>
                                    </div>

                                    {/* Action Floating Icons */}
                                    <div className="absolute top-6 right-6 flex gap-1">
                                        <button className="p-2 text-zinc-300 hover:text-slate-900 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center">
                            <MapPin className="w-6 h-6 text-zinc-200 mb-3" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300">No destinations saved</p>
                        </div>
                    )}
                </section>

                <div className="h-[1px] bg-zinc-50 w-full" />

                {/* SECTION: ADD NEW FORM */}
                <section className="space-y-8">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Add New Destination</h2>
                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mt-1">Specify your logistics details</p>
                    </div>
                    <AddressForm userId={user.id} />
                </section>
            </main>
        </div>
    )
}