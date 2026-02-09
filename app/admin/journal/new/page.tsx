"use client"
import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Upload, Instagram, Image as ImageIcon, Video, Save, Loader2 } from "lucide-react"
import Editor from "@/components/admin/Editor"

export default function NewJournalEntry() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        excerpt: "",
        category: "Beauty",
        media_type: "image" as "image" | "video" | "instagram",
        featured_media_url: "",
    })
    const [content, setContent] = useState<any>(null)
    const [file, setFile] = useState<File | null>(null)

    const handleUpload = async () => {
        if (!file) return formData.featured_media_url
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data, error } = await supabase.storage.from('journal').upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('journal').getPublicUrl(fileName)
        return publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const finalMediaUrl = formData.media_type === 'instagram'
                ? formData.featured_media_url
                : await handleUpload()

            const { error } = await supabase.from('journal_entries').insert([{
                ...formData,
                featured_media_url: finalMediaUrl,
                content: content,
                is_published: true
            }])

            if (error) throw error
            router.push('/journal')
        } catch (err) {
            alert("Error saving post")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto py-20 px-6">
            <form onSubmit={handleSubmit} className="space-y-12">
                <header className="flex justify-between items-end border-b border-zinc-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-serif italic">Compose Story</h1>
                        <p className="text-zinc-400 text-sm mt-2">Create a new article for the editorial journal.</p>
                    </div>
                    <button
                        disabled={loading}
                        className="px-8 py-4 bg-black text-white rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                        Publish Entry
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <input
                            placeholder="Article Title"
                            className="w-full text-5xl font-serif italic outline-none bg-transparent placeholder:text-zinc-200"
                            onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                        />

                        <textarea
                            placeholder="Write a short excerpt..."
                            className="w-full text-lg text-zinc-500 outline-none bg-transparent resize-none h-20"
                            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        />

                        <Editor value={content} onChange={setContent} />
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-8 bg-zinc-50 p-8 rounded-[2.5rem] h-fit">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-4">Media Type</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'image', icon: ImageIcon },
                                    { id: 'video', icon: Video },
                                    { id: 'instagram', icon: Instagram }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, media_type: type.id as any })}
                                        className={`flex-1 py-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.media_type === type.id ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200'}`}
                                    >
                                        <type.icon size={18} />
                                        <span className="text-[9px] font-bold uppercase">{type.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.media_type === 'instagram' ? (
                            <input
                                placeholder="Paste Instagram Reel Link"
                                className="w-full p-4 rounded-2xl border border-zinc-200 text-sm"
                                onChange={(e) => setFormData({ ...formData, featured_media_url: e.target.value })}
                            />
                        ) : (
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept={formData.media_type === 'image' ? "image/*" : "video/*"}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <div className="p-10 border-2 border-dashed border-zinc-200 rounded-[2rem] flex flex-col items-center justify-center text-zinc-400 group-hover:border-black group-hover:text-black transition-all">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-[10px] font-bold uppercase tracking-tight">
                                        {file ? file.name : `Upload ${formData.media_type}`}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Category</label>
                            <select
                                className="w-full p-4 rounded-2xl border border-zinc-200 text-sm bg-white"
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Beauty</option>
                                <option>Tutorial</option>
                                <option>Lifestyle</option>
                                <option>Behind the Scenes</option>
                            </select>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}