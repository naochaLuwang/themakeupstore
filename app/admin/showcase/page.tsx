import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { ToggleShowcaseButton, DeleteShowcaseButton } from "./controls"

export default async function AdminShowcasePage() {
    const supabase = await createClient()
    const { data: items } = await supabase
        .from("showcase_items")
        .select("id, title, subtitle, image_url, position, is_active")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Showcase</h1>
                    <p className="text-sm text-slate-500">Manage &quot;Steal the Show&quot; homepage items</p>
                </div>
                <Link href="/admin/showcase/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Item
                </Link>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Preview</th>
                            <th className="py-4 px-6 text-left">Title</th>
                            <th className="py-4 px-6 text-left">Subtitle</th>
                            <th className="py-4 px-6 text-left">Position</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items?.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No showcase items found.</td></tr>
                        ) : (
                            items?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-500">{item.subtitle || "—"}</td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-600">{item.position}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <ToggleShowcaseButton id={item.id} isActive={item.is_active} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/showcase/edit/${item.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <DeleteShowcaseButton id={item.id} />
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
