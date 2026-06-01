

// "use client"

// import { useState } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Switch } from "@/components/ui/switch"
// import {
//     Loader2, Home, Briefcase, MapPin, User, Phone,
//     Navigation, Map, ArrowRight, ArrowLeft, Check, Globe
// } from "lucide-react"
// import { toast } from "sonner"

// interface AddressFormProps {
//     userId: string
//     initialData?: any
//     onSuccess?: (addr: any) => void
// }

// export function AddressForm({ userId, initialData, onSuccess }: AddressFormProps) {
//     const supabase = createClient()
//     const [step, setStep] = useState(1)
//     const [loading, setLoading] = useState(false)
//     const [pincodeLoading, setPincodeLoading] = useState(false)

//     // Form State
//     const [city, setCity] = useState(initialData?.city || "")
//     const [state, setState] = useState(initialData?.state || "")
//     const [label, setLabel] = useState(initialData?.label || "Home")
//     const [fullName, setFullName] = useState(initialData?.full_name || "")
//     const [phone, setPhone] = useState(initialData?.phone || "")
//     const [pincode, setPincode] = useState(initialData?.pincode || "")
//     const [street, setStreet] = useState(initialData?.street || "")
//     const [isDefault, setIsDefault] = useState(initialData?.is_default || false)

//     const labels = [
//         { id: 'Home', icon: Home },
//         { id: 'Office', icon: Briefcase },
//         { id: 'Other', icon: MapPin },
//     ]

//     const handlePincodeChange = async (val: string) => {
//         setPincode(val)
//         if (val.length === 6) {
//             setPincodeLoading(true)
//             try {
//                 const res = await fetch(`https://api.postalpincode.in/pincode/${val}`)
//                 const data = await res.json()
//                 if (data[0].Status === "Success") {
//                     const postOffice = data[0].PostOffice[0]
//                     setCity(postOffice.District)
//                     setState(postOffice.State)
//                 }
//             } catch (err) {
//                 console.error(err)
//             } finally {
//                 setPincodeLoading(false)
//             }
//         }
//     }

//     const handleSubmit = async () => {
//         setLoading(true)
//         try {
//             // FIX: If this address is being set as Primary, 
//             // we must unset any existing primary address for this user first.
//             if (isDefault) {
//                 await supabase
//                     .from("user_addresses")
//                     .update({ is_default: false })
//                     .eq("user_id", userId)
//                     .eq("is_default", true)
//             }

//             const payload = {
//                 user_id: userId,
//                 full_name: fullName,
//                 phone,
//                 street,
//                 city,
//                 state,
//                 label,
//                 pincode,
//                 is_default: isDefault
//             }

//             let result;
//             if (initialData?.id) {
//                 result = await supabase
//                     .from("user_addresses")
//                     .update(payload)
//                     .eq("id", initialData.id)
//                     .select()
//                     .single()
//             } else {
//                 result = await supabase
//                     .from("user_addresses")
//                     .insert([payload])
//                     .select()
//                     .single()
//             }

//             if (result.error) throw result.error

//             toast.success(isDefault ? "Primary Address Updated" : "Address Saved")
//             if (onSuccess) onSuccess(result.data)
//         } catch (error) {
//             console.error(error)
//             toast.error("Could not save address. Check your connection.")
//         } finally {
//             setLoading(false)
//         }
//     }

//     const isStep1Valid = fullName.length > 2 && phone.length >= 10
//     const isStep2Valid = pincode.length === 6 && street.length > 5

//     return (
//         <div className="relative w-full max-w-md mx-auto py-2">
//             {/* STEP INDICATOR */}
//             <div className="flex items-center justify-center gap-3 mb-8">
//                 {[1, 2, 3].map((i) => (
//                     <div
//                         key={i}
//                         className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? "w-8 bg-slate-900" : "w-2 bg-slate-100"
//                             }`}
//                     />
//                 ))}
//             </div>

//             <div className="min-h-[420px] flex flex-col justify-between">
//                 {/* STEP 1: IDENTITY & LABEL */}
//                 {step === 1 && (
//                     <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                         <header>
//                             <h3 className="text-xl font-black italic uppercase tracking-tighter">Identity</h3>
//                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Registry Details</p>
//                         </header>

//                         {/* LABEL SELECTOR */}
//                         <div className="grid grid-cols-3 gap-3">
//                             {labels.map((item) => (
//                                 <button
//                                     key={item.id}
//                                     type="button"
//                                     onClick={() => setLabel(item.id)}
//                                     className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${label === item.id
//                                         ? "border-slate-900 bg-slate-900 text-white shadow-lg"
//                                         : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
//                                         }`}
//                                 >
//                                     <item.icon className="w-4 h-4 mb-1.5" />
//                                     <span className="text-[9px] font-black uppercase tracking-widest">{item.id}</span>
//                                 </button>
//                             ))}
//                         </div>

//                         <div className="space-y-3">
//                             <div className="relative">
//                                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                                 <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-sm" />
//                             </div>
//                             <div className="relative">
//                                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                                 <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact Number" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-sm" />
//                             </div>
//                         </div>
//                         <Button disabled={!isStep1Valid} onClick={() => setStep(2)} className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] group">
//                             Address Info <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                         </Button>
//                     </div>
//                 )}

//                 {/* STEP 2: LOCATION */}
//                 {step === 2 && (
//                     <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                         <header>
//                             <h3 className="text-xl font-black italic uppercase tracking-tighter">Location</h3>
//                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Delivery destination</p>
//                         </header>
//                         <div className="space-y-3">
//                             <div className="relative">
//                                 <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                                 <Input value={pincode} onChange={(e) => handlePincodeChange(e.target.value)} placeholder="6-Digit Pincode" maxLength={6} className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 shadow-sm" />
//                                 {pincodeLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
//                             </div>
//                             <div className="relative">
//                                 <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                                 <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House, Building, Area" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 shadow-sm" />
//                             </div>
//                             <div className="flex gap-2 p-4 bg-slate-100/50 rounded-2xl border border-slate-100">
//                                 <Globe className="w-4 h-4 text-slate-400 mt-0.5" />
//                                 <div className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">
//                                     Detected: <span className="text-slate-900">{city || '...'}, {state || '...'}</span>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="flex gap-3">
//                             <Button variant="outline" onClick={() => setStep(1)} className="h-16 px-6 rounded-2xl border-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
//                             <Button disabled={!isStep2Valid} onClick={() => setStep(3)} className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em]">Review</Button>
//                         </div>
//                     </div>
//                 )}

//                 {/* STEP 3: REVIEW & PRIMARY TOGGLE */}
//                 {step === 3 && (
//                     <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
//                         <header>
//                             <h3 className="text-xl font-black italic uppercase tracking-tighter">Finalize</h3>
//                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Confirm Preferences</p>
//                         </header>

//                         <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 border border-slate-100 relative overflow-hidden">
//                             <div className="flex justify-between items-start relative z-10">
//                                 <div className="flex items-center gap-2">
//                                     {label === 'Home' && <Home className="w-3 h-3 text-slate-900" />}
//                                     {label === 'Office' && <Briefcase className="w-3 h-3 text-slate-900" />}
//                                     {label === 'Other' && <MapPin className="w-3 h-3 text-slate-900" />}
//                                     <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-xs font-black uppercase italic tracking-tighter text-slate-900">{fullName}</p>
//                                     <p className="text-[10px] font-bold text-slate-500">{phone}</p>
//                                 </div>
//                             </div>
//                             <p className="text-[11px] font-medium text-slate-600 leading-relaxed uppercase tracking-tight relative z-10">
//                                 {street}, {city}, {state} — {pincode}
//                             </p>
//                             <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
//                                 <MapPin className="w-24 h-24" />
//                             </div>
//                         </div>

//                         {/* PRIMARY DESTINATION TOGGLE */}
//                         <div
//                             className={`flex items-center justify-between p-5 border-2 rounded-2xl transition-all cursor-pointer group ${isDefault ? 'border-slate-900 bg-slate-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
//                                 }`}
//                             onClick={() => setIsDefault(!isDefault)}
//                         >
//                             <div className="flex items-center gap-3">
//                                 <div className={`p-2 rounded-lg transition-colors ${isDefault ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
//                                     <Check className="w-4 h-4" />
//                                 </div>
//                                 <div>
//                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Primary Destination</p>
//                                     <p className="text-[8px] font-bold text-slate-400 uppercase">Use as default for all orders</p>
//                                 </div>
//                             </div>
//                             <Switch checked={isDefault} onCheckedChange={setIsDefault} className="data-[state=checked]:bg-slate-900" />
//                         </div>

//                         <div className="flex gap-3 pt-2">
//                             <Button variant="outline" onClick={() => setStep(2)} className="h-16 px-6 rounded-2xl border-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
//                             <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-slate-200">
//                                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Registry"}
//                             </Button>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     )
// }
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
            const { data: zones } = await supabase
                .from("shipping_zones")
                .select("*, shipping_methods(*)")
                .eq("pincode", cleaned)

            if (zones && zones.length > 0) {
                setAreaName(zones[0].area_name || zones[0].name)
                setShippingMethods(zones[0].shipping_methods || [])
                // Auto-select first method if none selected
                if (!selectedMethodId && zones[0].shipping_methods?.length > 0) {
                    setSelectedMethodId(zones[0].shipping_methods[0].id)
                }
            } else {
                setAreaName('')
                setShippingMethods([])
                setSelectedMethodId(null)
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