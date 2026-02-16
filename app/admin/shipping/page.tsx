// "use client"

// import { useState, useEffect } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Plus, Trash2, MapPin, Truck, Clock } from "lucide-react"
// import { toast } from "sonner"

// export default function ShippingAdmin() {
//     const supabase = createClient()
//     const [zones, setZones] = useState<any[]>([])
//     const [newZone, setNewZone] = useState({ name: "", pincode: "", description: "" })

//     useEffect(() => { fetchZones() }, [])

//     async function fetchZones() {
//         const { data } = await supabase
//             .from('shipping_zones')
//             .select('*, shipping_methods(*)')
//             .order('created_at', { ascending: false })
//         if (data) setZones(data)
//     }

//     async function addZone() {
//         if (!newZone.name || !newZone.pincode) {
//             return toast.error("Name and Pincode are required")
//         }
//         const { error } = await supabase
//             .from('shipping_zones')
//             .insert([newZone])

//         if (error) toast.error("Error creating zone")
//         else {
//             toast.success("Zone created successfully")
//             setNewZone({ name: "", pincode: "", description: "" })
//             fetchZones()
//         }
//     }

//     return (
//         <div className="container mx-auto py-10 space-y-8">
//             <h1 className="text-3xl font-bold tracking-tight">Shipping & Pincode Logic</h1>

//             <Card className="bg-slate-50/50">
//                 <CardHeader><CardTitle className="text-lg">Create Pincode Zone</CardTitle></CardHeader>
//                 <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                     <Input
//                         placeholder="Area Name (e.g. Porompat)"
//                         value={newZone.name}
//                         onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
//                     />
//                     <Input
//                         placeholder="Pincode (e.g. 795001)"
//                         value={newZone.pincode}
//                         onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })}
//                     />
//                     <Input
//                         placeholder="Short description"
//                         value={newZone.description}
//                         onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
//                     />
//                     <Button onClick={addZone} className="w-full">Create Zone</Button>
//                 </CardContent>
//             </Card>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                 {zones.map((zone) => (
//                     <ZoneCard key={zone.id} zone={zone} refresh={fetchZones} />
//                 ))}
//             </div>
//         </div>
//     )
// }

// function ZoneCard({ zone, refresh }: { zone: any, refresh: () => void }) {
//     const supabase = createClient()
//     const [method, setMethod] = useState({ name: "", price: "", time: "" })
//     const [isDeleting, setIsDeleting] = useState(false)

//     async function deleteZone() {
//         const confirmDelete = window.confirm(`Are you sure you want to delete the zone "${zone.name}" and all its shipping rates?`);
//         if (!confirmDelete) return;

//         setIsDeleting(true);
//         const { error } = await supabase
//             .from('shipping_zones')
//             .delete()
//             .eq('id', zone.id);

//         if (error) {
//             toast.error("Error deleting zone: " + error.message);
//             setIsDeleting(false);
//         } else {
//             toast.success("Zone deleted successfully");
//             refresh(); // Refresh the list in the parent
//         }
//     }

//     async function addMethod() {
//         if (!method.name || !method.price) return toast.error("Fill method details")
//         const { error } = await supabase
//             .from('shipping_methods')
//             .insert([{
//                 zone_id: zone.id,
//                 name: method.name,
//                 price: parseFloat(method.price),
//                 delivery_time_label: method.time || "3-5 Days"
//             }])

//         if (error) toast.error("Error adding method")
//         else {
//             toast.success("Shipping rate added")
//             setMethod({ name: "", price: "", time: "" })
//             refresh()
//         }
//     }

//     return (
//         <Card className="overflow-hidden border-2">
//             <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
//                 <div>
//                     <CardTitle className="text-md flex items-center gap-2">
//                         <MapPin className="w-4 h-4 text-primary" /> {zone.name}
//                     </CardTitle>
//                     <p className="text-xs text-muted-foreground font-mono mt-1">Pincode: {zone.pincode}</p>
//                 </div>

//                 <Button
//                     variant="ghost"
//                     size="icon"
//                     className="text-slate-400 hover:text-red-600 hover:bg-red-50"
//                     onClick={deleteZone}
//                 >
//                     <Trash2 className="w-4 h-4" />
//                 </Button>
//             </CardHeader>
//             <CardContent className="pt-6 space-y-4">
//                 {zone.shipping_methods.map((m: any) => (
//                     <div key={m.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border">
//                         <div className="space-y-1">
//                             <p className="text-sm font-bold">{m.name} — ₹{m.price}</p>
//                             <p className="text-[10px] flex items-center gap-1 text-slate-500 uppercase">
//                                 <Clock className="w-3 h-3" /> {m.delivery_time_label}
//                             </p>
//                         </div>
//                         <Button variant="ghost" size="icon" onClick={async () => {
//                             await supabase.from('shipping_methods').delete().eq('id', m.id);
//                             refresh();
//                         }}>
//                             <Trash2 className="w-4 h-4 text-destructive" />
//                         </Button>
//                     </div>
//                 ))}

//                 <div className="pt-4 border-t space-y-3">
//                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add New Rate</p>
//                     <div className="grid grid-cols-2 gap-2">
//                         <Input placeholder="Method (e.g. Express)" value={method.name} onChange={(e) => setMethod({ ...method, name: e.target.value })} className="h-9" />
//                         <Input placeholder="Price" type="number" value={method.price} onChange={(e) => setMethod({ ...method, price: e.target.value })} className="h-9" />
//                         <Input placeholder="Time (e.g. 1-2 Days)" value={method.time} onChange={(e) => setMethod({ ...method, time: e.target.value })} className="col-span-2 h-9" />
//                     </div>
//                     <Button variant="outline" size="sm" onClick={addMethod} className="w-full">Add Shipping Rate</Button>
//                 </div>
//             </CardContent>
//         </Card>
//     )
// }

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Trash2, MapPin, Clock, Pencil, Check, X, ChevronRight } from "lucide-react"
import { toast } from "sonner"

export default function ShippingAdmin() {
    const supabase = createClient()
    const [zones, setZones] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [newZone, setNewZone] = useState({ name: "", pincode: "", description: "" })

    useEffect(() => { fetchZones() }, [])

    async function fetchZones() {
        const { data } = await supabase
            .from('shipping_zones')
            .select('*, shipping_methods(*)')
            .order('pincode', { ascending: true })
        if (data) setZones(data)
    }

    const filteredZones = zones.filter(z =>
        z.pincode.includes(searchQuery) || z.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function addZone() {
        if (!newZone.name || !newZone.pincode) return toast.error("Required fields missing")
        const { error } = await supabase.from('shipping_zones').insert([newZone])
        if (error) toast.error("Error creating zone")
        else {
            toast.success("Zone created")
            setNewZone({ name: "", pincode: "", description: "" })
            fetchZones()
        }
    }

    return (
        <div className="container mx-auto py-6 max-w-5xl px-4 space-y-6 bg-[#FAFAFA] min-h-screen">
            {/* Header & Quick Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                        Logistics <ChevronRight className="w-4 h-4 text-slate-300" /> <span className="text-slate-500">Master Data</span>
                    </h1>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Filter by Pincode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* Compact Creator Bar */}
            <div className="bg-white border border-slate-200 p-2 rounded-2xl flex flex-wrap md:flex-nowrap gap-2 items-center shadow-sm">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 p-1">
                    <Input placeholder="Area Name" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs font-bold" />
                    <Input placeholder="Pincode" value={newZone.pincode} onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs font-bold" />
                    <Input placeholder="Description (Optional)" value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} className="h-9 border-none bg-slate-50 rounded-lg text-xs hidden md:block" />
                </div>
                <Button onClick={addZone} size="sm" className="rounded-xl px-4 bg-slate-900 h-9 font-bold text-[10px] uppercase tracking-widest">
                    <Plus className="w-4 h-4 mr-2" /> Add Zone
                </Button>
            </div>

            {/* List View */}
            <div className="space-y-3">
                {filteredZones.map((zone) => (
                    <ZoneCard key={zone.id} zone={zone} refresh={fetchZones} />
                ))}
            </div>
        </div>
    )
}

function ZoneCard({ zone, refresh }: { zone: any, refresh: () => void }) {
    const supabase = createClient()
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ name: zone.name, pincode: zone.pincode })

    async function handleUpdate() {
        await supabase.from('shipping_zones').update(editData).eq('id', zone.id)
        setIsEditing(false)
        refresh()
    }

    return (
        <Card className="border-slate-200 shadow-none rounded-2xl overflow-hidden bg-white">
            <div className="flex flex-col lg:flex-row">
                {/* Zone Info Column */}
                <div className="p-4 lg:w-1/3 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone Config</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"><Pencil className="w-3 h-3" /></button>
                            <button onClick={async () => { if (confirm("Delete zone?")) { await supabase.from('shipping_zones').delete().eq('id', zone.id); refresh(); } }} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-md transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                            <Input size={30} className="h-8 text-xs" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                            <Input size={30} className="h-8 text-xs" value={editData.pincode} onChange={(e) => setEditData({ ...editData, pincode: e.target.value })} />
                            <div className="flex gap-1 pt-1">
                                <Button size="sm" className="h-7 text-[9px] flex-1 bg-emerald-600" onClick={handleUpdate}>Update</Button>
                                <Button size="sm" variant="outline" className="h-7 text-[9px] flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 italic tracking-tight"><MapPin className="w-3 h-3 text-slate-400" />{zone.name}</h3>
                            <p className="text-[10px] font-mono text-slate-500 bg-white border px-2 py-0.5 rounded w-fit">Pincode: {zone.pincode}</p>
                        </div>
                    )}
                </div>

                {/* Methods Column */}
                <div className="p-4 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {zone.shipping_methods.map((m: any) => (
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
        await supabase.from('shipping_methods').update({ name: data.name, price: parseFloat(data.price), delivery_time_label: data.time }).eq('id', method.id)
        setIsEditing(false)
        refresh()
    }

    return (
        <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isEditing ? 'border-slate-900 bg-white ring-2 ring-slate-900/5' : 'bg-slate-50/30 border-slate-100 hover:border-slate-200'}`}>
            {isEditing ? (
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                    <Input className="h-7 text-[10px] w-20 px-1.5" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
                    <Input className="h-7 text-[10px] w-12 px-1.5" type="number" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
                    <Input className="h-7 text-[10px] flex-1 px-1.5" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
                    <button onClick={handleUpdate} className="text-emerald-500 p-1"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex items-center gap-3">
                        <p className="text-[11px] font-black text-slate-900 uppercase">{method.name}</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">₹{method.price}</span>
                        <div className="hidden sm:flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                            <Clock className="w-2.5 h-2.5" /> {method.delivery_time_label}
                        </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                        <button onClick={() => setIsEditing(true)} className="p-1 text-slate-300 hover:text-slate-900"><Pencil className="w-3 h-3" /></button>
                        <button onClick={async () => { if (confirm("Delete rate?")) { await supabase.from('shipping_methods').delete().eq('id', method.id); refresh(); } }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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
        if (!data.name || !data.price) return setOpen(false)
        await supabase.from('shipping_methods').insert([{ zone_id: zoneId, name: data.name, price: parseFloat(data.price), delivery_time_label: data.time || "3-5 Days" }])
        setData({ name: "", price: "", time: "" })
        setOpen(false)
        refresh()
    }

    if (!open) return (
        <button onClick={() => setOpen(true)} className="h-[42px] border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:bg-white hover:border-slate-300 transition-all">
            <Plus className="w-3 h-3" /> <span className="text-[10px] font-bold uppercase tracking-widest">Add Rate</span>
        </button>
    )

    return (
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl animate-in slide-in-from-right-2 duration-200">
            <Input autoFocus placeholder="Name" className="h-8 text-[10px] bg-white/10 border-none text-white w-16 px-1.5" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
            <Input placeholder="₹" type="number" className="h-8 text-[10px] bg-white/10 border-none text-white w-12 px-1.5" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
            <Input placeholder="ETA" className="h-8 text-[10px] bg-white/10 border-none text-white flex-1 px-1.5" value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })} />
            <button onClick={handleAdd} className="p-2 text-white"><Check className="w-4 h-4" /></button>
            <button onClick={() => setOpen(false)} className="p-2 text-white/50"><X className="w-4 h-4" /></button>
        </div>
    )
}