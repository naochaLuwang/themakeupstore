import { createClient } from "@/utils/supabase/server"
import { Mail, Clock, User as UserIcon, Trash2 } from "lucide-react"
import { MessageItem } from "./message-item"

export default async function AdminMessagesPage() {
    const supabase = await createClient()

    const { data: messages, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Customer Inquiries</h1>
                <p className="text-sm text-slate-500">Inbox</p>
            </div>

            <div className="grid gap-4">
                {messages && messages.length > 0 ? (
                    messages.map((msg) => (
                        <MessageItem key={msg.id} msg={msg} />
                    ))
                ) : (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <Mail className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Your inbox is empty</p>
                    </div>
                )}
            </div>
        </div>
    )
}