

// "use client"

// import { useState, useEffect } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent } from "@/components/ui/card"
// import { Search, Plus, Trash2, MapPin, Clock, Pencil, Check, X, ChevronRight } from "lucide-react"
// import { toast } from "sonner"

// export default function ShippingAdmin() {
//     const supabase = createClient()
//     const [zones, setZones] = useState<any[]>([])
//     const [searchQuery, setSearchQuery] = useState("")
//     const [newZone, setNewZone] = useState({ name: "", pincode: "", description: "" })

//     useEffect(() => { fetchZones() }, [])

//     async function fetchZones() {
//         const { data } = await supabase
//             .from('shipping_zones')
//             .select('*, shipping_methods(*)')
//             .order('pincode', { ascending: true })
//         if (data) setZones(data)
//     }

//     const filteredZones = zones.filter(z =>
//         z.pincode.includes(searchQuery) || z.name.toLowerCase().includes(searchQuery.toLowerCase())
//     )

//     async function addZone() {
//         if (!newZone.name || !newZone.pincode) return toast.error("Required fields missing")
//         const { error } = await supabase.from('shipping_zones').insert([newZone])
//         if (error) toast.error("Error creating zone")
//         else {
//             toast.success("Zone created")
//             setNewZone({ name: "", pincode: "", description: "" })
//             fetchZones()
//         }
//     }

//     return (
//         <div className="container mx-auto py-6 max-w-5xl px-4 space-y-6 bg-[#FAFAFA] min-h-screen">
//             {/* Header & Quick Search */}
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                 <div>
//                     <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
//                         Logistics <ChevronRight className="w-4 h-4 text-slate-300" /> <span className="text-slate-500">Master Data</span>
//                     </h1>
//                 </div>
//                 <div className="relative w-full md:w-64">
//                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                     <Input
//                         placeholder="Filter by Pincode..."
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                         className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm"
//                     />
//                 </div>
//             </div>

//             {/* Compact Creator Bar */}
//             <div className="bg-white border border-slate-200 p-2 rounded-2xl flex flex-wrap md:flex-nowrap gap-2 items-center shadow-sm">
//                 <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 p-1">
//                     <Input placeholder="Area Name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs font-bold" />
//                     <Input placeholder="Pincode" value={newZone.pincode} onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs font-bold" />
//                     <Input placeholder="Description (Optional)" value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs hidden md:block" />
//                 </div>
//                 <Button onClick={addZone} size="sm" className="rounded-xl px-4 bg-slate-900 h-9 font-bold text-[10px] uppercase tracking-widest">
//                     <Plus className="w-4 h-4 mr-2" /> Add Zone
//                 </Button>
//             </div>

//             {/* List View */}
//             <div className="space-y-3">
//                 {filteredZones.map((zone) => (
//                     <ZoneCard key={zone.id} zone={zone} refresh={fetchZones} />
//                 ))}
//             </div>
//         </div>
//     )
// }

// function ZoneCard({ zone, refresh }: { zone: any, refresh: () => void }) {
//     const supabase = createClient()
//     const [isEditing, setIsEditing] = useState(false)
//     const [editData, setEditData] = useState({ name: zone.name, pincode: zone.pincode })

//     async function handleUpdate() {
//         await supabase.from('shipping_zones').update(editData).eq('id', zone.id)
//         setIsEditing(false)
//         refresh()
//     }

//     return (
//         <Card className="border-slate-200 shadow-none rounded-2xl overflow-hidden bg-white">
//             <div className="flex flex-col lg:flex-row">
//                 {/* Zone Info Column */}
//                 <div className="p-4 lg:w-1/3 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100">
//                     <div className="flex items-center justify-between mb-2">
//                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone Config</span>
//                         <div className="flex items-center gap-1">
//                             <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"><Pencil className="w-3 h-3" /></button>
//                             <button onClick={async () => { if (confirm("Delete zone?")) { await supabase.from('shipping_zones').delete().eq('id', zone.id); refresh(); } }} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-md transition-colors"><Trash2 className="w-3 h-3" /></button>
//                         </div>
//                     </div>

//                     {isEditing ? (
//                         <div className="space-y-2 animate-in fade-in zoom-in duration-200">
//                             <Input size={30} className="h-8 text-xs" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
//                             <Input size={30} className="h-8 text-xs" value={editData.pincode} onChange={(e) => setEditData({ ...editData, pincode: e.target.value })} />
//                             <div className="flex gap-1 pt-1">
//                                 <Button size="sm" className="h-7 text-[9px] flex-1 bg-emerald-600" onClick={handleUpdate}>Update</Button>
//                                 <Button size="sm" variant="outline" className="h-7 text-[9px] flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="space-y-1">
//                             <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 italic tracking-tight"><MapPin className="w-3 h-3 text-slate-400" />{zone.name}</h3>
//                             <p className="text-[10px] font-mono text-slate-500 bg-white border px-2 py-0.5 rounded w-fit">Pincode: {zone.pincode}</p>
//                         </div>
//                     )}
//                 </div>

//                 {/* Methods Column */}
//                 <div className="p-4 flex-1">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                         {zone.shipping_methods.map((m: any) => (
//                             <MethodRow key={m.id} method={m} refresh={refresh} />
//                         ))}
//                         <AddMethodMini zoneId={zone.id} refresh={refresh} />
//                     </div>
//                 </div>
//             </div>
//         </Card>
//     )
// }

// function MethodRow({ method, refresh }: { method: any, refresh: () => void }) {
//     const supabase = createClient()
//     const [isEditing, setIsEditing] = useState(false)
//     const [data, setData] = useState({ name: method.name, price: method.price.toString(), time: method.delivery_time_label })

//     async function handleUpdate() {
//         await supabase.from('shipping_methods').update({ name: data.name, price: parseFloat(data.price), delivery_time_label: data.time }).eq('id', method.id)
//         setIsEditing(false)
//         refresh()
//     }

//     return (
//         <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isEditing ? 'border-slate-900 bg-white ring-2 ring-slate-900/5' : 'bg-slate-50/30 border-slate-100 hover:border-slate-200'}`}>
//             {isEditing ? (
//                 <div className="flex flex-1 items-center gap-2 overflow-hidden">
//                     <Input className="h-7 text-[10px] w-20 px-1.5" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
//                     <Input className="h-7 text-[10px] w-12 px-1.5" type="number" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
//                     <Input className="h-7 text-[10px] flex-1 px-1.5" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
//                     <button onClick={handleUpdate} className="text-emerald-500 p-1"><Check className="w-3.5 h-3.5" /></button>
//                     <button onClick={() => setIsEditing(false)} className="text-slate-400 p-1"><X className="w-3.5 h-3.5" /></button>
//                 </div>
//             ) : (
//                 <>
//                     <div className="flex-1 flex items-center gap-3">
//                         <p className="text-[11px] font-black text-slate-900 uppercase">{method.name}</p>
//                         <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">₹{method.price}</span>
//                         <div className="hidden sm:flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
//                             <Clock className="w-2.5 h-2.5" /> {method.delivery_time_label}
//                         </div>
//                     </div>
//                     <div className="flex gap-1 ml-2">
//                         <button onClick={() => setIsEditing(true)} className="p-1 text-slate-300 hover:text-slate-900"><Pencil className="w-3 h-3" /></button>
//                         <button onClick={async () => { if (confirm("Delete rate?")) { await supabase.from('shipping_methods').delete().eq('id', method.id); refresh(); } }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
//                     </div>
//                 </>
//             )}
//         </div>
//     )
// }

// function AddMethodMini({ zoneId, refresh }: { zoneId: string, refresh: () => void }) {
//     const supabase = createClient()
//     const [open, setOpen] = useState(false)
//     const [data, setData] = useState({ name: "", price: "", time: "" })

//     async function handleAdd() {
//         if (!data.name || !data.price) return setOpen(false)
//         await supabase.from('shipping_methods').insert([{ zone_id: zoneId, name: data.name, price: parseFloat(data.price), delivery_time_label: data.time || "3-5 Days" }])
//         setData({ name: "", price: "", time: "" })
//         setOpen(false)
//         refresh()
//     }

//     if (!open) return (
//         <button onClick={() => setOpen(true)} className="h-[42px] border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:bg-white hover:border-slate-300 transition-all">
//             <Plus className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase tracking-widest">Add Rate</span>
//         </button>
//     )

//     return (
//         <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl animate-in slide-in-from-right-2 duration-200">
//             <Input autoFocus placeholder="Name" className="h-8 text-[10px] bg-white/10 border-none text-white w-16 px-1.5" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
//             <Input placeholder="₹" type="number" className="h-8 text-[10px] bg-white/10 border-none text-white w-12 px-1.5" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
//             <Input placeholder="ETA" className="h-8 text-[10px] bg-white/10 border-none text-white flex-1 px-1.5" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
//             <button onClick={handleAdd} className="p-2 text-white"><Check className="w-4 h-4" /></button>
//             <button onClick={() => setOpen(false)} className="p-2 text-white/50"><X className="w-4 h-4" /></button>
//         </div>
//     )
// }


"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, Plus, Trash2, MapPin, Clock, Pencil, Check, X, ChevronRight } from "lucide-react"
import { toast } from "sonner"

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

        if (error) toast.error("Failed to load zones")
        if (data) setZones(data)
    }

    const filteredZones = zones.filter(z =>
        z.pincode.includes(searchQuery) || z.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function addZone() {
        if (!newZone.name || !newZone.pincode) return toast.error("Area Name and Pincode are required")
        const { error } = await supabase.from('shipping_zones').insert([newZone])

        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Zone created successfully")
            setNewZone({ name: "", pincode: "", description: "" })
            fetchZones()
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-6xl px-4 space-y-8 bg-[#FAFAFA] min-h-screen">
            {/* Header & Quick Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        Logistics <ChevronRight className="w-5 h-5 text-slate-300" /> <span className="text-slate-500">Master Data</span>
                    </h1>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Filter by Pincode or Area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-slate-200 bg-white shadow-sm text-base"
                    />
                </div>
            </div>

            {/* Main Creator Bar */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 items-end shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Area Name</label>
                        <Input placeholder="e.g. Babupara" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Pincode</label>
                        <Input placeholder="e.g. 795001" value={newZone.pincode} onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                        <Input placeholder="Optional details" value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} className="h-11 border-slate-200 bg-slate-50 rounded-xl text-sm" />
                    </div>
                </div>
                <Button onClick={addZone} className="w-full lg:w-auto rounded-xl px-8 bg-slate-900 h-11 font-bold text-sm tracking-wide">
                    <Plus className="w-5 h-5 mr-2" /> Create Zone
                </Button>
            </div>

            {/* List View */}
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
        const { error } = await supabase.from('shipping_zones').update(editData).eq('id', zone.id)
        if (error) toast.error(error.message)
        else {
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
        if (error) toast.error(error.message)
        else {
            toast.success("Zone deleted")
            refresh()
        }
    }

    return (
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="flex flex-col lg:flex-row">
                {/* Zone Header Info */}
                <div className="p-6 lg:w-80 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-500"><Pencil className="w-4 h-4" /></button>
                            <button onClick={handleDeleteZone} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                            <Input className="h-11 text-sm font-bold" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                            <Input className="h-11 text-sm font-mono" value={editData.pincode} onChange={(e) => setEditData({ ...editData, pincode: e.target.value })} />
                            <div className="flex gap-2">
                                <Button className="h-10 flex-1 bg-emerald-600" onClick={handleUpdate}>Save</Button>
                                <Button variant="outline" className="h-10 flex-1" onClick={() => setIsEditing(false)}>X</Button>
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

                {/* Rates List */}
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
        const { error } = await supabase.from('shipping_methods').update({
            name: data.name,
            price: parseFloat(data.price),
            delivery_time_label: data.time
        }).eq('id', method.id)
        if (error) toast.error(error.message)
        else {
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
                        <Button onClick={handleUpdate} className="h-11 w-11 bg-emerald-600 p-0"><Check className="w-5 h-5" /></Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" className="h-11 w-11 p-0"><X className="w-5 h-5" /></Button>
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
                        <button onClick={() => setIsEditing(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-400 shadow-sm"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if (confirm("Delete rate?")) { await supabase.from('shipping_methods').delete().eq('id', method.id); refresh(); } }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-red-500 hover:border-red-200 shadow-sm"><Trash2 className="w-4 h-4" /></button>
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
        const { error } = await supabase.from('shipping_methods').insert([{
            zone_id: zoneId,
            name: data.name,
            price: parseFloat(data.price),
            delivery_time_label: data.time || "2-3 Days"
        }])
        if (error) toast.error(error.message)
        else {
            toast.success("Rate added")
            setData({ name: "", price: "", time: "" })
            setOpen(false)
            refresh()
        }
    }

    if (!open) return (
        <button onClick={() => setOpen(true)} className="h-20 w-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all bg-white group">
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-[0.1em]">Add New Shipping Rate</span>
        </button>
    )

    return (
        <div className="flex flex-col lg:flex-row items-end gap-4 p-5 bg-slate-900 rounded-2xl animate-in slide-in-from-top-4 duration-300 w-full shadow-2xl">
            <div className="flex-[2] w-full space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
                <Input autoFocus placeholder="e.g. Express Home Delivery" className="h-12 text-sm bg-white/10 border-transparent text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 w-full" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
            </div>
            <div className="flex-1 w-full space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                <Input placeholder="50" type="number" className="h-12 text-sm bg-white/10 border-transparent text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 w-full" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
            </div>
            <div className="flex-1 w-full space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estimated Time</label>
                <Input placeholder="e.g. 24 Hours" className="h-12 text-sm bg-white/10 border-transparent text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 w-full" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
                <Button onClick={handleAdd} className="h-12 flex-1 lg:w-14 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 p-0"><Check className="w-6 h-6" /></Button>
                <Button onClick={() => setOpen(false)} variant="ghost" className="h-12 flex-1 lg:w-14 text-slate-400 hover:text-white hover:bg-white/10 p-0"><X className="w-6 h-6" /></Button>
            </div>
        </div>
    )
}