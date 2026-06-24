"use client"

import { useState } from "react"
import { Plus, MapPin, Trash2, X, Edit3, Home, Briefcase } from "lucide-react"
import { AddressForm } from "@/components/store/address-form"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export function AddressList({ initialAddresses, userId }: { initialAddresses: any[], userId: string }) {
    const [addresses, setAddresses] = useState(initialAddresses)
    const [showForm, setShowForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<any>(null)
    const [deleteTarget, setDeleteTarget] = useState<any>(null)
    const supabase = createClient()

    const closeForm = () => { setShowForm(false); setEditingAddress(null) }

    const handleAddressSaved = (newAddr: any) => {
        if (editingAddress) {
            setAddresses(addresses.map(a => a.id === newAddr.id ? newAddr : a))
        } else {
            setAddresses([newAddr, ...addresses])
        }
        closeForm()
    }

    const deleteAddress = async (id: string) => {
        const { error } = await supabase.from("user_addresses").delete().eq("id", id).eq("user_id", userId)
        if (error) return toast.error("Could not remove address")
        setAddresses(addresses.filter(a => a.id !== id))
        setDeleteTarget(null)
        toast.success("Address removed")
    }

    const setAsDefault = async (id: string) => {
        await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true)
        const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", id).eq("user_id", userId)
        if (error) return toast.error("Could not update default")
        setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })))
        toast.success("Default address updated")
    }

    const labelIcon = (label: string) => {
        if (label === "Work") return <Briefcase className="w-3 h-3" />
        return <Home className="w-3 h-3" />
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add New Address
            </button>

            <AnimatePresence>
                {addresses.map((addr) => (
                    <motion.div
                        key={addr.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900">{addr.full_name}</span>
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                        {labelIcon(addr.label)}
                                        {addr.label}
                                    </span>
                                    {addr.is_default && (
                                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                            DEFAULT
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {addr.street}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {addr.city}, {addr.state} &mdash; {addr.pincode}
                                </p>
                                <p className="text-xs text-gray-400 mt-1.5">{addr.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                            {!addr.is_default && (
                                <button
                                    onClick={() => setAsDefault(addr.id)}
                                    className="text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    Set as Default
                                </button>
                            )}
                            <button
                                onClick={() => { setEditingAddress(addr); setShowForm(true) }}
                                className="text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
                            >
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                                onClick={() => setDeleteTarget(addr)}
                                className="text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> Remove
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {addresses.length === 0 && (
                <div className="flex flex-col items-center py-20 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <MapPin className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No addresses saved</p>
                    <p className="text-xs text-gray-400 mt-1">Add a delivery address for your orders</p>
                </div>
            )}

            {/* Address Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeForm}
                            className="fixed inset-0 bg-black/30 z-[80]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-xl max-h-[85vh] overflow-y-auto max-w-lg mx-auto"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {editingAddress ? "Edit Address" : "Add New Address"}
                                </h3>
                                <button onClick={closeForm} className="p-1 rounded hover:bg-gray-50 transition-colors">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                            <div className="p-5 pb-20">
                                <AddressForm userId={userId} initialData={editingAddress} onSuccess={handleAddressSaved} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteTarget && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteTarget(null)}
                            className="fixed inset-0 bg-black/30 z-[80]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white z-[90] rounded-t-xl max-w-lg mx-auto"
                        >
                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900">Remove Address?</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {deleteTarget.label} &mdash; {deleteTarget.city}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <button
                                        onClick={() => deleteAddress(deleteTarget.id)}
                                        className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                                    >
                                        Remove
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
