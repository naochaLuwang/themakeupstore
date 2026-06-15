"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, Plus, Trash2, MapPin, Clock, Pencil, Check, X, ChevronRight } from "lucide-react"
import { toast } from "sonner"

const DeliveryRadiusConfig = dynamic(
    () => import("@/components/admin/delivery-radius-config"),
    { ssr: false }
)

export default function ShippingAdmin() {
    const supabase = createClient()
    const [zones, setZones] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [newZone, setNewZone] = useState({ name: "", pincode: "", description: "" })

    useEffect(() => { fetchZones() }, [])

    async function fetchZones() {
        const { data, error } = await supabase
            .from('shipping_zones')
            .select('*, shipping_methods(*)')
            .order('pincode', { ascending: true })

        if (error) {
            console.error("Fetch Zones Error:", error)
            toast.error("Failed to load zones")
        }
        if (data) setZones(data)
    }

    // Safely cast to strings to prevent crashes if DB returns integers
    const filteredZones = zones.filter(z =>
        String(z.pincode || "").includes(searchQuery) ||
        String(z.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function addZone() {
        if (!newZone.name || !newZone.pincode) return toast.error("Area Name and Pincode are required")

        const payload = {
            name: newZone.name,
            pincode: String(newZone.pincode),
            description: newZone.description ? newZone.description : null
        }

        const { error } = await supabase.from('shipping_zones').insert([payload])

        if (error) {
            console.error("Add Zone Error:", error)
            toast.error(error.message)
        } else {
            toast.success("Zone created successfully")
            setNewZone({ name: "", pincode: "", description: "" })
            fetchZones()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Shipping Zones</h1>
                    <p className="text-sm text-slate-500">Manage shipping areas, pincodes, and delivery methods</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Filter by Pincode or Area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm text-sm"
                    />
                </div>
            </div>

            <DeliveryRadiusConfig />

            <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 uppercase">Area Name</label>
                        <Input placeholder="e.g. Babupara" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 uppercase">Pincode</label>
                        <Input placeholder="e.g. 795001" value={newZone.pincode} onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                        <Input placeholder="Optional details" value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm" />
                    </div>
                </div>
                <Button type="button" onClick={addZone} className="w-full lg:w-auto rounded-xl px-8 bg-slate-900 h-11 font-bold text-sm tracking-wide">
                    <Plus className="w-5 h-5 mr-2" /> Create Zone
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredZones.map((zone) => (
                    <ZoneCard key={zone.id} zone={zone} refresh={fetchZones} />
                ))}
                {filteredZones.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 font-medium">
                        No shipping zones found. Try a different search.
                    </div>
                )}
            </div>
        </div>
    )
}

function ZoneCard({ zone, refresh }: { zone: any, refresh: () => void }) {
    const supabase = createClient()
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ name: zone.name, pincode: zone.pincode })

    async function handleUpdate() {
        const payload = {
            name: editData.name,
            pincode: String(editData.pincode)
        }
        const { error } = await supabase.from('shipping_zones').update(payload).eq('id', zone.id)

        if (error) {
            console.error("Update Zone Error:", error)
            toast.error(error.message)
        } else {
            toast.success("Zone updated")
            setIsEditing(false)
            refresh()
        }
    }

    async function handleDeleteZone() {
        if (!confirm(`Are you sure? This deletes ${zone.name} and all its rates.`)) return

        const { error: mErr } = await supabase.from('shipping_methods').delete().eq('zone_id', zone.id)
        if (mErr) return toast.error("Failed to clear rates first")

        const { error } = await supabase.from('shipping_zones').delete().eq('id', zone.id)
        if (error) {
            console.error("Delete Zone Error:", error)
            toast.error(error.message)
        } else {
            toast.success("Zone deleted")
            refresh()
        }
    }

    return (
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="flex flex-col lg:flex-row">
                <div className="p-6 lg:w-80 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</span>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500"><Pencil className="w-4 h-4" /></button>
                            <button type="button" onClick={handleDeleteZone} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                            <Input className="h-11 text-sm font-bold" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                            <Input className="h-11 text-sm font-mono" value={editData.pincode} onChange={(e) => setEditData({ ...editData, pincode: e.target.value })} />
                            <div className="flex gap-2">
                                <Button type="button" className="h-10 flex-1 bg-emerald-600" onClick={handleUpdate}>Save</Button>
                                <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => setIsEditing(false)}>X</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="font-bold text-xl text-slate-900 leading-tight">{zone.name}</h3>
                            <div className="flex items-center gap-2 text-sm font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl w-fit shadow-sm">
                                <MapPin className="w-4 h-4 text-emerald-500" /> {zone.pincode}
                            </div>
                            {zone.description && <p className="text-xs text-slate-400 mt-2 italic">{zone.description}</p>}
                        </div>
                    )}
                </div>

                <div className="p-6 flex-1 bg-white">
                    <div className="grid grid-cols-1 gap-3">
                        {zone.shipping_methods?.map((m: any) => (
                            <MethodRow key={m.id} method={m} refresh={refresh} />
                        ))}
                        <AddMethodMini zoneId={zone.id} refresh={refresh} />
                    </div>
                </div>
            </div>
        </Card>
    )
}

function MethodRow({ method, refresh }: { method: any, refresh: () => void }) {
    const supabase = createClient()
    const [isEditing, setIsEditing] = useState(false)
    const [data, setData] = useState({ name: method.name, price: method.price.toString(), time: method.delivery_time_label })

    async function handleUpdate() {
        const payload = {
            name: data.name,
            price: Number(data.price),
            delivery_time_label: data.time
        }

        const { error } = await supabase.from('shipping_methods').update(payload).eq('id', method.id)

        if (error) {
            console.error("Update Method Error:", error)
            toast.error(error.message)
        } else {
            toast.success("Updated")
            setIsEditing(false)
            refresh()
        }
    }

    return (
        <div className={`group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${isEditing ? 'border-slate-900 bg-white ring-4 ring-slate-900/5' : 'bg-slate-50/30 border-slate-100 hover:border-slate-300 hover:bg-white'}`}>
            {isEditing ? (
                <div className="flex flex-col md:flex-row flex-1 gap-3 w-full">
                    <div className="flex-[2]">
                        <Input className="h-11 text-sm font-bold" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div className="flex-1">
                        <Input type="number" className="h-11 text-sm" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
                    </div>
                    <div className="flex-1">
                        <Input className="h-11 text-sm" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" onClick={handleUpdate} className="h-11 w-11 bg-emerald-600 p-0"><Check className="w-5 h-5" /></Button>
                        <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="h-11 w-11 p-0"><X className="w-5 h-5" /></Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex items-center gap-6">
                        <div className="min-w-[140px]">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Method</p>
                            <p className="text-sm font-bold text-slate-900">{method.name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                            <span className="text-base font-bold text-emerald-600">₹{method.price}</span>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Timing</p>
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                                <Clock className="w-4 h-4 text-slate-300" /> {method.delivery_time_label}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => setIsEditing(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-400 shadow-sm"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={async () => { if (confirm("Delete rate?")) { await supabase.from('shipping_methods').delete().eq('id', method.id); refresh(); } }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-red-500 hover:border-red-200 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </>
            )}
        </div>
    )
}
function AddMethodMini({ zoneId, refresh }: { zoneId: string, refresh: () => void }) {
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [data, setData] = useState({ name: "", price: "", time: "" })

    async function handleAdd() {
        if (!data.name || !data.price) return toast.error("Name and Price required")

        const payload = {
            zone_id: zoneId,
            name: data.name,
            price: Number(data.price),
            delivery_time_label: data.time || "2-3 Days"
        }

        const { error } = await supabase.from('shipping_methods').insert([payload])

        if (error) {
            console.error("Add Method Error:", error)
            toast.error(error.message)
        } else {
            toast.success("Shipping rate added successfully")
            setData({ name: "", price: "", time: "" })
            setOpen(false)
            refresh()
        }
    }

    // --- CLOSED STATE ---
    if (!open) return (
        <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-16 w-full border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all bg-white group shadow-sm"
        >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Add New Shipping Rate</span>
        </button>
    )

    // --- OPEN STATE ---
    return (
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 animate-in fade-in slide-in-from-top-2 duration-300 w-full space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Configure New Rate</h4>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Service Name</label>
                    <Input
                        autoFocus
                        placeholder="e.g. Express Home Delivery"
                        className="h-11 text-sm bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-emerald-500 w-full"
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                    />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Price (₹)</label>
                    <Input
                        placeholder="50"
                        type="number"
                        className="h-11 text-sm bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-emerald-500 w-full"
                        value={data.price}
                        onChange={(e) => setData({ ...data, price: e.target.value })}
                    />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Estimated Time</label>
                    <Input
                        placeholder="e.g. 24 Hours"
                        className="h-11 text-sm bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-emerald-500 w-full"
                        value={data.time}
                        onChange={(e) => setData({ ...data, time: e.target.value })}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    variant="outline"
                    className="h-10 px-6 text-xs font-bold uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={handleAdd}
                    className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                    <Check className="w-4 h-4 mr-2" /> Save Rate
                </Button>
            </div>

        </div>
    )
}