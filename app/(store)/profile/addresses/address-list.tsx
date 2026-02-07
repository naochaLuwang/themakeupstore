"use client"

import { useState } from "react"
import { Plus, Home, Briefcase, MapPin, Trash2, CheckCircle2, X } from "lucide-react"
import { AddressForm } from "@/components/store/address-form" // This is your existing component
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export function AddressList({ initialAddresses, userId }: { initialAddresses: any[], userId: string }) {
    const [addresses, setAddresses] = useState(initialAddresses)
    const [showForm, setShowForm] = useState(false)
    const supabase = createClient()

    const deleteAddress = async (id: string) => {
        const { error } = await supabase.from("user_addresses").delete().eq("id", id)
        if (error) return toast.error("Could not delete address")
        setAddresses(addresses.filter(a => a.id !== id))
        toast.success("Address removed")
    }

    if (showForm) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Add New Destination</h2>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>
                <AddressForm 
                    userId={userId} 
                    onSuccess={(newAddr) => {
                        // Simple refresh logic: if new is default, move it to top
                        window.location.reload() 
                    }} 
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <button 
                onClick={() => setShowForm(true)}
                className="w-full group flex items-center justify-center gap-4 p-8 border-2 border-dashed border-zinc-100 rounded-[2.5rem] hover:border-zinc-300 hover:bg-zinc-50/50 transition-all"
            >
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">Add New Address</span>
            </button>

            <div className="grid gap-4">
                {addresses.map((addr) => (
                    <div 
                        key={addr.id}
                        className={`group relative p-6 rounded-[2rem] border-2 transition-all ${
                            addr.is_default ? 'border-zinc-900 bg-white shadow-xl shadow-zinc-100' : 'border-zinc-100 hover:border-zinc-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${addr.is_default ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-400'}`}>
                                    {addr.label === 'Work' ? <Briefcase className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">{addr.label}</p>
                                    {addr.is_default && <p className="text-[8px] font-bold text-primary uppercase">Primary Destination</p>}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => deleteAddress(addr.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-black uppercase tracking-tight">{addr.full_name}</p>
                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed uppercase tracking-tight">
                                {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-bold pt-2">{addr.phone}</p>
                        </div>

                        {addr.is_default && (
                            <div className="absolute top-6 right-6">
                                <CheckCircle2 className="w-5 h-5 text-zinc-900" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {addresses.length === 0 && (
                <div className="py-20 text-center">
                    <MapPin className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No addresses registered yet</p>
                </div>
            )}
        </div>
    )
}