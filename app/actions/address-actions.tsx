"use client"

import { useState } from "react"
import { Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddressForm } from "@/components/store/address-form"

export function AddressActions({ address, userId }: { address: any, userId: string }) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm("Remove this destination?")) return
        const { error } = await supabase.from("user_addresses").delete().eq("id", address.id)
        if (error) toast.error("Delete failed")
        else {
            toast.success("Removed")
            router.refresh()
        }
    }

    return (
        <>
            <div className="absolute top-6 right-6 flex gap-1">
                <button onClick={() => setIsEditOpen(true)} className="p-2 text-zinc-300 hover:text-slate-900 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-[10px] font-black uppercase tracking-widest">Edit Destination</DialogTitle>
                    </DialogHeader>
                    <AddressForm
                        userId={userId}
                        initialData={address}
                        onSuccess={() => {
                            setIsEditOpen(false)
                            router.refresh()
                        }}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}