"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Trash2, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import { getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner } from "@/app/actions/delivery-partners"

export default function DeliveryPartnersPage() {
    const [partners, setPartners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [newName, setNewName] = useState("")

    useEffect(() => { fetchPartners() }, [])

    async function fetchPartners() {
        setLoading(true)
        try {
            const data = await getDeliveryPartners()
            setPartners(data || [])
        } catch (err: any) {
            toast.error("Failed to load delivery partners")
        }
        setLoading(false)
    }

    const filtered = partners.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function handleAdd() {
        if (!newName.trim()) return toast.error("Name is required")
        try {
            await createDeliveryPartner({ name: newName.trim() })
            toast.success("Delivery partner added")
            setNewName("")
            fetchPartners()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Delivery Partners</h1>
                    <p className="text-sm text-slate-500">Manage courier and delivery service providers</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search partners..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm text-sm"
                    />
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase">Partner Name</label>
                    <Input
                        placeholder="e.g. BlueDart, DTDC, Delhivery"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium"
                    />
                </div>
                <Button type="button" onClick={handleAdd} className="w-full sm:w-auto rounded-xl px-8 bg-slate-900 h-11 font-bold text-sm tracking-wide">
                    <Plus className="w-5 h-5 mr-2" /> Add Partner
                </Button>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="border-b border-slate-100">
                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-20 text-center text-slate-400 font-medium">
                                    {loading ? "Loading..." : "No delivery partners found"}
                                </td>
                            </tr>
                        )}
                        {filtered.map((partner) => (
                            <PartnerRow key={partner.id} partner={partner} refresh={fetchPartners} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function PartnerRow({ partner, refresh }: { partner: any; refresh: () => void }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(partner.name)
    const [isActive, setIsActive] = useState(partner.is_active)

    async function handleUpdate() {
        if (!name.trim()) return toast.error("Name is required")
        try {
            await updateDeliveryPartner(partner.id, { name: name.trim(), is_active: isActive })
            toast.success("Updated")
            setIsEditing(false)
            refresh()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    async function handleDelete() {
        if (!confirm(`Delete "${partner.name}"?`)) return
        try {
            await deleteDeliveryPartner(partner.id)
            toast.success("Deleted")
            refresh()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    return (
        <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-6">
                {isEditing ? (
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-9 w-64 text-sm font-medium rounded-lg"
                    />
                ) : (
                    <span className="text-sm font-bold text-slate-900">{partner.name}</span>
                )}
            </td>
            <td className="py-4 px-6">
                {isEditing ? (
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                    >
                        {isActive ? "Active" : "Inactive"}
                    </button>
                ) : (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        partner.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                        {partner.is_active ? "Active" : "Inactive"}
                    </span>
                )}
            </td>
            <td className="py-4 px-6 text-right">
                <div className="flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={handleUpdate} className="rounded-lg h-9 w-9 border border-slate-200 bg-white flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all text-slate-400">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setIsEditing(false); setName(partner.name); setIsActive(partner.is_active) }} className="rounded-lg h-9 w-9 border border-slate-200 bg-white flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="rounded-lg h-9 w-9 border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={handleDelete} className="rounded-lg h-9 w-9 border border-slate-200 bg-white flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-slate-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    )
}
