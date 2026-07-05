"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/store/use-cart"
import { Loader2, Home, Briefcase, MapPin, Navigation, Truck, ArrowRight, ArrowLeft, Check, User, Phone } from "lucide-react"
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
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="pl-12 h-14 rounded-2xl" />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" className="pl-12 h-14 rounded-2xl" />
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
                    <Button disabled={!fullName || !phone} onClick={() => setStep(2)} className="w-full h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest mt-4">
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* STEP 2: LOGISTICS & PINCODE */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                        <div className="relative">
                            <Navigation className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${pincodeLoading ? "text-blue-500 animate-spin" : "text-slate-400"}`} />
                            <Input
                                value={pincode}
                                onChange={e => handlePincodeChange(e.target.value)}
                                placeholder="6-Digit Pincode"
                                className="pl-12 h-14 rounded-2xl"
                            />
                        </div>

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
                        <Button disabled={!selectedMethodId || pincode.length !== 6 || shippingMethods.length === 0} onClick={() => setStep(3)} className="flex-1 h-14 bg-slate-900 rounded-2xl font-black uppercase tracking-widest">
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
        </div>
    )
}