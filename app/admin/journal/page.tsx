"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { Plus, Pencil, Trash2, ExternalLink, Search, Video, Instagram, ImageIcon, Loader2 } from "lucide-react"

export default function JournalDashboard() {
    const [posts, setPosts] = useState<any[]>([])
    const [filteredPosts, setFilteredPosts] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchPosts()
    }, [])

    useEffect(() => {
        const filtered = posts.filter(post =>
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredPosts(filtered)
    }, [searchQuery, posts])

    const fetchPosts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('journal_entries')
            .select('*')
            .order('created_at', { ascending: false })
        setPosts(data || [])
        setFilteredPosts(data || [])
        setLoading(false)
    }

    const deletePost = async (id: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return
        const { error } = await supabase.from('journal_entries').delete().eq('id', id)
        if (!error) fetchPosts()
    }

    return (
        <div className="max-w-7xl mx-auto py-20 px-6 font-display">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-serif italic">Journal Archive</h1>
                    <p className="text-zinc-400 text-sm mt-1">Manage your editorial content and stories.</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* SEARCH BAR */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search stories..."
                            className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-full text-xs outline-none focus:border-zinc-300 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Link
                        href="/admin/journal/new"
                        className="bg-black text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shrink-0"
                    >
                        <Plus size={14} /> New Story
                    </Link>
                </div>
            </header>

            <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Post</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Category</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="p-20 text-center text-zinc-400">
                                    <Loader2 className="animate-spin mx-auto mb-2" />
                                    Loading Archive...
                                </td>
                            </tr>
                        ) : filteredPosts.map((post) => (
                            <tr key={post.id} className="hover:bg-zinc-50/50 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        {/* THUMBNAIL PREVIEW */}
                                        <div className="w-12 h-16 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 relative">
                                            {post.media_type === 'image' && <img src={post.featured_media_url} className="w-full h-full object-cover" />}
                                            {post.media_type === 'video' && <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Video size={16} className="text-white" /></div>}
                                            {post.media_type === 'instagram' && <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"><Instagram size={16} className="text-white" /></div>}
                                        </div>
                                        <div>
                                            <p className="font-serif italic text-lg text-zinc-900 leading-tight">{post.title}</p>
                                            <p className="text-xs text-zinc-400 mt-1">/{post.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full text-zinc-600">
                                        {post.category}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/journal/${post.slug}`}
                                            target="_blank"
                                            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all text-zinc-400 hover:text-black"
                                            title="View Live"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>

                                        {/* EDIT BUTTON (You will need to create the edit page at /admin/journal/edit/[id]) */}
                                        <Link
                                            href={`/admin/journal/edit/${post.id}`}
                                            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all text-zinc-400 hover:text-black"
                                            title="Edit Story"
                                        >
                                            <Pencil size={16} />
                                        </Link>

                                        <button
                                            onClick={() => deletePost(post.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!loading && filteredPosts.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-zinc-400 italic font-serif text-xl">No stories found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}