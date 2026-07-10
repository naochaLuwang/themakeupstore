"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/store/use-cart"
import { Loader2, Home, Briefcase, MapPin, Navigation, Truck, ArrowRight, ArrowLeft, Check, User, Phone, X, Search } from "lucide-react"
import { toast } from "sonner"

export function AddressForm({
    userId,
    initialData,
    onSuccess
}: {
    userId: string,
    initialData?: any,
    onSuccess?: (addr: any) => void
}) {
    const supabase = createClient()
    const { setShippingMethod } = useCart()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [pincodeLoading, setPincodeLoading] = useState(false)

    // Form State
    const [fullName, setFullName] = useState(initialData?.full_name ?? "")
    const [phone, setPhone] = useState(initialData?.phone ?? "")
    const [pincode, setPincode] = useState(initialData?.pincode ?? "")
    const [street, setStreet] = useState(initialData?.street ?? "")
    const [areaName, setAreaName] = useState(initialData?.area_name ?? "")
    const [city, setCity] = useState(initialData?.city ?? "")
    const [state, setState] = useState(initialData?.state ?? "")
    const [label, setLabel] = useState(initialData?.label ?? "Home")

    // Shipping State
    const [shippingMethods, setShippingMethods] = useState<any[]>([])
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(initialData?.shipping_method_id ?? null)

    const [showPincodeList, setShowPincodeList] = useState(false)
    const [serviceablePincodes, setServiceablePincodes] = useState<any[]>([])
    const pincodesFetched = useRef(false)

    const openPincodeList = async () => {
        if (!pincodesFetched.current) {
            const { data } = await supabase
                .from("shipping_zones")
                .select("pincode, area_name, name")
                .order("pincode")
            if (data) setServiceablePincodes(data)
            pincodesFetched.current = true
        }
        setShowPincodeList(true)
    }

    const selectPincode = (code: string) => {
        setShowPincodeList(false)
        handlePincodeChange(code)
    }

    // Logic: If editing an address that already has a method, we can optionally lock it 
    // or allow re-selection. Here we allow re-selection but default to previous.
    const isLocked = !!initialData?.shipping_method_id

    // Auto-load methods if we have initial data (editing)
    useEffect(() => {
        if (initialData?.pincode) {
            handlePincodeChange(initialData.pincode)
        }
    }, [])

    const handlePincodeChange = async (val: string) => {
        const cleaned = val.replace(/\D/g, '').slice(0, 6)
        setPincode(cleaned)

        if (cleaned.length === 6) {
            setPincodeLoading(true)

            // Lookup shipping zones for delivery methods
            const { data: zones } = await supabase
                .from("shipping_zones")
                .select("*, shipping_methods(*)")
                .eq("pincode", cleaned)

            if (zones && zones.length > 0) {
                setAreaName(zones[0].area_name || zones[0].name)
                setShippingMethods(zones[0].shipping_methods || [])
                if (!selectedMethodId && zones[0].shipping_methods?.length > 0) {
                    setSelectedMethodId(zones[0].shipping_methods[0].id)
                }
            } else {
                setAreaName('')
                setShippingMethods([])
                setSelectedMethodId(null)
            }

            // Auto-fill city & state from India Post API
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`)
                const data = await res.json()
                if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
                    const po = data[0].PostOffice[0]
                    setCity(po.District)
                    setState(po.State)
                }
            } catch (err) {
                console.error("Pincode lookup failed:", err)
            }

            setPincodeLoading(false)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {
                user_id: userId,
                full_name: fullName,
                phone,
                street,
                city,
                state,
                pincode,
                area_name: areaName,
                label,
                shipping_method_id: selectedMethodId,
                is_default: initialData?.is_default ?? false
            }

            // Perform the operation and immediately join shipping_methods
            // This ensures the CheckoutClient receives the object it expects
            const query = initialData?.id
                ? supabase.from("user_addresses").update(payload).eq("id", initialData.id).eq("user_id", userId)
                : supabase.from("user_addresses").insert([payload])

            const { data, error } = await query
                .select(`
                    *,
                    shipping_methods:shipping_method_id (*)
                `)
                .single()

            if (error) throw error

            toast.success("Destination Saved Successfully")
            if (onSuccess) onSuccess(data)
        } catch (err) {
            toast.error("Error saving record")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* STEP 1: PERSONAL DETAILS */}
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-1">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name *" className="pl-12 h-14 rounded-2xl" />
                        </div>
                        {fullName.length > 0 && fullName.length < 2 && (
                            <p className="text-[11px] text-red-500 ml-1">Enter a valid name</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="relative flex items-center">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                <span className="text-sm font-medium text-slate-400">+91</span>
                                <span className="text-slate-200">|</span>
                            </div>
                            <Input
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Phone Number *"
                                className="pl-[5.5rem] h-14 rounded-2xl"
                                inputMode="numeric"
                            />
                        </div>
                        {phone.length > 0 && phone.length < 10 && (
                            <p className="text-[11px] text-red-500 ml-1">Enter a valid 10-digit number</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {['Home', 'Work', 'Other'].map((l) => (
                            <Button key={l} variant={label === l ? "default" : "outline"} onClick={() => setLabel(l)} className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black">
                                {l === 'Home' && <Home className="w-3 h-3 mr-2" />}
                                {l === 'Work' && <Briefcase className="w-3 h-3 mr-2" />}
                                {l}
                            </Button>
                        ))}
                    </div>
                    <Button disabled={!fullName || fullName.length < 2 || phone.length !== 10} onClick={() => setStep(2)} className="w-full h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest mt-4">
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* STEP 2: LOGISTICS & PINCODE */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                        {pincode ? (
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <Navigation className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <span className="text-sm font-bold text-slate-900">{pincode}</span>
                                        {city && <span className="text-xs text-slate-400 ml-2">— {city}, {state}</span>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={openPincodeList}
                                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 underline underline-offset-2"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={openPincodeList}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-slate-300 transition-all"
                            >
                                <Navigation className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-400">Select a serviceable pincode</span>
                            </button>
                        )}

                        {shippingMethods.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Delivery Speed</label>
                                <div className="grid gap-2">
                                    {shippingMethods.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMethodId(m.id)}
                                            className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${selectedMethodId === m.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {selectedMethodId === m.id && <Check className="w-3 h-3" />}
                                                <span className="text-[10px] font-black uppercase">{m.name}</span>
                                            </div>
                                            <span className="text-xs font-black italic">₹{m.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setStep(1)} className="h-14 w-14 rounded-2xl"><ArrowLeft className="w-4 h-4" /></Button>
                        <Button disabled={!selectedMethodId || !pincode || shippingMethods.length === 0} onClick={() => setStep(3)} className="flex-1 h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest">
                            Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: STREET ADDRESS */}
            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                        <textarea
                            value={street}
                            onChange={e => setStreet(e.target.value)}
                            placeholder="Street Address, House No, Landmark"
                            className="w-full min-h-[100px] pl-12 pt-4 pr-4 rounded-2xl border-2 border-slate-100 focus:border-slate-900 focus:outline-none text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="h-14 rounded-2xl" />
                        <Input value={state} onChange={e => setState(e.target.value)} placeholder="State" className="h-14 rounded-2xl" />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setStep(2)} className="h-14 w-14 rounded-2xl"><ArrowLeft className="w-4 h-4" /></Button>
                        <Button
                            disabled={loading || !street || !city}
                            onClick={handleSubmit}
                            className="flex-1 h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Save Destination"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Serviceable Pincodes Modal */}
            {showPincodeList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0">
                            <h3 className="text-sm font-black tracking-tight text-slate-900">Serviceable Pincodes</h3>
                            <button onClick={() => setShowPincodeList(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <PincodeList pincodes={serviceablePincodes} currentPincode={pincode} onSelect={selectPincode} />
                    </div>
                </div>
            )}
        </div>
    )
}

function PincodeList({ pincodes, currentPincode, onSelect }: { pincodes: any[]; currentPincode: string; onSelect: (code: string) => void }) {
    const [query, setQuery] = useState("")

    const filtered = query
        ? pincodes.filter(z => z.pincode.includes(query) || z.area_name?.toLowerCase().includes(query.toLowerCase()))
        : pincodes

    return (
        <div className="flex flex-col overflow-hidden">
            <div className="relative px-5 pt-4 pb-2">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search pincode or area..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
            </div>
            <div className="overflow-y-auto px-5 pb-5 pt-1 space-y-1">
                {filtered.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No matches found.</p>
                ) : (
                    filtered.map((z) => {
                        const isSelected = z.pincode === currentPincode
                        return (
                            <button
                                key={z.pincode}
                                type="button"
                                onClick={() => onSelect(z.pincode)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                    isSelected
                                        ? "border-slate-900 bg-slate-50"
                                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
                                    <span className={`text-sm font-bold truncate ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{z.name || z.pincode}</span>
                                </div>
                                <span className={`text-xs font-mono shrink-0 ml-2 ${isSelected ? "text-slate-500" : "text-slate-400"}`}>{z.pincode}</span>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}