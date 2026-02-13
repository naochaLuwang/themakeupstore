// "use client"

// import { useState } from "react"
// import { Edit2, Trash2 } from "lucide-react"
// import { createClient } from "@/utils/supabase/client"
// import { useRouter } from "next/navigation"
// import { toast } from "sonner"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { AddressForm } from "@/components/store/address-form"

// export function AddressActions({ address, userId }: { address: any, userId: string }) {
//     const [isEditOpen, setIsEditOpen] = useState(false)
//     const supabase = createClient()
//     const router = useRouter()

//     const handleDelete = async () => {
//         if (!confirm("Remove this destination?")) return
//         const { error } = await supabase.from("user_addresses").delete().eq("id", address.id)
//         if (error) toast.error("Delete failed")
//         else {
//             toast.success("Removed")
//             router.refresh()
//         }
//     }

//     return (
//         <>
//             <div className="absolute top-6 right-6 flex gap-1">
//                 <button onClick={() => setIsEditOpen(true)} className="p-2 text-zinc-300 hover:text-slate-900 transition-colors">
//                     <Edit2 className="w-3.5 h-3.5" />
//                 </button>
//                 <button onClick={handleDelete} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
//                     <Trash2 className="w-3.5 h-3.5" />
//                 </button>
//             </div>

//             <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
//                 <DialogContent className="max-w-lg rounded-[2rem]">
//                     <DialogHeader>
//                         <DialogTitle className="text-[10px] font-black uppercase tracking-widest">Edit Destination</DialogTitle>
//                     </DialogHeader>
//                     <AddressForm
//                         userId={userId}
//                         initialData={address}
//                         onSuccess={() => {
//                             setIsEditOpen(false)
//                             router.refresh()
//                         }}
//                     />
//                 </DialogContent>
//             </Dialog>
//         </>
//     )
// }


"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddressForm } from "@/components/store/address-form"

// This now acts as a Logic Wrapper or can be integrated directly into your CheckoutClient
export function useAddressManager(userId: string) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [addressToEdit, setAddressToEdit] = useState<any>(null)
    const supabase = createClient()
    const router = useRouter()

    const openEdit = (address: any) => {
        setAddressToEdit(address)
        setIsEditOpen(true)
    }

    const handleDelete = async (addressId: string) => {
        // UI Psychology: Confirmations should be rare but meaningful
        if (!confirm("Permanently remove this destination?")) return

        const { error } = await supabase.from("user_addresses").delete().eq("id", addressId)

        if (error) {
            toast.error("Operation failed")
        } else {
            toast.success("Destination purged")
            router.refresh()
        }
    }

    const EditDialog = () => (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-[95vw] md:max-w-[440px] rounded-[3rem] p-10 border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-[10px] font-black uppercase tracking-[0.3em]">
                        Update Destination
                    </DialogTitle>
                </DialogHeader>
                {addressToEdit && (
                    <AddressForm
                        userId={userId}
                        initialData={addressToEdit}
                        onSuccess={() => {
                            setIsEditOpen(false)
                            router.refresh()
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    )

    return { openEdit, handleDelete, EditDialog }
}