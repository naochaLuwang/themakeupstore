import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Script from "next/script"; // IMPORT THIS
import RichTextContent from "../RichTextContent";

export default async function JournalPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: post } = await supabase.from('journal_entries').select('*').eq('id', id).single();

    if (!post) notFound();

    // Helper to force the correct embed format
    const getInstagramEmbedUrl = (url: string) => {
        if (!url.includes('instagram.com')) return url;
        const baseUrl = url.split('?')[0]; // Remove tracking params
        return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}embed`;
    };

    return (
        <article className="bg-white min-h-screen pb-32">
            {/* Official Instagram Script to handle the iframe handshake */}
            <Script src="https://www.instagram.com/embed.js" strategy="afterInteractive" />

            <header className="max-w-4xl mx-auto pt-32 px-6 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-red-500 mb-6 block">
                    {post.category}
                </span>
                <h1 className="text-5xl md:text-7xl font-serif italic mb-8 text-zinc-900">
                    {post.title}
                </h1>
            </header>

            <div className="max-w-4xl mx-auto px-6 mb-20">
                <div className="aspect-[9/16] md:aspect-video max-w-[500px] mx-auto rounded-[2.5rem] overflow-hidden bg-zinc-100 shadow-2xl border border-zinc-100">
                    {post.media_type === 'instagram' ? (
                        <iframe
                            src={getInstagramEmbedUrl(post.featured_media_url)}
                            className="w-full h-full border-none"
                            allowTransparency
                            scrolling="no"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        />
                    ) : (
                        <img src={post.featured_media_url} className="w-full h-full object-cover" alt={post.title} />
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6">
                <RichTextContent jsonContent={post.content} />
            </div>
        </article>
    );
}