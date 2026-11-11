"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"

interface LegalFormProps {
    settingKey: string
    title: string
    initialContent: string
}

export function LegalForm({ settingKey, title, initialContent }: LegalFormProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState(initialContent)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase
            .from("site_settings")
            .upsert({
                key: settingKey,
                content: content,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (error) {
            toast.error(`Failed to update ${title}`)
        } else {
            toast.success(`${title} updated successfully`)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold tracking-normal text-slate-500">{title}</h3>
                <span className="text-xs text-slate-400 font-mono hidden md:block">{settingKey}</span>
            </div>

            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter ${title.toLowerCase()} here...`}
                className="min-h-[500px] rounded-xl border-slate-200 focus:ring-slate-900 leading-relaxed text-sm p-5 resize-none"
            />

            <div className="flex justify-end pt-2">
                <Button
                    disabled={loading || content === initialContent}
                    className="bg-slate-900 text-white px-8 h-12 rounded-xl font-semibold tracking-normal text-xs hover:bg-black transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 stroke-[1.5]" /> : <Save className="w-4 h-4 mr-2 stroke-[1.5]" />}
                    Save {title}
                </Button>
            </div>
        </form>
    )
}