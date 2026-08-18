"use client"
import { useState } from "react"
import { createHeroBanner, updateHeroBanner } from "@/app/actions/hero-banners"
import { Loader2, ArrowRight, ImageIcon, Route, Type, FlipHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface HeroBannerFormProps {
    initialData?: any
}

export function HeroBannerForm({ initialData }: HeroBannerFormProps) {
    const router = useRouter()
    const isEdit = !!initialData
    const [loading, setLoading] = useState(false)

    return (
        <form
            className="max-w-3xl mx-auto space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700"
            action={async (formData) => {
                setLoading(true)
                try {
                    const res = isEdit
                        ? await updateHeroBanner(initialData.id, formData)
                        : await createHeroBanner(formData)
                    if (res.success) {
                        toast.success(isEdit ? "Banner updated" : "Banner created")
                        router.push("/admin/hero-banners")
                        router.refresh()
                    } else {
                        toast.error(res.message || "Failed to save")
                    }
                } catch (err: any) {
                    toast.error("System error")
                } finally {
                    setLoading(false)
                }
            }}
        >
            {/* Card 1: Content */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Type className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Banner Content</h3>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slide Content</div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Title</label>
                        <input
                            name="title"
                            required
                            defaultValue={initialData?.title}
                            placeholder="THE MAKEUP STORE"
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-black uppercase tracking-[0.2em] focus:bg-white focus:border-slate-900 transition-all outline-none shadow-inner"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Subtitle</label>
                        <input
                            name="subtitle"
                            defaultValue={initialData?.subtitle}
                            placeholder="EXCLUSIVE COLLECTION"
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-black uppercase tracking-[0.2em] focus:bg-white focus:border-slate-900 transition-all outline-none shadow-inner"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            defaultValue={initialData?.description}
                            placeholder="Luxury makeup, skincare, and fragrance from the world most coveted beauty brands"
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-medium focus:bg-white focus:border-slate-900 transition-all resize-none outline-none shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Card 2: Image & Route */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Image & Navigation</h3>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Image URL</label>
                        <input
                            name="image_url"
                            defaultValue={initialData?.image_url}
                            placeholder="https://cloudinary.com/..."
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-medium focus:bg-white focus:border-slate-900 transition-all outline-none shadow-inner"
                        />
                        <p className="text-[9px] text-slate-400 font-medium ml-1">Full URL to the banner image. Upload via Cloudinary first.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Route</label>
                            <input
                                name="route"
                                defaultValue={initialData?.route || "/exclusive"}
                                placeholder="/exclusive"
                                className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Position (sort order)</label>
                            <input
                                name="position"
                                type="number"
                                defaultValue={initialData?.position || 0}
                                className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Active</p>
                            <p className="text-[9px] text-slate-400 font-medium">Show this banner on the homepage.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={initialData?.is_active !== false}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {initialData?.image_url && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <FlipHorizontal className="w-4 h-4 text-amber-600" />
                            </div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Preview</h3>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-slate-100">
                            <img src={initialData.image_url} alt={initialData.title} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <h4 className="text-white text-lg font-black uppercase tracking-wider">{initialData.title}</h4>
                                {initialData.subtitle && (
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">{initialData.subtitle}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={loading}
                    className="h-14 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all transform flex items-center justify-center gap-4 group px-10"
                >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                        {loading ? "Saving..." : isEdit ? "Update Banner" : "Create Banner"}
                    </span>
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    )}
                </Button>
            </div>
        </form>
    )
}
