import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Image as ImageIcon, ArrowUpDown } from "lucide-react"
import { HeroBannerToggle, DeleteHeroBannerButton } from "./hero-banner-controls"
import Link from "next/link"

export default async function AdminHeroBannersPage() {
    const supabase = await createClient()
    const { data: banners } = await supabase
        .from("hero_banners")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false })

    return (
        <div className="max-w-7xl mx-auto p-8">
            <header className="flex justify-between items-end mb-12 border-b border-slate-900 pb-4">
                <div className="space-y-1">
                    <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Hero Banners</h1>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">Manage homepage hero slides</p>
                </div>
                <Link href="/admin/hero-banners/new" className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                    <Plus className="w-3 h-3" /> New Banner
                </Link>
            </header>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-[10px] uppercase tracking-widest">
                    <thead className="bg-slate-50/50 text-slate-400">
                        <tr>
                            <th className="p-6 text-left font-black">Preview</th>
                            <th className="p-6 text-left font-black">Title</th>
                            <th className="p-6 text-left font-black">Position</th>
                            <th className="p-6 text-left font-black">Route</th>
                            <th className="p-6 text-left font-black">Status</th>
                            <th className="p-6 text-right font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {banners?.length === 0 ? (
                            <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold">No hero banners found.</td></tr>
                        ) : (
                            banners?.map((banner) => (
                                <tr key={banner.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="p-6">
                                        <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100">
                                            {banner.image_url ? (
                                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="font-black text-slate-900 text-xs mb-1 uppercase tracking-tighter">{banner.title || "Untitled"}</div>
                                        <div className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{banner.subtitle || "—"}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                                            <ArrowUpDown className="w-2.5 h-2.5" /> {banner.position}
                                        </div>
                                    </td>
                                    <td className="p-6 font-bold text-slate-500">{banner.route || "/exclusive"}</td>
                                    <td className="p-6">
                                        <HeroBannerToggle id={banner.id} isActive={banner.is_active} />
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/hero-banners/edit/${banner.id}`} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </Link>
                                            <DeleteHeroBannerButton id={banner.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
