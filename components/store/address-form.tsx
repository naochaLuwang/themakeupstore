"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch" // Ensure you have this shadcn component
import { Loader2, Home, Briefcase, MapPin, User, Phone, Navigation, Map, ArrowRight, ArrowLeft, Check, Globe } from "lucide-react"
import { toast } from "sonner"

interface AddressFormProps {
    userId: string
    initialData?: any
    onSuccess?: (addr: any) => void
}

export function AddressForm({ userId, initialData, onSuccess }: AddressFormProps) {
    const supabase = createClient()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [pincodeLoading, setPincodeLoading] = useState(false)

    // Form State
    const [city, setCity] = useState(initialData?.city || "")
    const [state, setState] = useState(initialData?.state || "")
    const [label, setLabel] = useState(initialData?.label || "Home")
    const [fullName, setFullName] = useState(initialData?.full_name || "")
    const [phone, setPhone] = useState(initialData?.phone || "")
    const [pincode, setPincode] = useState(initialData?.pincode || "")
    const [street, setStreet] = useState(initialData?.street || "")
    const [isDefault, setIsDefault] = useState(initialData?.is_default || false)

    const handlePincodeChange = async (val: string) => {
        setPincode(val)
        if (val.length === 6) {
            setPincodeLoading(true)
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`)
                const data = await res.json()
                if (data[0].Status === "Success") {
                    const postOffice = data[0].PostOffice[0]
                    setCity(postOffice.District)
                    setState(postOffice.State)
                }
            } catch (err) { console.error(err) } finally { setPincodeLoading(false) }
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        const payload = {
            user_id: userId,
            full_name: fullName,
            phone, street, city, state, label, pincode,
            is_default: isDefault
        }

        try {
            // If setting as default, we might need to unset others first depending on your DB triggers
            // But usually, a simple update/insert is handled by Supabase functions
            let result;
            if (initialData?.id) {
                result = await supabase.from("user_addresses").update(payload).eq("id", initialData.id).select().single()
            } else {
                result = await supabase.from("user_addresses").insert([payload]).select().single()
            }
            if (result.error) throw result.error
            toast.success(isDefault ? "Primary Address Updated" : "Address Saved")
            if (onSuccess) onSuccess(result.data)
        } catch (error) {
            toast.error("Process failed")
        } finally {
            setLoading(false)
        }
    }

    const isStep1Valid = fullName.length > 2 && phone.length >= 10
    const isStep2Valid = pincode.length === 6 && street.length > 5

    return (
        <div className="relative z-[9999] w-full max-w-md mx-auto py-2">
            {/* STEP INDICATOR */}
            <div className="flex items-center justify-center gap-3 mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? "w-8 bg-slate-900" : "w-2 bg-slate-100"
                        }`} />
                ))}
            </div>

            <div className="min-h-[380px] flex flex-col justify-between">
                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <header>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Identity</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Recipient details</p>
                        </header>
                        <div className="space-y-3">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-sm" />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact Number" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-sm" />
                            </div>
                        </div>
                        <Button disabled={!isStep1Valid} onClick={() => setStep(2)} className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] group">
                            Address Info <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                )}

                {/* STEP 2: LOCATION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <header>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Location</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Delivery destination</p>
                        </header>
                        <div className="space-y-3">
                            <div className="relative">
                                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input value={pincode} onChange={(e) => handlePincodeChange(e.target.value)} placeholder="6-Digit Pincode" maxLength={6} className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 shadow-sm" />
                                {pincodeLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                            </div>
                            <div className="relative">
                                <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House, Building, Area" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 shadow-sm" />
                            </div>
                            <div className="flex gap-2 p-4 bg-slate-100/50 rounded-2xl border border-slate-100">
                                <Globe className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">
                                    Detected: <span className="text-slate-900">{city || '...'}, {state || '...'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(1)} className="h-16 px-6 rounded-2xl border-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
                            <Button disabled={!isStep2Valid} onClick={() => setStep(3)} className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em]">Review</Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: REVIEW & DEFAULT TOGGLE */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <header>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Finalize</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Confirm and set preferences</p>
                        </header>

                        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 border border-slate-100">
                            <div className="flex justify-between items-start">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">{label}</span>
                                <div className="text-right">
                                    <p className="text-xs font-black uppercase italic tracking-tighter text-slate-900">{fullName}</p>
                                    <p className="text-[10px] font-bold text-slate-500">{phone}</p>
                                </div>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
                                {street}, {city}, {state} — {pincode}
                            </p>
                        </div>

                        {/* DEFAULT TOGGLE */}
                        <div className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-200 transition-all cursor-pointer group" onClick={() => setIsDefault(!isDefault)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${isDefault ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Check className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Set as Primary</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Make this your default destination</p>
                                </div>
                            </div>
                            <Switch checked={isDefault} onCheckedChange={setIsDefault} className="data-[state=checked]:bg-slate-900" />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setStep(2)} className="h-16 px-6 rounded-2xl border-slate-100"><ArrowLeft className="w-4 h-4" /></Button>
                            <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-slate-200">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registry"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}