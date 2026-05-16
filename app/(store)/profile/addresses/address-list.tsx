"use client"

import { useState } from "react"
import { Plus, Home, Briefcase, MapPin, Trash2, X, Edit3, Check } from "lucide-react"
import { AddressForm } from "@/components/store/address-form"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export function AddressList({ initialAddresses, userId }: { initialAddresses: any[], userId: string }) {
    const [addresses, setAddresses] = useState(initialAddresses)
    const [showForm, setShowForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<any>(null)
    const supabase = createClient()

    const deleteAddress = async (id: string) => {
        const { error } = await supabase.from("user_addresses").delete().eq("id", id).eq("user_id", userId)
        if (error) return toast.error("Could not remove destination")
        setAddresses(addresses.filter(a => a.id !== id))
        toast.success("Removed from registry")
    }

    const handleEdit = (addr: any) => {
        setEditingAddress(addr)
        setShowForm(true)
    }

    if (showForm) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#fc2779]">
                        {editingAddress ? "Update Destination" : "New Registry Entry"}
                    </h2>
                    <button onClick={() => { setShowForm(false); setEditingAddress(null); }} className="p-2 bg-zinc-50 rounded-full">
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
                <AddressForm userId={userId} initialData={editingAddress} onSuccess={() => window.location.reload()} />
            </motion.div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Add New Card */}
            <button
                onClick={() => setShowForm(true)}
                className="w-full p-6 flex items-center gap-5 bg-white border border-dashed border-pink-200 rounded-3xl hover:bg-pink-50/30 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center group-hover:bg-[#fc2779] transition-colors duration-300">
                    <Plus className="w-5 h-5 text-[#fc2779] group-hover:text-white" />
                </div>
                <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Add New Destination</p>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5">Build your shipping list</p>
                </div>
            </button>

            <div className="grid gap-5">
                <AnimatePresence>
                    {addresses.map((addr) => (
                        <motion.div
                            key={addr.id}
                            layout
                            className={`relative p-6 rounded-[2.5rem] bg-white border-2 transition-all duration-300 ${addr.is_default ? 'border-[#fc2779]/20 shadow-xl shadow-pink-100/50' : 'border-zinc-50 hover:border-pink-100'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${addr.label === 'Work' ? 'bg-amber-50' : 'bg-blue-50'
                                        }`}>
                                        {addr.label === 'Work'
                                            ? <Briefcase className="w-5 h-5 text-amber-600" />
                                            : <Home className="w-5 h-5 text-blue-600" />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-900">{addr.label}</p>
                                        {addr.is_default && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-1 h-1 rounded-full bg-[#fc2779]" />
                                                <p className="text-[8px] font-black text-[#fc2779] uppercase tracking-tighter">Primary Choice</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 bg-zinc-50 rounded-full p-1">
                                    <button onClick={() => handleEdit(addr)} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-zinc-400 hover:text-blue-600">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteAddress(addr.id)} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-zinc-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 ml-1">
                                <h3 className="text-base font-serif italic text-zinc-900 tracking-tight">
                                    {addr.full_name}
                                </h3>
                                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                                    {addr.street}, {addr.city},<br />
                                    {addr.state} — {addr.pincode}
                                </p>
                            </div>

                            <div className="mt-6 pt-5 border-t border-zinc-50 flex justify-between items-center">
                                <p className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
                                    +91 {addr.phone}
                                </p>
                                {addr.is_default && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Active</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}